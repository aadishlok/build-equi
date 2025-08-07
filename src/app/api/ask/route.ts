import { NextRequest, NextResponse } from 'next/server';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';

const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');
const COLLECTION_NAME = 'shakespeare';
const MIT_SHAKESPEARE_URL = 'https://ocw.mit.edu/ans7870/6/6.006/s08/lecturenotes/files/t8.shakespeare.txt';

let vectorStore: Chroma | null = null;
let embeddings: OpenAIEmbeddings | null = null;

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

async function autoIngestData(): Promise<{ store: Chroma; embeddings: OpenAIEmbeddings }> {
  console.log('Auto-ingesting Shakespeare data from MIT source...');
  
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Fetch MIT Shakespeare text
    const fullText = await fetchMITShakespeareText();
    
    // Save the complete works
    await fs.writeFile(path.join(DATA_DIR, 'complete_works.txt'), fullText);
    
    // Chunk the text
    const splitter = new RecursiveCharacterTextSplitter({ 
      chunkSize: 1000, 
      chunkOverlap: 200 
    });
    const chunks = await splitter.splitText(fullText);
    
    if (chunks.length === 0) {
      throw new Error('Failed to create chunks from Shakespeare data');
    }
    
    // Create embeddings and vector store
    console.log(`Creating embeddings for ${chunks.length} chunks...`);
    embeddings = new OpenAIEmbeddings();
    vectorStore = await Chroma.fromTexts(
      chunks, 
      chunks, 
      embeddings, 
      { collectionName: COLLECTION_NAME }
    );
    
    console.log(`Auto-ingestion complete: ${chunks.length} chunks from MIT source`);
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
    const allChunks: string[] = [];
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
      note: 'Powered by OpenAI with MIT OpenCourseWare Shakespeare data.'
    });
  } catch (error: unknown) {
    console.error('OpenAI RAG error:', error);
    
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
      note: 'Try using Google Gemini or Demo mode for immediate responses.'
    }, { status: 500 });
  }
} 