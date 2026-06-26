import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'johsua092-ui';
const REPO_NAME = 'ai-kernel';
const AI_API_URL = 'https://consoleapi.qzz.io/api/v1/chat/completions';

/**
 * AI Agent Execute endpoint
 * 
 * Takes a natural language instruction, uses AI to generate file changes,
 * and optionally pushes them to GitHub.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { instruction, userEmail, autoPush = false, branch = 'ai-agent-patch' } = body;

    // Auth check
    const isRoot = userEmail === 'johsua092@gmail.com' || 
                   (userEmail && userEmail.includes('johsua092'));
    
    if (!isRoot) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the repo owner can use the AI agent.' },
        { status: 403 }
      );
    }

    if (!instruction) {
      return NextResponse.json(
        { error: 'No instruction provided.' },
        { status: 400 }
      );
    }

    const panelKey = process.env.PANEL_API_KEY;
    if (!panelKey) {
      return NextResponse.json(
        { error: 'PANEL_API_KEY not configured.' },
        { status: 500 }
      );
    }

    // Step 1: Get current repo structure for context
    let repoContext = '';
    const githubToken = process.env.GITHUB_PAT;
    if (githubToken) {
      try {
        const treeRes = await fetch(
          `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/main?recursive=1`,
          {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          const files = treeData.tree
            ?.filter((t: any) => t.type === 'blob')
            ?.map((t: any) => t.path)
            ?.filter((p: string) => !p.includes('node_modules') && !p.includes('.next'))
            ?.join('\n');
          repoContext = `\nCurrent repository file structure:\n${files}\n`;
        }
      } catch {
        // Continue without context
      }
    }

    // Step 2: Ask AI to generate file operations
    const systemPrompt = `You are the AI Kernel Agent — an autonomous coding agent for the "ai-kernel" project.
This is a Next.js 16 app with TypeScript, Tailwind CSS v4, Firebase, React 19.

${repoContext}

You receive instructions and MUST output ONLY a valid JSON array of file operations.
Each operation object must have:
- "action": "create" | "update" | "delete"
- "path": relative file path (e.g., "app/components/NewComponent.tsx")
- "content": full file content as a string (for create/update)
- "reason": brief explanation of the change

Rules:
1. Output ONLY valid JSON array. No markdown code blocks, no explanations outside JSON.
2. Use TypeScript for all .ts/.tsx files.
3. Follow the existing code style (Tailwind classes, 'use client' directives, etc.)
4. Include complete file contents, not diffs or patches.
5. Be precise and thorough.`;

    const aiRes = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${panelKey}`,
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: instruction },
        ],
        max_tokens: 8192,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return NextResponse.json(
        { error: 'AI API error', details: err },
        { status: 502 }
      );
    }

    const aiData = await aiRes.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let operations;
    try {
      // Try to extract JSON from possible markdown code blocks
      let jsonStr = aiContent;
      const codeBlockMatch = aiContent.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) jsonStr = codeBlockMatch[1];
      
      operations = JSON.parse(jsonStr.trim());
      if (!Array.isArray(operations)) throw new Error('Not an array');
    } catch (e: any) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response as file operations',
        raw: aiContent.substring(0, 3000),
      }, { status: 422 });
    }

    // Step 3: Optionally push to GitHub
    let pushResults = null;
    if (autoPush && githubToken) {
      pushResults = [];

      for (const op of operations) {
        try {
          // Get existing file SHA
          let existingSha: string | undefined;
          try {
            const getRes = await fetch(
              `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${op.path}?ref=${branch}`,
              {
                headers: {
                  'Authorization': `Bearer ${githubToken}`,
                  'Accept': 'application/vnd.github.v3+json',
                },
              }
            );
            if (getRes.ok) {
              const fileData = await getRes.json();
              existingSha = fileData.sha;
            }
          } catch {
            // New file
          }

          if (op.action === 'delete') {
            if (existingSha) {
              await fetch(
                `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${op.path}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                  },
                  body: JSON.stringify({
                    message: `🤖 Delete: ${op.path} — ${op.reason || instruction}`,
                    sha: existingSha,
                    branch,
                  }),
                }
              );
              pushResults.push({ path: op.path, status: 'deleted' });
            }
          } else {
            const putBody: Record<string, string> = {
              message: `🤖 ${op.action}: ${op.path} — ${op.reason || instruction}`,
              content: btoa(unescape(encodeURIComponent(op.content))),
              branch,
            };
            if (existingSha) putBody.sha = existingSha;

            const putRes = await fetch(
              `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${op.path}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${githubToken}`,
                  'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify(putBody),
              }
            );

            if (putRes.ok) {
              pushResults.push({ path: op.path, status: op.action === 'create' ? 'created' : 'updated' });
            } else {
              const err = await putRes.text();
              pushResults.push({ path: op.path, status: `error: ${err}` });
            }
          }
        } catch (error: any) {
          pushResults.push({ path: op.path, status: `error: ${error.message}` });
        }
      }
    }

    return NextResponse.json({
      success: true,
      instruction,
      operations: operations.map((op: any) => ({
        action: op.action,
        path: op.path,
        reason: op.reason,
        contentPreview: op.content?.substring(0, 200) + (op.content?.length > 200 ? '...' : ''),
      })),
      pushed: autoPush,
      pushResults,
      branch: autoPush ? branch : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Agent Execute error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
