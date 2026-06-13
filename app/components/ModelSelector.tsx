'use client';

import { useState, useRef, useEffect } from 'react';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export const MODELS: ModelOption[] = [
  { id: 'claude-opus-4-8', name: 'Opus 4.8', description: 'Most capable' },
  { id: 'claude-opus-4-7', name: 'Opus 4.7', description: 'Balanced' },
  { id: 'claude-opus-4-6', name: 'Opus 4.6', description: 'Fast' },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-zinc-300 hover:bg-white/[0.08] hover:border-violet-500/30 transition-all cursor-pointer"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="font-medium">{currentModel.name}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fadeIn">
          <div className="p-1.5">
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                  model.id === selectedModel
                    ? 'bg-violet-500/10 border border-violet-500/20'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  model.id === selectedModel ? 'bg-violet-400' : 'bg-zinc-600'
                }`} />
                <div>
                  <div className={`text-sm font-medium ${
                    model.id === selectedModel ? 'text-violet-300' : 'text-zinc-300'
                  }`}>
                    {model.name}
                  </div>
                  <div className="text-[11px] text-zinc-600">{model.description}</div>
                </div>
                {model.id === selectedModel && (
                  <svg className="ml-auto text-violet-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
