import { NextRequest, NextResponse } from 'next/server';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');
const COLLECTION_NAME = 'shakespeare';

let vectorStore: Chroma | null = null;
let embeddings: OpenAIEmbeddings | null = null;

async function getVectorStore() {
  if (vectorStore && embeddings) return { store: vectorStore, embeddings };
  
  try {
    // Check if data directory exists
    await fs.access(DATA_DIR);
    
    // Load all Shakespeare chunks from disk
    const files = await fs.readdir(DATA_DIR);
    let allChunks: string[] = [];
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const text = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const chunks = await splitter.splitText(text);
        allChunks.push(...chunks);
      }
    }
    
    if (allChunks.length === 0) {
      throw new Error('No Shakespeare data found. Please run ingestion first.');
    }
    
    // Create embeddings and vector store
    embeddings = new OpenAIEmbeddings();
    vectorStore = await Chroma.fromTexts(allChunks, allChunks, embeddings, { collectionName: COLLECTION_NAME });
    return { store: vectorStore, embeddings };
  } catch (error) {
    // If no data is available, provide a helpful error message
    throw new Error('Shakespeare data not found. Please run the ingestion process first by calling POST /api/ingest');
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
    
    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error('RAG error:', err);
    return NextResponse.json({ 
      error: err.message,
      note: 'If you see this error, it means the Shakespeare data needs to be ingested first. Run POST /api/ingest to populate the database.'
    }, { status: 500 });
  }
} 