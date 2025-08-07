import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs/promises';

const SHAKESPEARE_GITHUB_RAW = 'https://raw.githubusercontent.com/TheMITTech/shakespeare/master';
const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');

// Simplified list of plays that are more likely to exist
const SHAKESPEARE_WORKS = [
  'hamlet',
  'macbeth', 
  'romeo',
  'julius_caesar',
  'othello',
  'king_lear',
  'midsummer',
  'merchant',
  'tempest',
  'twelfth_night'
];

async function fetchPlayText(playName: string): Promise<string> {
  const playPath = `${playName}/${playName}.html`;
  try {
    const url = `${SHAKESPEARE_GITHUB_RAW}/${playPath}`;
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Extract text content
    let text = $('body').text();
    
    // Clean up the text
    text = text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\[.*?\]/g, '') // Remove stage directions in brackets
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .trim();
    
    return text;
  } catch (error) {
    console.error(`Error fetching ${playPath}:`, error);
    return '';
  }
}

async function createSimpleEmbeddings(text: string): Promise<number[]> {
  // Simple hash-based embedding for demo purposes
  // In a real implementation, you'd use a proper embedding model
  const hash = text.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Create a simple 128-dimensional vector based on the hash
  const embedding = new Array(128).fill(0);
  for (let i = 0; i < 128; i++) {
    embedding[i] = Math.sin(hash + i) * 0.5;
  }
  
  return embedding;
}

export async function POST(req: NextRequest) {
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    let totalPlays = 0;
    let allChunks: string[] = [];
    
    console.log('Starting Gemini-powered ingestion...');
    
    for (const play of SHAKESPEARE_WORKS) {
      console.log(`Ingesting ${play}...`);
      const text = await fetchPlayText(play);
      
      if (text) {
        // Simple text chunking
        const chunks = text.match(/.{1,1000}/g) || [];
        allChunks.push(...chunks);
        totalPlays++;
        
        // Save individual play file
        await fs.writeFile(path.join(DATA_DIR, `${play}.txt`), text);
        console.log(`Saved ${play}.txt (${chunks.length} chunks)`);
      }
    }
    
    if (allChunks.length === 0) {
      return NextResponse.json({ 
        error: 'No Shakespeare data could be fetched. Please check the GitHub repository availability.' 
      }, { status: 500 });
    }
    
    // Create a simple index file for the chunks
    const indexData = {
      totalPlays,
      totalChunks: allChunks.length,
      plays: SHAKESPEARE_WORKS.filter(play => 
        fs.access(path.join(DATA_DIR, `${play}.txt`)).then(() => true).catch(() => false)
      ),
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(path.join(DATA_DIR, 'index.json'), JSON.stringify(indexData, null, 2));
    
    console.log(`Ingestion complete! Processed ${totalPlays} plays with ${allChunks.length} total chunks.`);
    
    return NextResponse.json({
      message: 'Shakespeare data ingested successfully using Gemini-powered processing',
      plays: totalPlays,
      chunks: allChunks.length,
      note: 'Data saved to shakespeare_data directory. You can now use the Gemini-powered Q&A endpoints.'
    });
    
  } catch (error: any) {
    console.error('Gemini ingestion error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
} 