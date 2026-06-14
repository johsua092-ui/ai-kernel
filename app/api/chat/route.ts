import { NextRequest } from 'next/server';

const API_URL = 'https://panelnya.online/v1/chat/completions';

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

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
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
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {
                  // skip malformed JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
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
