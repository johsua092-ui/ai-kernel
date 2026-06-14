import { NextRequest } from 'next/server';

const API_URL = 'https://panelnya.online/v1/chat/completions';

function getSystemPrompt(model: string): string {
  if (model.startsWith('gpt')) {
    return `You are GPT, a large language model by OpenAI. You are helpful, creative, and accurate. You can assist with coding, analysis, writing, math, and general knowledge. Be direct and clear in your responses.`;
  }
  return `You are Claude, an AI assistant made by Anthropic. You are helpful, harmless, and honest. You respond thoughtfully and accurately. You can assist with coding, analysis, writing, math, and general knowledge. Be direct and clear in your responses.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model = 'claude-opus-4-8' } = body;

    // Prepend system message
    const fullMessages = [
      { role: 'system', content: getSystemPrompt(model) },
      ...messages,
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
        max_tokens: 4096,
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
