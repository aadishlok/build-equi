# Shakespeare AI - ChatGPT-Style Q&A System

A modern, ChatGPT-style interface for asking complex questions about Shakespeare's complete works. Built with Next.js, featuring multiple AI providers and automatic data ingestion.

## 🎭 Features

- **ChatGPT-Style UI**: Modern chat interface with dark sidebar and message bubbles
- **Multiple AI Providers**: OpenAI GPT-3.5, Google Gemini, and Demo Mode
- **Automatic Ingestion**: No manual setup required - data is ingested automatically
- **MIT OpenCourseWare Source**: High-quality Shakespeare complete works
- **RAG System**: Retrieval-Augmented Generation for accurate answers
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for GPT-3.5)
- Google Gemini API key (recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aadishlok/build-equi.git
   cd build-equi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up API keys** (create `.env.local`)
   ```bash
   # OpenAI (optional)
   OPENAI_API_KEY=your_openai_key_here
   
   # Google Gemini (recommended)
   GEMINI_API_KEY=your_gemini_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🎯 Usage

### AI Providers

1. **Demo Mode** (Recommended for testing)
   - Works immediately without API keys
   - Pre-loaded Shakespeare knowledge
   - Perfect for demonstrations

2. **Google Gemini** (Recommended for production)
   - High-quality responses
   - Comprehensive Shakespeare knowledge
   - Automatic data ingestion

3. **OpenAI GPT-3.5** (Advanced)
   - Full RAG system with vector embeddings
   - Automatic data ingestion on first use
   - Requires OpenAI API key

### Example Questions

- "What is the famous quote from Hamlet?"
- "Tell me about Romeo and Juliet's love story"
- "What themes are present in Macbeth?"
- "Who is the main character in Othello?"
- "What happens in the final scene of King Lear?"

## 🏗️ Technical Architecture

### Frontend
- **Next.js 14** with App Router
- **React** with TypeScript
- **Tailwind CSS** for styling
- **ChatGPT-style UI** with dark sidebar and message bubbles

### Backend
- **API Routes** for different AI providers
- **Automatic Data Ingestion** - no manual setup required
- **RAG System** with vector embeddings (OpenAI)
- **Keyword Search** with comprehensive text (Gemini)

### Data Sources
- **MIT OpenCourseWare**: Complete Shakespeare works
- **GitHub Repository**: Individual play files
- **Demo Mode**: Pre-loaded knowledge base

## 📡 API Endpoints

### Q&A Endpoints
- `POST /api/demo` - Demo mode (no API key required)
- `POST /api/ask-gemini` - Google Gemini (recommended)
- `POST /api/ask` - OpenAI GPT-3.5 with RAG

### Ingestion Endpoints
- `POST /api/ingest-mit` - MIT OpenCourseWare source
- `POST /api/ingest` - GitHub repository source
- `POST /api/ingest-gemini` - Legacy Gemini ingestion

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Project Structure
```
src/
├── app/
│   ├── api/         # API routes
│   ├── globals.css  # Global styles
│   ├── layout.tsx   # Root layout
│   └── page.tsx     # Main chat interface
├── components/      # React components
└── lib/            # Utility functions
```

## 🎨 UI Features

### ChatGPT-Style Interface
- **Dark Sidebar**: AI provider selection and chat history
- **Message Bubbles**: User (blue) and assistant (gray) messages
- **Typing Indicators**: Animated dots during processing
- **Auto-resizing Input**: Textarea that grows with content
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line

### Responsive Design
- **Desktop**: Full sidebar and chat area
- **Mobile**: Optimized for touch interaction
- **Accessibility**: Proper focus states and screen reader support

## 🔒 Security & Privacy

- **API Keys**: Stored securely in `.env.local` (not in repository)
- **Data Privacy**: No user data is stored or transmitted
- **Local Processing**: All data processing happens locally
- **Secure Headers**: Proper CORS and security headers

## 🐛 Troubleshooting

### Common Issues

1. **"OpenAI unavailable" message**
   - Try using Google Gemini instead
   - Check your OpenAI API key and quota
   - Demo mode always works

2. **"Data not found" error**
   - Data is automatically ingested on first use
   - Check console logs for ingestion progress
   - Try a different AI provider

3. **Font loading warnings**
   - These are harmless - fallback fonts are used
   - Application works perfectly without Google Fonts

4. **Slow first response**
   - First OpenAI request triggers automatic data ingestion
   - Subsequent requests are much faster
   - Use Gemini for immediate responses

### Performance Tips
- **Gemini**: Fastest responses, no setup required
- **Demo Mode**: Instant responses, works offline
- **OpenAI**: Best for complex analysis, requires ingestion

## 📊 Current Status

✅ **Complete Features**
- ChatGPT-style UI with dark theme
- Multiple AI providers (Demo, Gemini, OpenAI)
- Automatic data ingestion
- Responsive design
- Error handling and fallbacks

✅ **Working Providers**
- **Demo Mode**: ✅ Always works
- **Google Gemini**: ✅ Recommended
- **OpenAI GPT-3.5**: ✅ With automatic ingestion

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

---

**Built with ❤️ for Shakespeare enthusiasts and AI developers**
