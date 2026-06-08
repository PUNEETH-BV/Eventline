'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';

interface GeneralChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuggestionClick: (query: string) => void;
}

export default function GeneralChatPanel({ isOpen, onClose, onSuggestionClick }: GeneralChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Welcome message when opened the first time
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hi! I am the EventLine AI Assistant. Ask me anything about upcoming exams, tech events, sports tournaments, or how to search and plan schedules!',
        },
      ]);
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/general-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Chat request failed');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { label: '🔥 Trending Exams', query: 'What are the most popular upcoming exams?' },
    { label: '🏆 When is IPL 2026?', query: 'Tell me the schedule of IPL 2026' },
    { label: '📅 How to save events?', query: 'How do I add events to my device calendar?' },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-48 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Sliding Panel: Left on desktop, Bottom on mobile */}
      <div
        className={`fixed z-49 bg-[#0e0e0e] border-[#1f1f1f] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col
          inset-x-0 bottom-0 h-[80vh] rounded-t-3xl border-t
          md:inset-y-0 md:left-0 md:right-auto md:w-96 md:h-full md:rounded-none md:border-r md:border-t-0
          ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1f1f1f] flex justify-between items-center bg-[#070707]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-md font-bold text-white tracking-tight">EventLine Assistant</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-[#161616] p-1.5 rounded-full border border-[#2a2a2a] hover:border-red-500/20 hover:text-red-400 transition-all duration-200 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages list */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none"
        >
          {messages.map((msg, index) => (
            <div 
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] text-sm rounded-2xl p-3 leading-relaxed border
                  ${msg.role === 'user' 
                    ? 'bg-blue-600/90 text-white border-blue-500/30 rounded-br-none' 
                    : 'bg-[#161616] text-gray-200 border-[#262626] rounded-bl-none'}`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#161616] border border-[#262626] text-gray-400 rounded-2xl rounded-bl-none p-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Suggestion Chips */}
          {messages.length === 1 && !loading && (
            <div className="pt-2 space-y-2">
              <span className="text-xs text-gray-500 font-semibold block mb-1">Try asking:</span>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.query)}
                    className="text-left text-xs bg-[#121212] border border-[#222] text-gray-300 rounded-xl px-3 py-2 hover:border-blue-500/30 hover:bg-[#161616] transition-all cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="p-3 border-t border-[#1f1f1f] bg-[#070707] flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl border border-blue-500/35 flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
