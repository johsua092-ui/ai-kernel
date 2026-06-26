'use client';

import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface AgentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

export interface AgentOperation {
  action: 'create' | 'update' | 'delete';
  path: string;
  reason?: string;
  status?: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  isAgent?: boolean;
  agentSteps?: AgentStep[];
  agentOps?: AgentOperation[];
  agentBranch?: string;
  agentError?: string;
}

function ChatMessage({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isEmpty = !message.content || message.content.trim() === '';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render step status icons
  const renderStepIcon = (status: 'pending' | 'running' | 'success' | 'error') => {
    switch (status) {
      case 'running':
        return (
          <div className="w-5 h-5 flex items-center justify-center relative">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </div>
        );
      case 'success':
        return (
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-500 text-[10px]">
            •
          </div>
        );
    }
  };

  return (
    <div className={`flex w-full px-4 py-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isUser ? (
        // User Message Bubble (Right)
        <div className="flex flex-col items-end gap-2 max-w-[80%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end mb-1">
              {message.attachments.map((file, i) => (
                file.type.startsWith('image/') ? (
                  <img key={i} src={file.url} alt={file.name} className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-zinc-700" />
                ) : (
                  <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-lg text-sm hover:bg-zinc-700 transition-colors border border-zinc-700">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    <span className="truncate max-w-[150px]">{file.name}</span>
                  </a>
                )
              ))}
            </div>
          )}
          {message.content && (
            <div className="bg-[#2f2f2f] text-zinc-200 px-5 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>
      ) : (
        // AI Message (Left)
        <div className="flex gap-4 w-full max-w-[95%] sm:max-w-[90%]">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-sm mt-0.5">
              {message.isAgent ? (
                // Agent Avatar (Robot Icon)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4M8 16h.01M16 16h.01" />
                </svg>
              ) : (
                // Standard Assistant Avatar
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-semibold text-sm text-zinc-300">
                {message.isAgent ? 'AI Kernel Agent' : 'AI Kernel'}
              </div>
              
              {message.isAgent && (
                <span className="bg-purple-950/50 border border-purple-500/20 text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Agent Mode
                </span>
              )}

              {!isEmpty && !message.isAgent && (
                <button 
                  onClick={handleCopy}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label="Copy message"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {copied ? (
                      <path d="M20 6L9 17l-5-5" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </>
                    )}
                  </svg>
                </button>
              )}
            </div>
            
            {/* Agent Workflow Stepper Board */}
            {message.isAgent && (
              <div className="bg-[#1b1b1b] border border-zinc-800 rounded-xl p-4 mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.2)] max-w-2xl w-full">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        message.agentError ? 'bg-red-400' : message.content.includes('Successful') ? 'bg-emerald-400' : 'bg-purple-400'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        message.agentError ? 'bg-red-500' : message.content.includes('Successful') ? 'bg-emerald-500' : 'bg-purple-500'
                      }`}></span>
                    </span>
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      GitHub Deployment Pipeline
                    </span>
                  </div>
                  
                  {message.agentBranch && (
                    <span className="bg-zinc-800 border border-zinc-700/50 text-zinc-400 text-[10px] px-2 py-0.5 rounded font-mono">
                      branch: {message.agentBranch}
                    </span>
                  )}
                </div>

                {/* Steps List */}
                <div className="space-y-3">
                  {message.agentSteps?.map((step) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="mt-0.5">{renderStepIcon(step.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          step.status === 'running' ? 'text-zinc-200' : step.status === 'success' ? 'text-zinc-300' : step.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                          {step.name}
                        </p>
                        {step.message && (
                          <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                            {step.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Proposed Operations List */}
                {message.agentOps && message.agentOps.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-zinc-800/80">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                      Planned Code Edits
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 hide-scrollbar">
                      {message.agentOps.map((op, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-900/40 border border-zinc-850 p-2 rounded-lg text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              op.action === 'create' ? 'bg-blue-950/50 text-blue-400 border border-blue-900/35' :
                              op.action === 'delete' ? 'bg-red-950/50 text-red-400 border border-red-900/35' :
                              'bg-amber-950/50 text-amber-400 border border-amber-900/35'
                            }`}>
                              {op.action}
                            </span>
                            <span className="font-mono text-zinc-300 truncate font-semibold" title={op.path}>
                              {op.path}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 pl-2 flex-shrink-0">
                            {op.status === 'running' && (
                              <svg className="animate-spin h-3.5 w-3.5 text-purple-400" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            {op.status === 'success' && (
                              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {op.status === 'error' && (
                              <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                            {op.status === 'pending' && (
                              <span className="w-2 h-2 rounded-full bg-zinc-700" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading Dots */}
            {isEmpty ? (
              <div className="flex items-center gap-1.5 h-5 mt-2">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]"></span>
              </div>
            ) : (
              <div className="text-sm leading-relaxed break-words prose prose-invert max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-pre:my-2 prose-pre:p-3 text-zinc-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ChatMessage);
