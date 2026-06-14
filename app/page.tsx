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

  // Default to open on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

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
    <div className="flex h-screen bg-[#212121] text-zinc-200 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={() => {
          newChat();
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        onSelectConversation={(id) => {
          selectConversation(id);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        onDeleteConversation={deleteConversation}
        modelName={currentModelName}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#212121] z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Toggle Sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>

            <ModelSelector selectedModel={model} onModelChange={setModel} />
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#212121]">
          {showWelcome ? (
            <WelcomeScreen onSuggestionClick={handleSuggestionClick} modelName={currentModelName} />
          ) : (
            <div className="max-w-3xl mx-auto pb-4 pt-2">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.content === '' && (
                <TypingIndicator />
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="relative z-10">
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            onStop={stopGeneration}
          />
        </div>
      </div>
    </div>
  );
}
