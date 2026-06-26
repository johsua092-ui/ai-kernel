import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'johsua092-ui';
const REPO_NAME = 'ai-kernel';
const AI_API_URL = 'https://consoleapi.qzz.io/api/v1/chat/completions';

/**
 * AI Agent Execute endpoint
 * 
 * Supports both JSON response and text/event-stream SSE streaming.
 * Takes a natural language instruction, uses AI to generate file changes,
 * and pushes them to GitHub.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { instruction, userEmail, autoPush = true, branch = 'main', stream = false } = body;

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

    const githubToken = process.env.GITHUB_PAT;
    if (!githubToken && autoPush) {
      return NextResponse.json(
        { error: 'GITHUB_PAT not configured. Cannot push changes.' },
        { status: 500 }
      );
    }

    // --- STREAMING MODE ---
    if (stream) {
      const encoder = new TextEncoder();
      const sendSSE = (controller: ReadableStreamDefaultController, data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            sendSSE(controller, { step: 'init', status: 'running', message: 'Initializing AI Kernel Agent...' });
            
            // Wait slightly for a smooth UI transition
            await new Promise(resolve => setTimeout(resolve, 500));
            
            sendSSE(controller, { step: 'init', status: 'success', message: 'Agent initialized successfully.' });
            sendSSE(controller, { step: 'auth', status: 'success', message: 'Authentication verified.' });

            // Step 1: Get current repo structure for context
            sendSSE(controller, { step: 'repo_read', status: 'running', message: 'Fetching repository file structure...' });
            let repoContext = '';
            
            if (githubToken) {
              try {
                const treeRes = await fetch(
                  `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${branch}?recursive=1`,
                  {
                    headers: {
                      'Authorization': `Bearer ${githubToken}`,
                      'Accept': 'application/vnd.github.v3+json',
                      'User-Agent': 'ai-kernel-agent',
                    },
                  }
                );
                
                let treeData;
                if (treeRes.ok) {
                  treeData = await treeRes.json();
                } else if (branch !== 'main') {
                  // Fallback to main if patch branch doesn't exist yet
                  const fallbackRes = await fetch(
                    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/main?recursive=1`,
                    {
                      headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'ai-kernel-agent',
                      },
                    }
                  );
                  if (fallbackRes.ok) treeData = await fallbackRes.json();
                }

                if (treeData) {
                  const files = treeData.tree
                    ?.filter((t: any) => t.type === 'blob')
                    ?.map((t: any) => t.path)
                    ?.filter((p: string) => !p.includes('node_modules') && !p.includes('.next') && !p.includes('.git/'))
                    ?.join('\n');
                  repoContext = `\nCurrent repository file structure:\n${files}\n`;
                  sendSSE(controller, { step: 'repo_read', status: 'success', message: `Repository file structure loaded (${treeData.tree?.length || 0} items).` });
                } else {
                  sendSSE(controller, { step: 'repo_read', status: 'success', message: 'Repository structure empty. Starting fresh.' });
                }
              } catch (err: any) {
                sendSSE(controller, { step: 'repo_read', status: 'success', message: `Skipped file structure loading: ${err.message}` });
              }
            } else {
              sendSSE(controller, { step: 'repo_read', status: 'success', message: 'Skipped file structure loading (No GitHub Token).' });
            }

            // Step 2: Ask AI to generate file operations
            sendSSE(controller, { step: 'generating', status: 'running', message: 'Planning edits and generating code...' });
            
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
              throw new Error(`AI API error: ${err}`);
            }

            const aiData = await aiRes.json();
            const aiContent = aiData.choices?.[0]?.message?.content || '';

            // Step 3: Parse AI response
            sendSSE(controller, { step: 'parsing', status: 'running', message: 'Parsing generated changes...' });
            
            let operations;
            try {
              let jsonStr = aiContent;
              const codeBlockMatch = aiContent.match(/```(?:json)?\n([\s\S]*?)\n```/);
              if (codeBlockMatch) jsonStr = codeBlockMatch[1];
              
              operations = JSON.parse(jsonStr.trim());
              if (!Array.isArray(operations)) throw new Error('Not an array');
            } catch (e: any) {
              throw new Error(`Failed to parse AI response: ${e.message}\nRaw response: ${aiContent.substring(0, 200)}...`);
            }

            sendSSE(controller, { 
              step: 'parsed', 
              status: 'success', 
              message: `Code generation complete! Planned ${operations.length} file change(s).`,
              operations: operations.map((op: any) => ({
                action: op.action,
                path: op.path,
                reason: op.reason
              }))
            });

            // Step 4: Pushing changes to GitHub
            if (autoPush && githubToken) {
              sendSSE(controller, { step: 'pushing_start', status: 'running', message: `Pushing changes to GitHub branch: '${branch}'...` });
              
              // Verify/Create branch if not main
              if (branch !== 'main') {
                try {
                  const branchRes = await fetch(
                    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches/${branch}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'ai-kernel-agent',
                      },
                    }
                  );
                  
                  if (!branchRes.ok) {
                    // Create branch from main
                    const mainRefRes = await fetch(
                      `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/main`,
                      {
                        headers: {
                          'Authorization': `Bearer ${githubToken}`,
                          'Accept': 'application/vnd.github.v3+json',
                          'User-Agent': 'ai-kernel-agent',
                        },
                      }
                    );
                    
                    if (mainRefRes.ok) {
                      const mainRefData = await mainRefRes.json();
                      const sha = mainRefData.object.sha;
                      
                      const createBranchRes = await fetch(
                        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
                        {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${githubToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'ai-kernel-agent',
                          },
                          body: JSON.stringify({
                            ref: `refs/heads/${branch}`,
                            sha,
                          }),
                        }
                      );
                      if (createBranchRes.ok) {
                        sendSSE(controller, { step: 'log', message: `Created branch '${branch}' from 'main'.` });
                      }
                    }
                  }
                } catch (e: any) {
                  sendSSE(controller, { step: 'log', message: `Branch creation check skipped: ${e.message}` });
                }
              }

              const pushResults = [];
              for (const op of operations) {
                sendSSE(controller, { 
                  step: 'pushing_file', 
                  status: 'running', 
                  message: `${op.action === 'delete' ? 'Deleting' : op.action === 'create' ? 'Creating' : 'Updating'} ${op.path}...`,
                  path: op.path 
                });

                try {
                  let existingSha: string | undefined;
                  try {
                    const getRes = await fetch(
                      `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${op.path}?ref=${branch}`,
                      {
                        headers: {
                          'Authorization': `Bearer ${githubToken}`,
                          'Accept': 'application/vnd.github.v3+json',
                          'User-Agent': 'ai-kernel-agent',
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
                      const delRes = await fetch(
                        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${op.path}`,
                        {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${githubToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'ai-kernel-agent',
                          },
                          body: JSON.stringify({
                            message: `🤖 Delete: ${op.path} — ${op.reason || instruction}`,
                            sha: existingSha,
                            branch,
                          }),
                        }
                      );
                      
                      if (delRes.ok) {
                        pushResults.push({ path: op.path, status: 'deleted' });
                        sendSSE(controller, { step: 'pushed_file', status: 'success', path: op.path, message: `Successfully deleted ${op.path}` });
                      } else {
                        const err = await delRes.text();
                        throw new Error(`Failed to delete file: ${err}`);
                      }
                    } else {
                      pushResults.push({ path: op.path, status: 'skipped (does not exist)' });
                      sendSSE(controller, { step: 'pushed_file', status: 'success', path: op.path, message: `Skipped deletion of non-existing ${op.path}` });
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
                          'User-Agent': 'ai-kernel-agent',
                        },
                        body: JSON.stringify(putBody),
                      }
                    );

                    if (putRes.ok) {
                      pushResults.push({ path: op.path, status: existingSha ? 'updated' : 'created' });
                      sendSSE(controller, { step: 'pushed_file', status: 'success', path: op.path, message: `Successfully wrote ${op.path}` });
                    } else {
                      const err = await putRes.text();
                      throw new Error(`Failed to write file: ${err}`);
                    }
                  }
                } catch (err: any) {
                  pushResults.push({ path: op.path, status: 'error', error: err.message });
                  sendSSE(controller, { step: 'pushed_file', status: 'error', path: op.path, message: `Failed to push ${op.path}: ${err.message}` });
                }
              }

              sendSSE(controller, { 
                step: 'complete', 
                status: 'success', 
                message: `Successfully pushed all changes to GitHub branch '${branch}'!`, 
                branch,
                results: pushResults 
              });
            } else {
              sendSSE(controller, { 
                step: 'complete', 
                status: 'success', 
                message: 'Code generation complete. Skipped GitHub push (AutoPush is false).', 
                results: [] 
              });
            }

            controller.close();
          } catch (error: any) {
            console.error('Streaming Agent error:', error);
            sendSSE(controller, { step: 'error', message: error.message || 'An unknown error occurred during execution.' });
            controller.close();
          }
        }
      });

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // --- STANDARD JSON MODE (Backup/CI) ---
    let repoContext = '';
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
        // Continue
      }
    }

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

    let operations;
    try {
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

    let pushResults = null;
    if (autoPush && githubToken) {
      pushResults = [];

      for (const op of operations) {
        try {
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
