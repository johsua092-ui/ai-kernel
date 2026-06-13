'use client';

import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    const promise = signInWithPopup(auth, googleProvider);
    setIsLoading(true);
    setError(null);
    
    promise.then(() => {
      onLoginSuccess();
    }).catch((err: any) => {
      console.error("Login failed", err);
      setError(err.message || "Failed to login with Google.");
      setIsLoading(false);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 px-4 animate-fadeIn">
      {/* Glow */}
      <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Agent Icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/[0.06] flex items-center justify-center backdrop-blur-sm shadow-xl shadow-black/50">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#loginGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="loginGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
            <path d="M6 10a6 6 0 0 0 12 0" />
            <path d="M12 16v6" />
            <path d="M8 22h8" />
            <circle cx="12" cy="12" r="10" strokeDasharray="4 4" opacity="0.4" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-[3px] border-zinc-950 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>

      <div className="text-center mb-8 max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to AI Kernel</h1>
        <p className="text-sm text-zinc-400">
          Sign in with Google to access your intelligent agent and sync your chat history securely.
        </p>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="group relative flex items-center justify-center gap-3 w-full max-w-sm px-4 py-3.5 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
      >
        {isLoading ? (
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
      </button>

      {error && (
        <div className="mt-4 max-w-sm w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
