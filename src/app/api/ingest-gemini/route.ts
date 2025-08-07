import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');
const SHAKESPEARE_GITHUB_RAW = 'https://raw.githubusercontent.com/TheMITTech/shakespeare/master';

// Simplified list for Gemini ingestion
const SHAKESPEARE_WORKS = [
  { name: 'hamlet', path: 'hamlet/hamlet.html' },
  { name: 'macbeth', path: 'macbeth/macbeth.html' },
  { name: 'romeo_juliet', path: 'romeo_juliet/romeo_juliet.html' },
  { name: 'lear', path: 'lear/lear.html' },
  { name: 'othello', path: 'othello/othello.html' },
  { name: 'julius_caesar', path: 'julius_caesar/julius_caesar.html' },
  { name: 'merchant', path: 'merchant/merchant.html' },
  { name: 'midsummer', path: 'midsummer/midsummer.html' },
  { name: 'tempest', path: 'tempest/tempest.html' },
  { name: 'twelfth_night', path: 'twelfth_night/twelfth_night.html' }
];

async function fetchPlayText(playPath: string): Promise<string> {
  try {
    const url = `${SHAKESPEARE_GITHUB_RAW}/${playPath}`;
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    
    // Remove script and style elements
    $('script').remove();
    $('style').remove();
    
    // Extract text content, focusing on the main play content
    let text = $('body').text();
    
    // Clean up the text
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/\[.*?\]/g, ''); // Remove stage directions in brackets
    text = text.replace(/\n\s*\n/g, '\n'); // Remove extra newlines
    
    return text;
  } catch (error) {
    console.error(`Error fetching ${playPath}:`, error);
    return '';
  }
}

export async function POST() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const allPlays: string[] = [];
    let totalChunks = 0;
    
    for (const work of SHAKESPEARE_WORKS) {
      console.log(`Fetching ${work.name}...`);
      const playText = await fetchPlayText(work.path);
      
      if (playText.length > 100) {
        // Save individual play files
        await fs.writeFile(path.join(DATA_DIR, work.name + '.txt'), playText);
        allPlays.push(work.name);
        
        // Count chunks (rough estimate for display)
        const chunks = Math.ceil(playText.length / 1000);
        totalChunks += chunks;
      }
    }
    
    if (allPlays.length === 0) {
      return NextResponse.json({ error: 'No Shakespeare works were successfully fetched.' }, { status: 500 });
    }
    
    // Create a simple index file
    const indexData = {
      source: 'GitHub Repository',
      totalPlays: allPlays.length,
      totalChunks,
      plays: allPlays,
      timestamp: new Date().toISOString(),
      note: 'Simplified ingestion for Gemini - individual play files'
    };
    
    await fs.writeFile(path.join(DATA_DIR, 'index.json'), JSON.stringify(indexData, null, 2));
    
    return NextResponse.json({ 
      message: 'Gemini ingestion complete', 
      plays: allPlays.length,
      chunks: totalChunks,
      works: allPlays
    });
  } catch (error: unknown) {
    console.error('Gemini ingestion error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 