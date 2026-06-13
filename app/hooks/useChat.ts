'use client';

import { useState, useCallback, useRef } from 'react';
import { Message } from '../components/ChatMessage';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('claude-opus-4-8');
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = activeConversation?.messages || [];

  const createConversation = useCallback((firstMessage: string): string => {
    const id = generateId();
    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + '...' : firstMessage;
    const newConv: Conversation = {
      id,
      title,
      messages: [],
      createdAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(id);
    return id;
  }, []);

  const addMessage = useCallback((convId: string, message: Message) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, message] } : c
      )
    );
  }, []);

  const updateLastAssistantMessage = useCallback((convId: string, content: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        const lastIdx = msgs.length - 1;
        if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
          msgs[lastIdx] = { ...msgs[lastIdx], content };
        }
        return { ...c, messages: msgs };
      })
    );
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      let convId = activeConversationId;

      if (!convId) {
        convId = createConversation(content);
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      addMessage(convId, userMessage);

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      addMessage(convId, assistantMessage);
      setIsLoading(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Build message history
        const currentConv = conversations.find((c) => c.id === convId);
        const history = currentConv ? currentConv.messages : [];
        const apiMessages = [
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content },
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, model }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                if (json.content) {
                  accumulated += json.content;
                  updateLastAssistantMessage(convId!, accumulated);
                }
              } catch {
                // skip
              }
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          // User stopped generation
        } else {
          const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
          updateLastAssistantMessage(
            convId!,
            `⚠️ Error: ${errorMsg}. Please try again.`
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [activeConversationId, conversations, createConversation, addMessage, updateLastAssistantMessage, model]
  );

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const newChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId]
  );

  const clearChat = useCallback(() => {
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, messages: [] } : c
        )
      );
    }
  }, [activeConversationId]);

  return {
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
  };
}
