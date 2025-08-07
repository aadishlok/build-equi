# Shakespeare AI Q&A with RAG (Next.js)

A sophisticated AI-powered question-answering system for Shakespeare's complete works, built with Next.js and RAG (Retrieval-Augmented Generation).

## Features

- **Complete Shakespeare Corpus**: Ingests all works from [MIT OpenCourseWare](https://ocw.mit.edu/ans7870/6/6.006/s08/lecturenotes/files/t8.shakespeare.txt)
- **Advanced RAG Pipeline**: Uses OpenAI embeddings and ChromaDB for intelligent retrieval
- **Multiple AI Providers**: Support for OpenAI and Google Gemini
- **Modern UI**: Clean, responsive interface with chat-style Q&A
- **Local Vector Database**: Fast, private retrieval using ChromaDB
- **Context-Aware Answers**: AI responses based on relevant Shakespeare passages
- **Demo Mode**: Works immediately without requiring full ingestion

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd build-equi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up API keys** (optional for full functionality)
   - Create a file called `.env.local` in the root directory
   - Add the following lines:
     ```
     # OpenAI (for embeddings and GPT-3.5)
     OPENAI_API_KEY=your-openai-key-here
     
     # Google Gemini (alternative to OpenAI) - WORKING!
     GEMINI_API_KEY=your-gemini-key-here
     ```
   - (Do NOT commit your API keys to version control)

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Visit the application**
   - Open [http://localhost:3000](http://localhost:3000) in your browser
   - Select your preferred AI provider from the dropdown
   - Ask questions about Shakespeare's works!

## Usage

### Demo Mode (Works Immediately) ✅
The application includes a demo mode that works without any setup:
- Ask questions about Hamlet, Macbeth, Romeo & Juliet, and general Shakespeare themes
- Get instant responses with famous quotes and character information
- No API key or ingestion required

### Gemini Mode (Recommended) ✅
**Google Gemini API is now working and recommended!**
- High-quality responses with good availability
- No quota issues like OpenAI
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Full RAG Mode (Requires Setup)
For complete functionality with all Shakespeare works:

1. **Ensure you have at least one valid API key** in `.env.local`
2. **Ingest Shakespeare's works**:
   ```bash
   # For MIT source (recommended - high quality)
   curl -X POST http://localhost:3000/api/ingest-mit
   
   # For Gemini (alternative)
   curl -X POST http://localhost:3000/api/ingest-gemini
   
   # For OpenAI (may have quota issues)
   curl -X POST http://localhost:3000/api/ingest
   ```
3. **Select your preferred AI provider** from the dropdown
4. **Ask questions** - the system will use the full RAG pipeline

## AI Provider Options

### Demo Mode (Offline) ✅
- **Pros**: Works immediately, no API key required
- **Cons**: Limited to predefined responses
- **Best for**: Quick testing and demonstration

### Google Gemini ✅ **RECOMMENDED**
- **Pros**: High quality responses, good availability, no quota issues
- **Cons**: Requires API key
- **Setup**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Status**: ✅ Working and tested

### OpenAI GPT-3.5 ⚠️
- **Pros**: High quality responses, widely used
- **Cons**: Can have quota limits, requires API key
- **Setup**: Get API key from [OpenAI Platform](https://platform.openai.com/)
- **Status**: ⚠️ May have quota issues

## Example Questions

- "What does Hamlet say about death?"
- "Tell me about the relationship between Romeo and Juliet"
- "What are the main themes in Macbeth?"
- "What does 'To be or not to be' mean in context?"
- "Describe the character of Lady Macbeth"

## Technical Architecture

### Data Pipeline
- **Source**: [MIT OpenCourseWare Shakespeare](https://ocw.mit.edu/ans7870/6/6.006/s08/lecturenotes/files/t8.shakespeare.txt)
- **Ingestion**: Automated processing of complete works
- **Processing**: Text chunking with 1000-character chunks and 200-character overlap
- **Storage**: Local ChromaDB vector database

### RAG System
- **Embeddings**: OpenAI text-embedding-ada-002
- **Vector Store**: ChromaDB with similarity search
- **LLM Options**: OpenAI GPT-3.5, Google Gemini
- **Retrieval**: Top 5 most relevant chunks per question

### Frontend
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **State Management**: React hooks for local state
- **API**: RESTful endpoints for ingestion and Q&A

## Design Tradeoffs

- **MIT OpenCourseWare Source**: High-quality, complete works from reputable source
- **Multiple AI Providers**: Redundancy and choice for users
- **Google Gemini**: Recommended for best availability and performance
- **Local Vector DB**: ChromaDB for privacy and fast retrieval
- **Simple UI**: Focused on usability over complex features
- **Demo Mode**: Ensures immediate functionality without setup
- **In-Memory Storage**: Fast but requires re-ingestion on server restart

## API Endpoints

- `POST /api/ingest-mit`: Ingests Shakespeare's works from MIT OpenCourseWare (recommended)
- `POST /api/ingest`: Ingests Shakespeare's works using OpenAI (may have quota issues)
- `POST /api/ingest-gemini`: Ingests Shakespeare's works using Gemini (alternative)
- `POST /api/ask`: Answers questions using OpenAI GPT-3.5 (requires ingestion)
- `POST /api/ask-gemini`: Answers questions using Google Gemini (requires ingestion) ✅
- `POST /api/demo`: Provides demo responses using famous quotes (works immediately) ✅

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

- **Demo Mode**: Works immediately without any setup ✅
- **Gemini API**: Working and recommended for best experience ✅
- **API Key Issues**: If you get quota errors, try Gemini or use demo mode
- **Ingestion Issues**: Check your API keys and internet connection
- **No Answers**: Ensure ingestion completed successfully for full RAG mode
- **Slow Responses**: First query may be slow due to vector store initialization

## Current Status

✅ **Working Features:**
- Demo mode with instant responses
- Google Gemini API integration (recommended)
- MIT OpenCourseWare Shakespeare source
- Multiple AI provider support
- Modern UI with chat interface
- Support for all Shakespeare works
- Fallback system for API issues

⚠️ **Known Issues:**
- OpenAI API quota exceeded (use Gemini instead)
- Full RAG requires valid API key for ingestion

## Quick Start with MIT Source

1. **Get a Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Add to `.env.local`**:
   ```
   GEMINI_API_KEY=your-gemini-key-here
   ```
3. **Start the app**: `npm run dev`
4. **Ingest MIT data**: `curl -X POST http://localhost:3000/api/ingest-mit`
5. **Visit**: http://localhost:3000
6. **Select "Google Gemini"** from the dropdown
7. **Ask questions** about Shakespeare!

## Future Enhancements

- [ ] Persistent vector store across server restarts
- [ ] Better text preprocessing for improved retrieval
- [ ] Support for poetry and sonnets
- [ ] Advanced filtering by play/character/theme
- [ ] Export conversation history
- [ ] Mobile-optimized interface
- [ ] More AI provider integrations
