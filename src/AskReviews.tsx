import React, { useState } from 'react';
import { Send, Sparkles, Star } from 'lucide-react';
import { api, RAGAnswer } from './api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  confidence?: 'high' | 'medium' | 'low';
  sources?: RAGAnswer['sources'];
  time: string;
}

const SAMPLE_PROMPTS = [
  'What can we do about slow service?',
  'How can we address cold food complaints?',
  'What do customers think about our pizza?',
  'What are customers complaining about the most?',
  'Why are negative reviews mentioning wait times?',
];

export function AskReviews({ restaurantId }: { restaurantId: string }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'assistant',
      content:
        'Hello! I am your Feedback Intelligence assistant. Ask me anything about your historical customer reviews or ask for actionable operational remedies grounded in customer feedback.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSubmit = async (qText?: string) => {
    const q = (qText || question).trim();
    if (!q || isLoading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: 'user',
      content: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsLoading(true);

    try {
      const res = await api.askReviews(restaurantId, q);
      const assistantMsg: Message = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        content: res.answer,
        confidence: res.confidence,
        sources: res.sources,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          sender: 'assistant',
          content: 'Sorry, I encountered an issue retrieving feedback. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] min-h-[560px] bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-neutral-950/70 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Ask Your Customer Reviews</h2>
            <p className="text-xs text-neutral-400">Grounded semantic search & operational recommendation assistant</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-neutral-500 font-mono mb-1 px-1">
              {msg.sender === 'user' ? 'You' : 'Assistant'} · {msg.time}
            </span>

            <div
              className={`max-w-2xl rounded-lg p-4 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-neutral-950 font-medium'
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-200'
              }`}
            >
              <p className="whitespace-pre-line text-[13px]">{msg.content}</p>

              {msg.confidence && (
                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                  <span>Confidence: <strong className={msg.confidence === 'high' ? 'text-emerald-400' : 'text-amber-400'}>{msg.confidence.toUpperCase()}</strong></span>
                  <span>{msg.sources?.length || 0} supporting reviews retrieved</span>
                </div>
              )}
            </div>

            {/* Supporting Customer Reviews */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2.5 max-w-2xl w-full space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block">
                  Supporting Customer Reviews ({msg.sources.length})
                </span>
                <div className="space-y-1.5">
                  {msg.sources.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span className="font-mono text-neutral-300">{s.rating}/5</span>
                          <span className="text-neutral-500">·</span>
                          <span className="capitalize text-neutral-400">{s.sentiment}</span>
                        </div>
                        <span className="text-neutral-500 font-mono">{new Date(s.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-neutral-300 italic">"{s.reviewText}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 p-3 bg-neutral-950 border border-neutral-800 rounded-lg max-w-sm">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
            <span>Searching reviews & formulating recommendation...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts */}
      <div className="p-2.5 bg-neutral-950/40 border-t border-neutral-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-neutral-500 shrink-0 font-medium text-[11px]">Quick Prompts:</span>
        {SAMPLE_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSubmit(p)}
            className="px-2.5 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white whitespace-nowrap transition-colors shrink-0 text-xs"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder="Ask a question about reviews (e.g. 'What can we do about slow service?')"
          className="flex-1 bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 px-3.5 py-2.5 rounded focus:outline-hidden focus:border-neutral-600 placeholder:text-neutral-500"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={!question.trim() || isLoading}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </div>
    </div>
  );
}
