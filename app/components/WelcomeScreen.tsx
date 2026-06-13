'use client';

const suggestions = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    text: 'Write a sorting algorithm',
    prompt: 'Buatkan kode Python untuk sorting algorithm dengan penjelasan',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
    text: 'Explain machine learning',
    prompt: 'Jelaskan cara kerja machine learning secara sederhana',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    text: 'REST API vs GraphQL',
    prompt: 'Apa perbedaan antara REST API dan GraphQL?',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    text: 'Brainstorm project ideas',
    prompt: 'Bantu saya brainstorm ide project untuk portfolio',
  },
];

interface WelcomeScreenProps {
  onSuggestionClick: (prompt: string) => void;
  modelName: string;
}

export default function WelcomeScreen({ onSuggestionClick, modelName }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 animate-fadeIn">
      {/* Glow */}
      <div className="absolute w-72 h-72 bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Agent Icon */}
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-600/15 border border-white/[0.06] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#agentGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="agentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
            <path d="M6 10a6 6 0 0 0 12 0" />
            <path d="M12 16v6" />
            <path d="M8 22h8" />
            <circle cx="12" cy="12" r="10" strokeDasharray="4 4" opacity="0.3" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950" />
      </div>

      <h2 className="text-xl font-semibold text-white mb-1.5">How can I help you?</h2>
      <p className="text-sm text-zinc-500 mb-2">Claude AI Agent &middot; Ready</p>
      <div className="flex items-center gap-1.5 mb-10">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-xs text-zinc-600 font-mono">{modelName}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s.prompt)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left text-sm text-zinc-400 hover:bg-white/[0.05] hover:border-violet-500/20 hover:text-zinc-200 transition-all duration-200 group cursor-pointer"
          >
            <span className="text-zinc-500 group-hover:text-violet-400 transition-colors">{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
