'use client';

import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    const promise = signInWithPopup(auth, googleProvider);
    setIsLoadingGoogle(true);
    setError(null);
    
    promise.then(() => {
      onLoginSuccess();
    }).catch((err: any) => {
      console.error("Login failed", err);
      setError(err.message || "Failed to login with Google.");
      setIsLoadingGoogle(false);
    });
  };

  const handleGithubLogin = () => {
    const promise = signInWithPopup(auth, githubProvider);
    setIsLoadingGithub(true);
    setError(null);
    
    promise.then(() => {
      onLoginSuccess();
    }).catch((err: any) => {
      console.error("Login failed", err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email address but different sign-in credentials.');
      } else {
        setError(err.message || 'Failed to login with GitHub. Please try again.');
      }
      setIsLoadingGithub(false);
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
          Sign in to access your intelligent agent and sync your chat history securely.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoadingGoogle || isLoadingGithub}
          className="group relative flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
        >
          {isLoadingGoogle ? (
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
          <span>{isLoadingGoogle ? 'Connecting...' : 'Continue with Google'}</span>
        </button>

        <button
          onClick={handleGithubLogin}
          disabled={isLoadingGoogle || isLoadingGithub}
          className="group relative flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden border border-white/10"
        >
          {isLoadingGithub ? (
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          )}
          <span>{isLoadingGithub ? 'Connecting...' : 'Continue with GitHub'}</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 max-w-sm w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
