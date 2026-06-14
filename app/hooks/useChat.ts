'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, storage, auth, getDeviceId } from '../../lib/firebase';
import { Message, Attachment } from '../components/ChatMessage';
import { getQuotaInfo, consumeQuota, QuotaInfo } from '../../lib/quota';

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
  const [user, setUser] = useState<User | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const lastMessageTimeRef = useRef<number>(0); // Anti-spam cooldown

  // Get device ID on mount (client-side only)
  useEffect(() => {
    setDeviceId(getDeviceId());
    
    // Check for redirect errors
    import('firebase/auth').then(({ getRedirectResult }) => {
      getRedirectResult(auth).catch((error) => {
        if (error.code !== 'auth/redirect-cancelled-by-user') {
          alert("Login redirect failed (usually caused by blocked third-party cookies): " + error.message);
        }
      });
    });

    // Subscribe to auth state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Refresh quota info whenever user or deviceId changes
  const refreshQuota = useCallback(async () => {
    const uid = user?.uid || null;
    const email = user?.email || null;
    const did = deviceId;
    const info = await getQuotaInfo(uid, email, did);
    setQuotaInfo(info);
  }, [user, deviceId]);

  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  // Determine the base path for firestore based on auth state
  const basePath = user ? `users/${user.uid}` : (deviceId && deviceId !== 'server' ? `devices/${deviceId}` : null);

  // Subscribe to conversations from Firestore
  useEffect(() => {
    if (!basePath) return;

    const conversationsRef = collection(db, `${basePath}/conversations`);
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
  }, [basePath]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = activeConversation?.messages || [];

  const createConversation = useCallback(async (firstMessage: string): Promise<string> => {
    if (!basePath) throw new Error("Base path not ready");
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

    // Save to Firestore (Fire and forget)
    const convRef = doc(db, `${basePath}/conversations/${id}`);
    setDoc(convRef, {
      title,
      messages: '[]',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(console.error);

    return id;
  }, [basePath]);

  const saveMessagesToFirestore = useCallback(async (convId: string, updatedMessages: Message[]) => {
    if (!basePath) return;
    const convRef = doc(db, `${basePath}/conversations/${convId}`);
    await setDoc(convRef, {
      messages: JSON.stringify(updatedMessages),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [basePath]);

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
    async (content: string, files?: File[]) => {
      if (!basePath) return;

      // === ANTI-SPAM COOLDOWN (5 seconds) ===
      const now = Date.now();
      const timeSinceLast = now - lastMessageTimeRef.current;
      const isRoot = user?.email === 'johsua092@gmail.com' || user?.email?.includes('johsua092');
      if (!isRoot && timeSinceLast < 5000) {
        const waitSec = Math.ceil((5000 - timeSinceLast) / 1000);
        alert(`⏳ Slow down! Please wait ${waitSec} more second(s) before sending another message.`);
        return;
      }
      lastMessageTimeRef.current = now;
      // === END ANTI-SPAM ===

      // === QUOTA CHECK ===
      const uid = user?.uid || null;
      const email = user?.email || null;
      const { allowed, quotaInfo: updatedQuota } = await consumeQuota(uid, email, deviceId);
      setQuotaInfo(updatedQuota);

      if (!allowed) {
        const isGuest = !user;
        if (isGuest) {
          alert(`⚠️ Daily quota exhausted (${updatedQuota.limit} messages/day).\n\nSign in to get more quota!`);
        } else {
          alert(`⚠️ Daily quota exhausted (${updatedQuota.limit} messages/day).\n\nQuota resets tomorrow.`);
        }
        return;
      }
      // === END QUOTA CHECK ===

      let convId = activeConversationId;

      if (!convId) {
        convId = await createConversation(content || 'Attachment');
      }

      setIsLoading(true);

      let uploadedAttachments: Attachment[] = [];
      if (files && files.length > 0) {
        try {
          const uploadPromises = files.map(async (file) => {
            const storagePath = user ? `users/${user.uid}/uploads/${Date.now()}_${file.name}` : `devices/${deviceId}/uploads/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            return { url, type: file.type, name: file.name };
          });
          uploadedAttachments = await Promise.all(uploadPromises);
        } catch (error) {
          console.error("Upload error", error);
          setIsLoading(false);
          alert("Failed to upload file. Please check your Firebase Storage rules.");
          return;
        }
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
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
        
        const historyApiMessages = history.map((m) => {
          if (m.attachments && m.attachments.some(a => a.type.startsWith('image/'))) {
             const imageParts = m.attachments.filter(a => a.type.startsWith('image/')).map(a => ({ type: "image_url", image_url: { url: a.url } }));
             return {
               role: m.role,
               content: [
                 { type: "text", text: m.content || "Image" },
                 ...imageParts
               ]
             };
          }
          return { role: m.role, content: m.content };
        });

        const imageParts = uploadedAttachments.filter(a => a.type.startsWith('image/')).map(a => ({ type: "image_url", image_url: { url: a.url } }));
        const currentUserContent = imageParts.length > 0 ? [
           { type: "text", text: content || "Image" },
           ...imageParts
        ] : content;

        const apiMessages = [
          ...historyApiMessages,
          { role: 'user' as const, content: currentUserContent },
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
      if (basePath) {
        await deleteDoc(doc(db, `${basePath}/conversations/${id}`));
      }
    },
    [activeConversationId, basePath]
  );

  const clearChat = useCallback(async () => {
    if (activeConversationId && basePath) {
      // Clear from state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, messages: [] } : c
        )
      );
      // Clear from firestore
      await saveMessagesToFirestore(activeConversationId, []);
    }
  }, [activeConversationId, basePath, saveMessagesToFirestore]);

  return {
    user,
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
    quotaInfo,
  };
}
