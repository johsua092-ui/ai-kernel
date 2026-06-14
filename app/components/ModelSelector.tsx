'use client';

import { useState, useRef, useEffect } from 'react';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export const MODELS: ModelOption[] = [
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', description: 'Most capable' },
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', description: 'Balanced' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Fast' },
  { id: 'gpt-5-5', name: 'GPT-5.5', description: 'Most capable' },
  { id: 'gpt-5-4', name: 'GPT-5.4', description: 'Balanced' },
  { id: 'gpt-5-4-mini', name: 'GPT-5.4 Mini', description: 'Lightweight' },
  { id: 'gpt-5-3-codex', name: 'GPT-5.3 Codex', description: 'Code specialist' },
  { id: 'gpt-5-2', name: 'GPT-5.2', description: 'Fast' },
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
      >
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
          className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50 animate-fadeIn">
          {/* Claude */}
          <div className="px-3 pt-2.5 pb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Claude</span>
          </div>
          <div className="px-1 pb-1">
            {MODELS.filter(m => m.id.startsWith('claude')).map((model) => (
              <button
                key={model.id}
                onClick={() => { onModelChange(model.id); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
                  model.id === selectedModel
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <div>
                  <div className="font-medium">{model.name}</div>
                  <div className="text-[11px] text-zinc-600">{model.description}</div>
                </div>
                {model.id === selectedModel && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="mx-2 border-t border-zinc-800" />

          {/* GPT */}
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">GPT</span>
          </div>
          <div className="px-1 pb-1.5">
            {MODELS.filter(m => m.id.startsWith('gpt')).map((model) => (
              <button
                key={model.id}
                onClick={() => { onModelChange(model.id); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
                  model.id === selectedModel
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <div>
                  <div className="font-medium">{model.name}</div>
                  <div className="text-[11px] text-zinc-600">{model.description}</div>
                </div>
                {model.id === selectedModel && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
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
