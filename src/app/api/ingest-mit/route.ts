import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';

const MIT_SHAKESPEARE_URL = 'https://ocw.mit.edu/ans7870/6/6.006/s08/lecturenotes/files/t8.shakespeare.txt';
const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');

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
  } catch (error) {
    console.error('Error fetching MIT Shakespeare text:', error);
    throw new Error(`Failed to fetch Shakespeare text from MIT: ${error}`);
  }
}

function extractPlays(text: string): { [playName: string]: string } {
  const plays: { [playName: string]: string } = {};

  const playTitles = [
    'HAMLET', 'MACBETH', 'ROMEO AND JULIET', 'JULIUS CAESAR', 'OTHELLO', 'KING LEAR',
    'A MIDSUMMER NIGHT\'S DREAM', 'THE MERCHANT OF VENICE', 'THE TEMPEST', 'TWELFTH NIGHT',
    'AS YOU LIKE IT', 'MUCH ADO ABOUT NOTHING', 'THE TAMING OF THE SHREW', 'HENRY V',
    'RICHARD III', 'ANTONY AND CLEOPATRA', 'CORIOLANUS', 'TITUS ANDRONICUS', 'TIMON OF ATHENS',
    'TROILUS AND CRESSIDA', 'LOVE\'S LABOUR\'S LOST', 'ALL\'S WELL THAT ENDS WELL',
    'MEASURE FOR MEASURE', 'THE COMEDY OF ERRORS', 'THE TWO GENTLEMEN OF VERONA',
    'THE WINTER\'S TALE', 'CYMBELINE', 'PERICLES', 'THE TWO NOBLE KINSMEN',
    'HENRY IV, PART 1', 'HENRY IV, PART 2', 'HENRY VI, PART 1', 'HENRY VI, PART 2',
    'HENRY VI, PART 3', 'HENRY VIII', 'RICHARD II', 'KING JOHN'
  ];

  const sections = text.split(/\n\s*\n/);
  let currentPlay = '';
  let currentPlayText = '';

  for (const section of sections) {
    const upperSection = section.toUpperCase();
    let foundPlay = false;
    for (const title of playTitles) {
      if (upperSection.includes(title)) {
        if (currentPlay && currentPlayText.trim()) {
          plays[currentPlay] = currentPlayText.trim();
        }
        currentPlay = title;
        currentPlayText = section;
        foundPlay = true;
        break;
      }
    }
    if (!foundPlay && currentPlay) {
      currentPlayText += '\n\n' + section;
    }
  }
  if (currentPlay && currentPlayText.trim()) {
    plays[currentPlay] = currentPlayText.trim();
  }
  return plays;
}

export async function POST() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('Starting MIT Shakespeare ingestion...');
    const fullText = await fetchMITShakespeareText();
    const plays = extractPlays(fullText);
    console.log(`Extracted ${Object.keys(plays).length} plays from MIT source`);
    let totalChunks = 0;
    for (const [playName, playText] of Object.entries(plays)) {
      if (playText.length > 100) {
        const filename = playName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.txt';
        await fs.writeFile(path.join(DATA_DIR, filename), playText);
        const chunks = Math.ceil(playText.length / 1000);
        totalChunks += chunks;
        console.log(`Saved ${filename} (${playText.length} chars, ~${chunks} chunks)`);
      }
    }
    await fs.writeFile(path.join(DATA_DIR, 'complete_works.txt'), fullText);
    const indexData = {
      source: 'MIT OpenCourseWare',
      url: MIT_SHAKESPEARE_URL,
      totalPlays: Object.keys(plays).length,
      totalChunks,
      plays: Object.keys(plays),
      timestamp: new Date().toISOString(),
      note: 'Complete works from MIT OpenCourseWare - high quality source'
    };
    await fs.writeFile(path.join(DATA_DIR, 'index.json'), JSON.stringify(indexData, null, 2));
    console.log(`MIT ingestion complete! Processed ${Object.keys(plays).length} plays with ${totalChunks} total chunks.`);
    return NextResponse.json({
      message: 'Shakespeare data ingested successfully from MIT OpenCourseWare',
      source: 'MIT OpenCourseWare',
      plays: Object.keys(plays).length,
      chunks: totalChunks,
      note: 'High-quality complete works from MIT source. You can now use all Q&A endpoints with comprehensive Shakespeare knowledge.'
    });
  } catch (error: unknown) {
    console.error('MIT ingestion error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 