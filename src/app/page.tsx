"use client";

import React, { useState } from 'react';

type APIProvider = 'demo' | 'openai' | 'gemini';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiProvider, setApiProvider] = useState<APIProvider>('demo');
  const [history, setHistory] = useState<{ q: string; a: string; note?: string; provider?: string }[]>([]);

  async function askQuestion(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAnswer('');
    
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
        setAnswer(data.answer);
        setHistory((h) => [...h, { 
          q: question, 
          a: data.answer, 
          note: data.note,
          provider: apiProvider
        }]);
      } else {
        const errorData = await res.json();
        setAnswer(`Error: ${errorData.error}`);
      }
    } catch (err) {
      setAnswer('Error contacting backend.');
    } finally {
      setLoading(false);
      setQuestion('');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6">Shakespeare AI Q&A</h1>
      
      {/* API Provider Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Provider:
        </label>
        <select
          value={apiProvider}
          onChange={(e) => setApiProvider(e.target.value as APIProvider)}
          className="p-2 border rounded shadow"
          disabled={loading}
        >
          <option value="demo">Demo Mode (Offline)</option>
          <option value="openai">OpenAI GPT-3.5</option>
          <option value="gemini">Google Gemini</option>
        </select>
      </div>
      
      <form onSubmit={askQuestion} className="w-full max-w-xl flex gap-2 mb-6">
        <input
          className="flex-1 p-3 border rounded shadow"
          type="text"
          placeholder="Ask a question about Shakespeare..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          required
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          type="submit"
          disabled={loading || !question.trim()}
        >
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </form>
      
      <div className="w-full max-w-xl space-y-4">
        {history.map((item, idx) => (
          <div key={idx} className="bg-white p-4 rounded shadow">
            <div className="font-semibold text-gray-700 mb-1">Q: {item.q}</div>
            <div className="text-gray-900">A: {item.a}</div>
            {item.note && (
              <div className="text-sm text-blue-600 mt-2 italic">{item.note}</div>
            )}
            {item.provider && (
              <div className="text-xs text-gray-500 mt-1">Provider: {item.provider}</div>
            )}
          </div>
        ))}
        {answer && (
          <div className="bg-white p-4 rounded shadow border border-blue-200">
            <div className="font-semibold text-gray-700 mb-1">A:</div>
            <div className="text-gray-900">{answer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
