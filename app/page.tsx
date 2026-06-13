'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import TypingIndicator from './components/TypingIndicator';
import WelcomeScreen from './components/WelcomeScreen';
import ModelSelector, { MODELS } from './components/ModelSelector';
import { useChat } from './hooks/useChat';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    conversations,
    activeConversationId,
    activeConversation,
    isLoading,
    model,
    setModel,
    sendMessage,
    stopGeneration,
    newChat,
    selectConversation,
    deleteConversation,
    clearChat,
  } = useChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSuggestionClick = (prompt: string) => {
    sendMessage(prompt);
  };

  const currentModelName = MODELS.find((m) => m.id === model)?.name || model;
  const showWelcome = messages.length === 0;

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={() => {
          newChat();
          setSidebarOpen(false);
        }}
        onSelectConversation={(id) => {
          selectConversation(id);
          setSidebarOpen(false);
        }}
        onDeleteConversation={deleteConversation}
        modelName={currentModelName}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>

            <div className="h-5 w-px bg-white/[0.08]" />

            <ModelSelector selectedModel={model} onModelChange={setModel} />
          </div>

          <div className="flex items-center gap-2">
            {activeConversation && (
              <span className="text-xs text-zinc-600 font-mono hidden sm:block truncate max-w-[200px]">
                {activeConversation.title}
              </span>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {showWelcome ? (
            <WelcomeScreen onSuggestionClick={handleSuggestionClick} modelName={currentModelName} />
          ) : (
            <div className="max-w-3xl mx-auto pb-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.content === '' && (
                <TypingIndicator />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          onStop={stopGeneration}
        />
      </div>
    </div>
  );
}
