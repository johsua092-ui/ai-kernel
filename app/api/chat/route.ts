import { NextRequest } from 'next/server';

export const maxDuration = 60; // Allow up to 60 seconds for Vercel Hobby

// Ganti URL pusat ke Gateway API lu sendiri
const API_URL = 'https://consoleapi.qzz.io/api/v1/chat/completions';

// === TOKEN ABUSE PROTECTION ===
const ROOT_EMAIL = 'johsua092@gmail.com';
const MAX_INPUT_CHARS = 3000;        // Max characters per user message (non-root)
const MAX_HISTORY_MESSAGES = 10;     // Max conversation history messages sent to API (non-root)
const MAX_TOTAL_CHARS = 15000;       // Max total characters across all messages (non-root)
const MAX_RESPONSE_TOKENS = 4096;    // Max response tokens for non-root
const ROOT_MAX_RESPONSE_TOKENS = 8192; // Root gets more response tokens

function getSystemPrompt(model: string): string {
  if (model.startsWith('gpt')) {
    return `You are GPT, a large language model by OpenAI. You are helpful, creative, and accurate. You can assist with coding, analysis, writing, math, and general knowledge. Be direct and clear in your responses.`;
  }
  return `You are Claude, an AI assistant made by Anthropic. You are helpful, harmless, and honest. You respond thoughtfully and accurately. You can assist with coding, analysis, writing, math, and general knowledge. Be direct and clear in your responses.`;
}

function getMessageText(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.filter((c: any) => c.type === 'text').map((c: any) => c.text || '').join(' ');
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model = 'claude-opus-4-8', userEmail } = body;

    const isRoot = userEmail === ROOT_EMAIL || (userEmail && userEmail.includes('johsua092'));

    // === SERVER-SIDE TOKEN ABUSE CHECKS (non-root only) ===
    if (!isRoot) {
      // 1. Check latest user message length
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        const lastText = getMessageText(lastMessage.content);
        if (lastText.length > MAX_INPUT_CHARS) {
          return new Response(
            JSON.stringify({ error: `Message too long (${lastText.length} chars). Maximum allowed: ${MAX_INPUT_CHARS} characters.` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // 2. Check total payload size
      const totalChars = messages.reduce((sum: number, m: any) => sum + getMessageText(m.content).length, 0);
      if (totalChars > MAX_TOTAL_CHARS) {
        return new Response(
          JSON.stringify({ error: `Conversation too large (${totalChars} chars). Maximum: ${MAX_TOTAL_CHARS}. Try starting a new chat.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Trim conversation history for non-root users
    let trimmedMessages = messages;
    if (!isRoot && messages.length > MAX_HISTORY_MESSAGES) {
      // Keep only the last N messages
      trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    }

    // Prepend system message
    const fullMessages = [
      { role: 'system', content: getSystemPrompt(model) },
      ...trimmedMessages,
    ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PANEL_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_tokens: isRoot ? ROOT_MAX_RESPONSE_TOKENS : MAX_RESPONSE_TOKENS,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `API Error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Return the response directly to the client transparently
    // This allows the frontend's useChat.ts to handle both streaming and full JSON
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
