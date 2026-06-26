import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Edge Runtime: unlimited streaming once first byte sent
export const maxDuration = 60;

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
  const agentContext = `

You are part of AI Kernel — a premium AI agent platform. You have agentic capabilities:

**Tools Available (for root user):**
- 📝 Create, update, or delete files in the GitHub repository
- 🚀 Push changes directly to GitHub branches
- 🔄 Trigger CI/CD workflows
- 🤖 Execute multi-step coding tasks autonomously

When a user asks you to make changes to the codebase or push to GitHub, guide them on how to use the /ai command in GitHub Issues or the agent API.

**Project Context:**
- This is "AI Kernel" — a Next.js 16 app with TypeScript, Tailwind CSS v4, Firebase
- Repository: github.com/johsua092-ui/ai-kernel
- The AI agent can be triggered via GitHub Issues with "/ai <instruction>"

Always format code beautifully with syntax highlighting. Use markdown effectively.`;

  if (model.startsWith('gpt')) {
    return `You are GPT, a large language model by OpenAI. You are helpful, creative, and accurate. You can assist with coding, analysis, writing, math, and general knowledge. Be direct and clear in your responses.${agentContext}`;
  }
  return `You are Claude, an AI assistant made by Anthropic. You are helpful, harmless, and honest. You respond thoughtfully and accurately. You can assist with coding, analysis, writing, math, and general knowledge. Be direct and clear in your responses.${agentContext}`;
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
      trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    }

    // Prepend system message
    const fullMessages = [
      { role: 'system', content: getSystemPrompt(model) },
      ...trimmedMessages,
    ];

    const encoder = new TextEncoder();

    // Create a keepalive stream that pings every 5s to prevent Vercel timeout
    const stream = new ReadableStream({
      async start(controller) {
        // Send first byte immediately so Vercel knows response has started
        controller.enqueue(encoder.encode(' '));

        // Keep pinging every 5 seconds while waiting for upstream
        const pingInterval = setInterval(() => {
          controller.enqueue(encoder.encode(' '));
        }, 5000);

        try {
          const fetchResponse = await fetch(API_URL, {
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

          clearInterval(pingInterval);

          if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            controller.enqueue(encoder.encode(JSON.stringify({ error: `API Error: ${fetchResponse.status}`, details: errorText })));
            controller.close();
            return;
          }

          if (fetchResponse.body) {
            const reader = fetchResponse.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          }
          controller.close();
        } catch (error: any) {
          clearInterval(pingInterval);
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Gateway Fetch Error', details: error.message })));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
