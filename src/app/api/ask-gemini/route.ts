import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');

async function getShakespeareData(): Promise<string> {
  try {
    // First try to read the complete works from MIT source
    const completeWorksPath = path.join(DATA_DIR, 'complete_works.txt');
    try {
      const completeWorks = await fs.readFile(completeWorksPath, 'utf8');
      if (completeWorks.length > 1000) {
        console.log('Using complete works from MIT source');
        return completeWorks;
      }
    } catch {
      // File doesn't exist, continue to individual files
    }

    // Fallback to individual play files
    const allTexts: string[] = [];
    const files = await fs.readdir(DATA_DIR);
    const txtFiles = files.filter(f => f.endsWith('.txt') && f !== 'complete_works.txt');
    
    for (const file of txtFiles) {
      try {
        const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
        allTexts.push(content);
      } catch (error) {
        console.log(`Could not read ${file}:`, error);
      }
    }
    
    return allTexts.join('\n\n');
  } catch (error) {
    console.error('Error reading Shakespeare data:', error);
    return '';
  }
}

function findRelevantPassages(text: string, question: string, maxLength: number = 8000): string {
  const keywords = question.toLowerCase().split(' ').filter(word => word.length > 2);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 50);
  
  const scoredSentences = sentences.map(sentence => {
    const lowerSentence = sentence.toLowerCase();
    const score = keywords.reduce((acc, keyword) => {
      return acc + (lowerSentence.includes(keyword) ? 1 : 0);
    }, 0);
    return { sentence: sentence.trim(), score };
  });
  
  scoredSentences.sort((a, b) => b.score - a.score);
  
  let result = '';
  for (const item of scoredSentences) {
    if (item.score > 0 && result.length + item.sentence.length < maxLength) {
      result += item.sentence + '. ';
    }
  }
  
  return result || text.substring(0, maxLength);
}

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question) {
    return NextResponse.json({ error: 'No question provided.' }, { status: 400 });
  }

  try {
    const shakespeareText = await getShakespeareData();
    
    if (!shakespeareText) {
      return NextResponse.json({ 
        error: 'No Shakespeare data available. Please run data ingestion first.',
        note: 'Try running: curl -X POST /api/ingest-mit'
      }, { status: 500 });
    }

    const relevantText = findRelevantPassages(shakespeareText, question);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a Shakespeare expert. Use the following passages from Shakespeare's complete works from MIT OpenCourseWare to answer the question.

Relevant passages:
${relevantText}

Question: ${question}

Please provide a detailed, accurate answer based on the passages above. If you can identify specific plays, characters, or scenes, please mention them.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    return NextResponse.json({ 
      answer,
      model: 'gemini-1.5-flash',
      source: 'Individual Plays',
      note: 'Using Google Gemini API with Individual Plays Shakespeare data.'
    });
  } catch (error: unknown) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process question with Gemini API.',
      note: 'Please try again or use a different AI provider.'
    }, { status: 500 });
  }
} 