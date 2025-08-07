"use client";

import React, { useState } from 'react';

type APIProvider = 'demo' | 'openai' | 'gemini';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  timestamp: Date;
}

export default function Home() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [apiProvider, setApiProvider] = useState<APIProvider>('demo');
  const [messages, setMessages] = useState<Message[]>([]);

  async function askQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    
    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    // Set appropriate loading message based on provider
    if (apiProvider === 'openai') {
      setLoadingMessage('Setting up OpenAI and ingesting Shakespeare data...');
    } else if (apiProvider === 'gemini') {
      setLoadingMessage('Processing with Google Gemini...');
    } else {
      setLoadingMessage('Thinking...');
    }
    
    try {
      let endpoint = '/api/demo';
      
      switch (apiProvider) {
        case 'openai':
          endpoint = '/api/ask';
          break;
        case 'gemini':
          endpoint = '/api/ask-gemini';
          break;
        default:
          endpoint = '/api/demo';
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          provider: apiProvider,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorData = await res.json();
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${errorData.error}`,
          provider: apiProvider,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Error contacting backend.',
        provider: apiProvider,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
      setQuestion('');
    }
  }

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-semibold">Shakespeare AI</h1>
          <p className="text-sm text-gray-400 mt-1">Ask about the Bard&apos;s works</p>
        </div>
        
        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={clearChat}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Chat
          </button>
        </div>
        
        {/* Provider Selector */}
        <div className="p-4 border-b border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Provider
          </label>
          <select
            value={apiProvider}
            onChange={(e) => setApiProvider(e.target.value as APIProvider)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          >
            <option value="demo">Demo Mode</option>
            <option value="openai">OpenAI GPT-3.5</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm">
              <p>No messages yet</p>
              <p className="mt-2">Start a conversation about Shakespeare!</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">🎭</div>
                <h2 className="text-2xl font-semibold mb-2">Shakespeare AI</h2>
                <p className="text-gray-600 mb-4">Ask me anything about Shakespeare&apos;s works</p>
                <div className="text-sm text-gray-500">
                  <p>&quot;What is the famous quote from Hamlet?&quot;</p>
                  <p>&quot;Tell me about Romeo and Juliet&apos;s love story&quot;</p>
                  <p>&quot;What themes are present in Macbeth?&quot;</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.provider && message.role === 'assistant' && (
                      <div className="text-xs text-gray-500 mt-2">
                        Powered by {message.provider === 'gemini' ? 'Google Gemini' : 
                                   message.provider === 'openai' ? 'OpenAI GPT-3.5' : 'Demo Mode'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">{loadingMessage}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={askQuestion} className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-4">
              <div className="flex-1 relative">
                <textarea
                  className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Message Shakespeare AI..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '200px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      askQuestion(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-2xl transition-colors disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
