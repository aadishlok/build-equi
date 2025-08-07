import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');
const MIT_SHAKESPEARE_URL = 'https://ocw.mit.edu/ans7870/6/6.006/s08/lecturenotes/files/t8.shakespeare.txt';

async function fetchMITShakespeareText(): Promise<string> {
  try {
    console.log('Fetching Shakespeare text from MIT OpenCourseWare...');
    const response = await axios.get(MIT_SHAKESPEARE_URL);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch from MIT: ${response.status}`);
    }

    let text = response.data;

    // Clean up the text - remove Project Gutenberg headers and metadata
    const startMarkers = [
      'THE COMPLETE WORKS OF WILLIAM SHAKESPEARE',
      'THE SONNETS',
      'VENUS AND ADONIS',
      'THE RAPE OF LUCRECE',
      'THE PHOENIX AND THE TURTLE',
      'A LOVER\'S COMPLAINT'
    ];

    let startIndex = -1;
    for (const marker of startMarkers) {
      const index = text.indexOf(marker);
      if (index !== -1) {
        startIndex = index;
        break;
      }
    }

    if (startIndex === -1) {
      const playMarkers = ['HAMLET', 'MACBETH', 'ROMEO AND JULIET', 'JULIUS CAESAR'];
      for (const marker of playMarkers) {
        const index = text.indexOf(marker);
        if (index !== -1) {
          startIndex = index;
          break;
        }
      }
    }

    if (startIndex !== -1) {
      text = text.substring(startIndex);
    }

    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/<<.*?>>/g, '')
      .replace(/THIS ELECTRONIC VERSION.*?PERMISSION\./g, '')
      .trim();

    console.log(`Successfully fetched ${text.length} characters of Shakespeare text`);
    return text;
  } catch {
    console.error('Error fetching MIT Shakespeare text');
    throw new Error('Failed to fetch Shakespeare text from MIT');
  }
}

async function autoIngestMITData(): Promise<string> {
  console.log('Auto-ingesting Shakespeare data from MIT source for Gemini...');
  
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Fetch MIT Shakespeare text
    const fullText = await fetchMITShakespeareText();
    
    // Save the complete works
    await fs.writeFile(path.join(DATA_DIR, 'complete_works.txt'), fullText);
    
    // Create index file for reference
    const indexData = {
      source: 'MIT OpenCourseWare',
      url: MIT_SHAKESPEARE_URL,
      timestamp: new Date().toISOString(),
      textLength: fullText.length,
      note: 'Auto-ingested for Gemini API'
    };
    
    await fs.writeFile(path.join(DATA_DIR, 'gemini_index.json'), JSON.stringify(indexData, null, 2));
    
    console.log(`Auto-ingestion complete: ${fullText.length} characters from MIT source`);
    return fullText;
  } catch {
    console.error('Auto-ingestion failed');
    throw new Error('Auto-ingestion failed');
  }
}

async function getShakespeareData(): Promise<string> {
  try {
    // First try to read the complete works from MIT source
    const completeWorksPath = path.join(DATA_DIR, 'complete_works.txt');
    try {
      const completeWorks = await fs.readFile(completeWorksPath, 'utf8');
      if (completeWorks.length > 1000) {
        console.log('Using existing complete works from MIT source');
        return completeWorks;
      }
    } catch {
      // File doesn't exist, continue to auto-ingestion
    }

    // Auto-ingest if no data available
    console.log('No Shakespeare data found, triggering auto-ingestion...');
    return await autoIngestMITData();

  } catch (error) {
    console.error('Error getting Shakespeare data:', error);
    // Last fallback - try individual files
    try {
      const files = await fs.readdir(DATA_DIR);
      const txtFiles = files.filter(f => f.endsWith('.txt') && f !== 'complete_works.txt');
      
      const allTexts: string[] = [];
      for (const file of txtFiles) {
        try {
          const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
          allTexts.push(content);
        } catch (error) {
          console.log(`Could not read ${file}:`, error);
        }
      }
      
      if (allTexts.length > 0) {
        return allTexts.join('\n\n');
      }
    } catch {
      // Directory doesn't exist or other error
    }
    
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
        error: 'Failed to load Shakespeare data. Please try again.',
        note: 'Auto-ingestion failed. You may want to check your internet connection.'
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
      source: 'MIT OpenCourseWare',
      note: 'Using Google Gemini API with MIT OpenCourseWare Shakespeare data.'
    });
  } catch (error: unknown) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process question with Gemini API.',
      note: 'Please try again or use a different AI provider.'
    }, { status: 500 });
  }
} 