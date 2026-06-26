import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 60;

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'johsua092-ui';
const REPO_NAME = 'ai-kernel';

interface GitHubFileOperation {
  action: 'create' | 'update' | 'delete';
  path: string;
  content: string;
  message?: string;
}

/**
 * AI Agent GitHub API
 * 
 * This endpoint allows the AI to push changes directly to GitHub.
 * Only the root user (johsua092) can use this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operations, branch = 'main', commitMessage, userEmail } = body;

    // Auth check: Only root user can push
    const isRoot = userEmail === 'johsua092@gmail.com' || 
                   (userEmail && userEmail.includes('johsua092'));
    
    if (!isRoot) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the repo owner can use the AI agent.' },
        { status: 403 }
      );
    }

    const githubToken = process.env.GITHUB_PAT;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub PAT not configured. Set GITHUB_PAT env variable.' },
        { status: 500 }
      );
    }

    const results: Array<{ path: string; status: string; sha?: string }> = [];

    for (const op of operations as GitHubFileOperation[]) {
      try {
        // Get current file SHA if it exists (needed for updates)
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
          // File doesn't exist, that's fine for creates
        }

        if (op.action === 'delete') {
          if (!existingSha) {
            results.push({ path: op.path, status: 'skipped - file not found' });
            continue;
          }

          const deleteRes = await fetch(
            `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${op.path}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
              },
              body: JSON.stringify({
                message: op.message || commitMessage || `🤖 Delete ${op.path}`,
                sha: existingSha,
                branch,
              }),
            }
          );

          if (deleteRes.ok) {
            results.push({ path: op.path, status: 'deleted' });
          } else {
            const err = await deleteRes.text();
            results.push({ path: op.path, status: `error: ${err}` });
          }
        } else {
          // Create or Update
          const putBody: Record<string, string> = {
            message: op.message || commitMessage || `🤖 ${op.action === 'create' ? 'Create' : 'Update'} ${op.path}`,
            content: btoa(unescape(encodeURIComponent(op.content))),
            branch,
          };

          if (existingSha) {
            putBody.sha = existingSha;
          }

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
            const data = await putRes.json();
            results.push({
              path: op.path,
              status: existingSha ? 'updated' : 'created',
              sha: data.content?.sha,
            });
          } else {
            const err = await putRes.text();
            results.push({ path: op.path, status: `error: ${err}` });
          }
        }
      } catch (error: any) {
        results.push({ path: op.path, status: `error: ${error.message}` });
      }
    }

    return NextResponse.json({
      success: true,
      branch,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Agent GitHub API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Check agent status and capabilities
 */
export async function GET() {
  return NextResponse.json({
    agent: 'AI Kernel Agent',
    version: '1.0.0',
    capabilities: [
      'create_file',
      'update_file', 
      'delete_file',
      'push_to_github',
      'create_branch',
    ],
    repo: `${REPO_OWNER}/${REPO_NAME}`,
    status: 'operational',
  });
}
