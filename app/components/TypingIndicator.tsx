'use client';

export default function TypingIndicator() {
  return (
    <div className="flex w-full gap-3 px-4 py-5 justify-start animate-fadeIn">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
          <path d="M6 10a6 6 0 0 0 12 0"/>
          <path d="M12 16v6"/>
          <path d="M8 22h8"/>
        </svg>
      </div>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-1.5">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
      </div>
    </div>
  );
}
