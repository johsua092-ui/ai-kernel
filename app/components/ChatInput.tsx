'use client';

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop: () => void;
}

export default function ChatInput({ onSend, isLoading, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      onStop();
      return;
    }
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-[#212121]">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-[#2f2f2f] border border-zinc-700/50 rounded-2xl px-4 py-3 focus-within:border-zinc-500 transition-colors shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Kernel..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-400 resize-none outline-none max-h-[200px] leading-relaxed py-0.5"
          />
          <button
            type="submit"
            disabled={!isLoading && !input.trim()}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isLoading
                ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                : input.trim()
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'bg-[#404040] text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </form>
        <p className="text-center text-xs text-zinc-500 mt-3">
          AI Kernel can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}
