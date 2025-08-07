import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');

async function getShakespeareData() {
  try {
    // Check if data directory exists
    await fs.access(DATA_DIR);
    
    // First try to get the complete works from MIT source
    const completeWorksPath = path.join(DATA_DIR, 'complete_works.txt');
    try {
      const completeWorks = await fs.readFile(completeWorksPath, 'utf8');
      return { completeWorks, source: 'MIT OpenCourseWare' };
    } catch {
      // Fallback to individual play files
      const files = await fs.readdir(DATA_DIR);
      let allTexts: string[] = [];
      
      for (const file of files) {
        if (file.endsWith('.txt') && file !== 'index.json' && file !== 'complete_works.txt') {
          const text = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
          allTexts.push(text);
        }
      }
      
      if (allTexts.length === 0) {
        throw new Error('No Shakespeare data found. Please run MIT ingestion first.');
      }
      
      return { completeWorks: allTexts.join('\n\n---\n\n'), source: 'Individual Plays' };
    }
  } catch (error) {
    throw new Error('Shakespeare data not found. Please run the MIT ingestion process first by calling POST /api/ingest-mit');
  }
}

function findRelevantPassages(question: string, completeWorks: string): string {
  // Simple keyword matching to find relevant passages
  const keywords = question.toLowerCase().split(' ').filter(word => word.length > 3);
  const lines = completeWorks.split('\n');
  const relevantLines: string[] = [];
  
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (lineLower.includes(keyword)) {
        score++;
      }
    }
    
    if (score > 0 && line.trim().length > 20) {
      relevantLines.push(line.trim());
    }
  }
  
  // Return the most relevant passages (up to 2000 characters)
  const relevantText = relevantLines.join('\n');
  return relevantText.length > 2000 ? relevantText.substring(0, 2000) + '...' : relevantText;
}

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question) {
    return NextResponse.json({ error: 'No question provided.' }, { status: 400 });
  }

  try {
    const { completeWorks, source } = await getShakespeareData();
    const relevantPassages = findRelevantPassages(question, completeWorks);
    
    // Call Gemini LLM with context from MIT source
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `You are a Shakespeare expert AI with access to the complete works of William Shakespeare from MIT OpenCourseWare.

Question: ${question}

Relevant passages from Shakespeare's works:
${relevantPassages}

Please answer the question based on Shakespeare's actual works, citing specific passages and quotes when relevant. Be comprehensive and accurate in your analysis.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();
    
    return NextResponse.json({ 
      answer,
      model: 'gemini-1.5-flash',
      source: source,
      note: `Using Google Gemini API with ${source} Shakespeare data.`
    });
  } catch (err: any) {
    console.error('Gemini RAG error:', err);
    return NextResponse.json({ 
      error: err.message,
      note: 'If you see this error, it means the Shakespeare data needs to be ingested first. Run POST /api/ingest-mit to populate the database with MIT source.'
    }, { status: 500 });
  }
} 