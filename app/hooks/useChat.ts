'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, getDeviceId } from '../../lib/firebase';
import { Message } from '../components/ChatMessage';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
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
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Get device ID on mount (client-side only)
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // Subscribe to conversations from Firestore
  useEffect(() => {
    if (!deviceId || deviceId === 'server') return;

    const conversationsRef = collection(db, 'devices', deviceId, 'conversations');
    const q = query(conversationsRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        convos.push({
          id: docSnap.id,
          title: data.title,
          messages: data.messages ? JSON.parse(data.messages) : [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      setConversations(convos);
    }, (error) => {
      console.error('Firestore subscription error:', error);
    });

    return () => unsubscribe();
  }, [deviceId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = activeConversation?.messages || [];

  const createConversation = useCallback(async (firstMessage: string): Promise<string> => {
    if (!deviceId) throw new Error("Device ID not ready");
    const id = generateId();
    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + '...' : firstMessage;
    
    // Optimistic update
    const newConv: Conversation = {
      id,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(id);

    // Save to Firestore
    const convRef = doc(db, 'devices', deviceId, 'conversations', id);
    await setDoc(convRef, {
      title,
      messages: '[]',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return id;
  }, [deviceId]);

  const saveMessagesToFirestore = useCallback(async (convId: string, updatedMessages: Message[]) => {
    if (!deviceId) return;
    const convRef = doc(db, 'devices', deviceId, 'conversations', convId);
    await setDoc(convRef, {
      messages: JSON.stringify(updatedMessages),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [deviceId]);

  const addMessage = useCallback((convId: string, message: Message) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const updatedMessages = [...c.messages, message];
          // Fire and forget save
          saveMessagesToFirestore(convId, updatedMessages);
          return { ...c, messages: updatedMessages };
        }
        return c;
      })
    );
  }, [saveMessagesToFirestore]);

  const updateLastAssistantMessage = useCallback((convId: string, content: string, isDone: boolean = false) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        const lastIdx = msgs.length - 1;
        if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
          msgs[lastIdx] = { ...msgs[lastIdx], content };
        }
        
        if (isDone) {
          // Only save to firestore when stream is done to save writes
          saveMessagesToFirestore(convId, msgs);
        }
        
        return { ...c, messages: msgs };
      })
    );
  }, [saveMessagesToFirestore]);

  const sendMessage = useCallback(
    async (content: string) => {
      let convId = activeConversationId;

      if (!convId) {
        convId = await createConversation(content);
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
                  updateLastAssistantMessage(convId!, accumulated, false);
                }
              } catch {
                // skip
              }
            }
          }
        }
        
        // Final save to firestore when done
        updateLastAssistantMessage(convId!, accumulated, true);
        
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Final save on abort
          const currentConv = conversations.find(c => c.id === convId);
          if (currentConv) {
             const lastMsg = currentConv.messages[currentConv.messages.length - 1];
             updateLastAssistantMessage(convId!, lastMsg.content, true);
          }
        } else {
          const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
          updateLastAssistantMessage(
            convId!,
            `⚠️ Error: ${errorMsg}. Please try again.`,
            true
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
    async (id: string) => {
      // Optimistic delete
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      
      // Delete from firestore
      if (deviceId) {
        await deleteDoc(doc(db, 'devices', deviceId, 'conversations', id));
      }
    },
    [activeConversationId, deviceId]
  );

  const clearChat = useCallback(async () => {
    if (activeConversationId && deviceId) {
      // Clear from state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, messages: [] } : c
        )
      );
      // Clear from firestore
      await saveMessagesToFirestore(activeConversationId, []);
    }
  }, [activeConversationId, deviceId, saveMessagesToFirestore]);

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
