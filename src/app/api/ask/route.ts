import { NextRequest, NextResponse } from 'next/server';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import * as cheerio from 'cheerio';

const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');
const COLLECTION_NAME = 'shakespeare';

// List of Shakespeare plays for automatic ingestion
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

let vectorStore: Chroma | null = null;
let embeddings: OpenAIEmbeddings | null = null;

async function fetchPlayText(playPath: string): Promise<string> {
  try {
    const url = `https://raw.githubusercontent.com/TheMITTech/shakespeare/master/${playPath}`;
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

async function autoIngestData(): Promise<{ store: Chroma; embeddings: OpenAIEmbeddings }> {
  console.log('Auto-ingesting Shakespeare data...');
  
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const allChunks: string[] = [];
    let totalPlays = 0;
    
    // Fetch a subset of plays for faster ingestion
    const corePlays = SHAKESPEARE_WORKS.slice(0, 10); // Start with 10 plays
    
    for (const work of corePlays) {
      console.log(`Auto-ingesting ${work.name}...`);
      const playText = await fetchPlayText(work.path);
      
      if (playText.length > 100) {
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
      throw new Error('Failed to ingest any Shakespeare data');
    }
    
    // Create embeddings and vector store
    console.log(`Creating embeddings for ${allChunks.length} chunks...`);
    embeddings = new OpenAIEmbeddings();
    vectorStore = await Chroma.fromTexts(
      allChunks, 
      allChunks, 
      embeddings, 
      { collectionName: COLLECTION_NAME }
    );
    
    console.log(`Auto-ingestion complete: ${totalPlays} plays, ${allChunks.length} chunks`);
    return { store: vectorStore, embeddings };
  } catch (error) {
    console.error('Auto-ingestion failed:', error);
    throw error;
  }
}

async function getVectorStore() {
  if (vectorStore && embeddings) return { store: vectorStore, embeddings };
  
  try {
    // Check if data directory exists and has content
    await fs.access(DATA_DIR);
    const files = await fs.readdir(DATA_DIR);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    
    if (txtFiles.length === 0) {
      // No data available, trigger auto-ingestion
      return await autoIngestData();
    }
    
    // Load existing data
    let allChunks: string[] = [];
    for (const file of txtFiles) {
      const text = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
      const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
      const chunks = await splitter.splitText(text);
      allChunks.push(...chunks);
    }
    
    if (allChunks.length === 0) {
      // Data exists but is empty, trigger auto-ingestion
      return await autoIngestData();
    }
    
    // Create embeddings and vector store from existing data
    embeddings = new OpenAIEmbeddings();
    vectorStore = await Chroma.fromTexts(allChunks, allChunks, embeddings, { collectionName: COLLECTION_NAME });
    return { store: vectorStore, embeddings };
  } catch (error) {
    // Directory doesn't exist or other error, trigger auto-ingestion
    return await autoIngestData();
  }
}

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question) {
    return NextResponse.json({ error: 'No question provided.' }, { status: 400 });
  }

  try {
    const { store, embeddings } = await getVectorStore();
    
    // 1. Embed the question and retrieve relevant chunks
    const questionEmbedding = await embeddings.embedQuery(question);
    const results = await store.similaritySearchVectorWithScore(questionEmbedding, 5);
    
    // 2. Extract document content from results
    const context = results.map(([doc, score]) => doc.pageContent).join('\n---\n');
    
    // 3. Call OpenAI LLM with context
    const llm = new ChatOpenAI({ 
      model: 'gpt-3.5-turbo', 
      temperature: 0.2 
    });
    
    const prompt = `You are a Shakespeare expert AI. Use the following context from Shakespeare's works to answer the question.

Context:
${context}

Question: ${question}

Answer as helpfully and accurately as possible, citing specific passages when relevant.`;

    const response = await llm.invoke([{ role: 'user', content: prompt }]);
    const answer = response.content;
    
    return NextResponse.json({ 
      answer,
      note: 'Data was automatically ingested for this response.'
    });
  } catch (err: any) {
    console.error('OpenAI RAG error:', err);
    
    // Fallback to demo mode if OpenAI fails
    try {
      const demoResponse = await fetch(`${req.nextUrl.origin}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      
      if (demoResponse.ok) {
        const demoData = await demoResponse.json();
        return NextResponse.json({ 
          answer: demoData.answer,
          note: 'OpenAI unavailable - using demo mode with pre-loaded Shakespeare knowledge.'
        });
      }
    } catch (demoError) {
      console.error('Demo fallback also failed:', demoError);
    }
    
    return NextResponse.json({ 
      error: 'Unable to process your question. Please try again or use a different AI provider.',
      note: 'The system attempted to auto-ingest data but encountered an error. Try using Gemini or Demo mode instead.'
    }, { status: 500 });
  }
} 