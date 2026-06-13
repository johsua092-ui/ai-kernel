'use client';

const suggestions = [
  { icon: '💡', text: 'Explain machine learning', prompt: 'Jelaskan cara kerja machine learning secara sederhana' },
  { icon: '🧑‍💻', text: 'Write sorting algorithm', prompt: 'Buatkan kode Python untuk sorting algorithm' },
  { icon: '📡', text: 'REST vs GraphQL', prompt: 'Apa perbedaan antara REST API dan GraphQL?' },
  { icon: '🚀', text: 'Portfolio project ideas', prompt: 'Bantu saya brainstorm ide project untuk portfolio' },
];

interface WelcomeScreenProps {
  onSuggestionClick: (prompt: string) => void;
}

export default function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 animate-fadeIn">
      {/* Glow */}
      <div className="absolute w-64 h-64 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center backdrop-blur-sm">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#welcomeGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
            <path d="M6 10a6 6 0 0 0 12 0" />
            <path d="M12 16v6" />
            <path d="M8 22h8" />
            <circle cx="12" cy="12" r="10" strokeDasharray="4 4" opacity="0.4" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-2">What can I help you with?</h2>
      <p className="text-sm text-zinc-500 mb-10">Powered by AI Kernel — fast, smart, and always ready.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s.prompt)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left text-sm text-zinc-300 hover:bg-white/[0.06] hover:border-violet-500/30 transition-all duration-200 group cursor-pointer"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">{s.icon}</span>
            <span className="group-hover:text-white transition-colors">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
