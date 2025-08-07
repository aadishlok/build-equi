import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = path.join(process.cwd(), 'shakespeare_data');

// Hardcoded Shakespeare knowledge for fallback
const SHAKESPEARE_KNOWLEDGE = {
  hamlet: {
    quotes: [
      "To be, or not to be, that is the question.",
      "The rest is silence.",
      "Something is rotten in the state of Denmark.",
      "The lady doth protest too much, methinks."
    ],
    themes: ["Death", "Revenge", "Madness", "Corruption", "Existentialism"],
    characters: ["Hamlet", "Ophelia", "Claudius", "Gertrude", "Polonius"]
  },
  macbeth: {
    quotes: [
      "Is this a dagger which I see before me?",
      "Out, damned spot! Out, I say!",
      "Fair is foul, and foul is fair.",
      "Double, double toil and trouble."
    ],
    themes: ["Ambition", "Power", "Guilt", "Fate", "Supernatural"],
    characters: ["Macbeth", "Lady Macbeth", "Banquo", "Duncan", "Macduff"]
  },
  "romeo and juliet": {
    quotes: [
      "But, soft! what light through yonder window breaks?",
      "Romeo, Romeo, wherefore art thou Romeo?",
      "A plague on both your houses!",
      "For never was a story of more woe than this of Juliet and her Romeo."
    ],
    themes: ["Love", "Fate", "Youth", "Family Conflict", "Death"],
    characters: ["Romeo", "Juliet", "Mercutio", "Tybalt", "Friar Lawrence"]
  },
  general: {
    quotes: [
      "All the world's a stage, and all the men and women merely players.",
      "The quality of mercy is not strained.",
      "Friends, Romans, countrymen, lend me your ears.",
      "What's in a name? That which we call a rose by any other name would smell as sweet."
    ],
    themes: ["Human Nature", "Power", "Love", "Revenge", "Fate"],
    works: ["37 plays", "154 sonnets", "Various poems"]
  }
};

async function getMITShakespeareData() {
  try {
    const completeWorksPath = path.join(DATA_DIR, 'complete_works.txt');
    const completeWorks = await fs.readFile(completeWorksPath, 'utf8');
    return completeWorks;
  } catch {
    return null;
  }
}

function findRelevantInfo(question: string): string {
  const questionLower = question.toLowerCase();
  
  // Check for specific plays
  if (questionLower.includes('hamlet')) {
    const info = SHAKESPEARE_KNOWLEDGE.hamlet;
    return `Hamlet - Key Quotes: ${info.quotes.join(' ')} Themes: ${info.themes.join(', ')} Characters: ${info.characters.join(', ')}`;
  }
  
  if (questionLower.includes('macbeth')) {
    const info = SHAKESPEARE_KNOWLEDGE.macbeth;
    return `Macbeth - Key Quotes: ${info.quotes.join(' ')} Themes: ${info.themes.join(', ')} Characters: ${info.characters.join(', ')}`;
  }
  
  if (questionLower.includes('romeo') || questionLower.includes('juliet')) {
    const info = SHAKESPEARE_KNOWLEDGE["romeo and juliet"];
    return `Romeo and Juliet - Key Quotes: ${info.quotes.join(' ')} Themes: ${info.themes.join(', ')} Characters: ${info.characters.join(', ')}`;
  }
  
  // General Shakespeare knowledge
  const info = SHAKESPEARE_KNOWLEDGE.general;
  return `Shakespeare's Works - Key Quotes: ${info.quotes.join(' ')} Themes: ${info.themes.join(', ')} Works: ${info.works.join(', ')}`;
}

function findRelevantPassages(question: string, completeWorks: string): string {
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
  
  const relevantText = relevantLines.join('\n');
  return relevantText.length > 1500 ? relevantText.substring(0, 1500) + '...' : relevantText;
}

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question) {
    return NextResponse.json({ error: 'No question provided.' }, { status: 400 });
  }

  try {
    // Try to get MIT Shakespeare data first
    const mitData = await getMITShakespeareData();
    
    if (mitData) {
      // Use MIT source for more comprehensive answers
      const relevantPassages = findRelevantPassages(question, mitData);
      
      const answer = `Based on Shakespeare's complete works from MIT OpenCourseWare:

${relevantPassages}

This response is based on the actual text of Shakespeare's works, providing authentic quotes and passages.`;

      return NextResponse.json({
        answer,
        source: 'MIT OpenCourseWare',
        note: 'Using MIT Shakespeare source for authentic responses.'
      });
    } else {
      // Fallback to hardcoded knowledge
      const relevantInfo = findRelevantInfo(question);
      
      const answer = `Based on Shakespeare's works, here's what I can tell you:

${relevantInfo}

This is a demo response using famous Shakespeare quotes and knowledge. For more detailed analysis of specific plays, the full RAG system would provide context from the complete works.`;

      return NextResponse.json({
        answer,
        source: 'Demo Knowledge',
        note: 'This is a demo response using famous Shakespeare quotes. For full functionality with the complete works, run the MIT ingestion process.'
      });
    }
  } catch (error) {
    console.error('Demo error:', error);
    return NextResponse.json({
      error: 'Failed to process question.',
      note: 'Please try again or run the MIT ingestion process for better results.'
    }, { status: 500 });
  }
} 