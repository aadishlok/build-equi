import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import path from 'path';
import fs from 'fs/promises';

// Use the GitHub repository structure for better data quality
const SHAKESPEARE_GITHUB_RAW = 'https://raw.githubusercontent.com/TheMITTech/shakespeare/master';
const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');

// List of Shakespeare plays and their file paths
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
  { name: 'twelfth_night', path: 'twelfth_night/twelfth_night.html' },
  { name: 'much_ado', path: 'much_ado/much_ado.html' },
  { name: 'asyoulikeit', path: 'asyoulikeit/asyoulikeit.html' },
  { name: 'taming_shrew', path: 'taming_shrew/taming_shrew.html' },
  { name: 'merry_wives', path: 'merry_wives/merry_wives.html' },
  { name: 'comedy_errors', path: 'comedy_errors/comedy_errors.html' },
  { name: 'two_gentlemen', path: 'two_gentlemen/two_gentlemen.html' },
  { name: 'measure', path: 'measure/measure.html' },
  { name: 'allswell', path: 'allswell/allswell.html' },
  { name: 'cymbeline', path: 'cymbeline/cymbeline.html' },
  { name: 'pericles', path: 'pericles/pericles.html' },
  { name: 'winters_tale', path: 'winters_tale/winters_tale.html' },
  { name: 'henryv', path: 'henryv/henryv.html' },
  { name: 'henryviii', path: 'henryviii/henryviii.html' },
  { name: 'richardii', path: 'richardii/richardii.html' },
  { name: 'richardiii', path: 'richardiii/richardiii.html' },
  { name: 'john', path: 'john/john.html' },
  { name: '1henryiv', path: '1henryiv/1henryiv.html' },
  { name: '2henryiv', path: '2henryiv/2henryiv.html' },
  { name: '1henryvi', path: '1henryvi/1henryvi.html' },
  { name: '2henryvi', path: '2henryvi/2henryvi.html' },
  { name: '3henryvi', path: '3henryvi/3henryvi.html' },
  { name: 'cleopatra', path: 'cleopatra/cleopatra.html' },
  { name: 'coriolanus', path: 'coriolanus/coriolanus.html' },
  { name: 'titus', path: 'titus/titus.html' },
  { name: 'timon', path: 'timon/timon.html' },
  { name: 'troilus_cressida', path: 'troilus_cressida/troilus_cressida.html' },
  { name: 'lll', path: 'lll/lll.html' }
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
    const allChunks: string[] = [];
    let totalPlays = 0;
    
    for (const work of SHAKESPEARE_WORKS) {
      console.log(`Ingesting ${work.name}...`);
      const playText = await fetchPlayText(work.path);
      
      if (playText.length > 100) { // Only process if we got meaningful content
        // Save raw text for reference
        await fs.writeFile(path.join(DATA_DIR, work.name + '.txt'), playText);
        
        // Chunk text
        const splitter = new RecursiveCharacterTextSplitter({ 
          chunkSize: 1000, 
          chunkOverlap: 200 
        });
        const chunks = await splitter.splitText(playText);
        allChunks.push(...chunks);
        totalPlays++;
      }
    }
    
    if (allChunks.length === 0) {
      return NextResponse.json({ error: 'No Shakespeare works were successfully ingested.' }, { status: 500 });
    }
    
    // Embed and store in Chroma
    console.log(`Creating embeddings for ${allChunks.length} chunks...`);
    const embeddings = new OpenAIEmbeddings();
    await Chroma.fromTexts(
      allChunks, 
      allChunks, 
      embeddings, 
      { collectionName: 'shakespeare' }
    );
    
    return NextResponse.json({ 
      message: 'Ingestion complete', 
      chunks: allChunks.length,
      plays: totalPlays,
      works: SHAKESPEARE_WORKS.map(w => w.name)
    });
  } catch (error: unknown) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 