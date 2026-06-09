'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TimelineEvent, ChatMessage } from '@/types';

interface DigDeeperChatProps {
  event: TimelineEvent;
  isActive: boolean;
  onBack: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isTyping: boolean;
}

export default function DigDeeperChat({
  event,
  isActive,
  onBack,
  chatHistory,
  onSendMessage,
  isTyping,
}: DigDeeperChatProps) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div
      className={`
        fixed z-50
        inset-x-0 bottom-0 h-[90vh] rounded-t-3xl border-t
        md:inset-y-0 md:right-0 md:left-auto md:w-full md:max-w-lg md:h-auto md:rounded-t-none md:border-t-0 md:border-l
        bg-[#0f0f0f] border-[#2a2a2a]
        transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        flex flex-col
        ${
          isActive
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
        }
      `}
    >
      {/* Header */}
      <div className="flex-none p-4 border-b border-[#2a2a2a]">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors mb-2 flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Back
        </button>
        <div className="flex flex-col">
          <p className="text-sm text-gray-400 font-semibold truncate">
            Exploring: <span className="text-white">{event.title}</span>
          </p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
            🗓️ {formattedDate} • AI-Powered Deep Dive
          </p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
        {chatHistory.filter(msg => !msg.content.includes("Tell me everything important about")).map((msg, index) => (
          <div
            key={index}
            className={`flex items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* AI Avatar */}
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center text-[8px] font-extrabold mr-2 shrink-0 shadow shadow-purple-500/20">
                AI
              </div>
            )}
            <div
              className={`
                max-w-[75%] px-4 py-3 text-xs leading-relaxed
                ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-none shadow shadow-blue-500/10'
                    : 'bg-[#1a1a1a] text-gray-200 rounded-2xl rounded-bl-none border border-[#222]'
                }
              `}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center text-[8px] font-extrabold mr-2 shrink-0 shadow shadow-purple-500/20">
              AI
            </div>
            <div className="bg-[#1a1a1a] border border-[#222] text-gray-400 rounded-2xl rounded-bl-none px-4 py-3 max-w-[75%] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Chip right above input */}
      <div className="px-4 py-2 border-t border-[#1f1f1f] bg-[#070707] flex justify-start">
        <button
          type="button"
          disabled={isTyping}
          onClick={() => onSendMessage("💡 What should I do right now?")}
          className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold py-1.5 px-3.5 rounded-full cursor-pointer flex items-center gap-1 transition-all disabled:opacity-50"
        >
          💡 What should I do right now?
        </button>
      </div>

      {/* Input area */}
      <div className="flex-none p-3 bg-[#070707]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            disabled={isTyping}
            className="flex-1 bg-[#1a1a1a] text-xs text-white rounded-xl px-4 py-3 border border-[#222] focus:border-blue-500/50 outline-none placeholder-gray-500 disabled:opacity-50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 rounded-xl p-2.5 text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
