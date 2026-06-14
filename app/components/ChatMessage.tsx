'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content || message.content.trim() === '';

  return (
    <div className={`flex w-full gap-4 px-4 py-6 ${isUser ? '' : 'bg-transparent'}`}>
      <div className="flex-shrink-0">
        {!isUser ? (
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
               <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
               <circle cx="12" cy="7" r="4" />
             </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm mb-1 text-zinc-300">
          {isUser ? 'You' : 'AI Kernel'}
        </div>
        
        {/* If assistant is still loading (content empty), show loading dots */}
        {!isUser && isEmpty ? (
          <div className="flex items-center gap-1.5 h-5 mt-2">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]"></span>
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]"></span>
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]"></span>
          </div>
        ) : (
          <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words prose prose-invert max-w-none ${
            isUser ? 'text-zinc-200' : 'text-zinc-300'
          }`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ChatMessage);
