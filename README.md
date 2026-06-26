# 🧠 AI Kernel

Modern AI chat interface built with **Next.js 16**, **React**, and **Tailwind CSS v4** — powered by an autonomous AI Agent.

![AI Kernel](https://img.shields.io/badge/AI-Kernel-8b5cf6?style=for-the-badge&logo=openai&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![AI Agent](https://img.shields.io/badge/AI_Agent-Autonomous-10b981?style=for-the-badge&logo=github-actions&logoColor=white)
![CI](https://img.shields.io/github/actions/workflow/status/johsua092-ui/ai-kernel/ci.yml?branch=main&style=for-the-badge&label=CI&logo=github)

## Features

- 💬 **Real-time streaming** — Responses stream in real-time via SSE
- 🗂️ **Multi-conversation** — Create, switch, and delete conversations
- 📱 **Responsive design** — Works on desktop and mobile
- 🎨 **Dark theme** — Beautiful dark UI with violet accents
- ⚡ **Fast** — Built on Next.js App Router with Turbopack
- 🛑 **Stop generation** — Cancel AI responses mid-stream
- 🤖 **AI Agent** — Autonomous coding agent that can push to GitHub
- 🔄 **CI/CD Pipeline** — Automated build & lint on every push

## 🤖 AI Agent

AI Kernel includes an autonomous AI agent that can modify the codebase and push changes directly to GitHub.

### Trigger via GitHub Issues

Comment on any issue with:

```
/ai <your instruction here>
```

**Examples:**
```
/ai Add a dark mode toggle button to the header
/ai Fix the mobile responsive layout for the sidebar
/ai Create a new API route for user preferences
/ai Update the README with installation instructions
```

The AI agent will:
1. 🧠 Analyze your instruction
2. 📝 Generate the necessary code changes
3. 🌿 Create a new branch
4. 🚀 Push the changes
5. 🔄 Open a Pull Request
6. 💬 Comment on the issue with results

### Trigger via Workflow Dispatch

Go to **Actions** → **🤖 AI Agent** → **Run workflow** and enter your instruction.

### Agent API

The agent also exposes REST APIs:

```bash
# Check agent status
curl https://ai-kernel.vercel.app/api/agent/github

# Execute an instruction (requires auth)
curl -X POST https://ai-kernel.vercel.app/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"instruction": "Add a footer component", "userEmail": "owner@email.com"}'
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/johsua092-ui/ai-kernel.git
cd ai-kernel
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# AI API
PANEL_API_KEY=your-api-key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# AI Agent (optional)
GITHUB_PAT=your-github-personal-access-token
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
ai-kernel/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline (build, lint)
│       └── ai-agent.yml        # AI Agent workflow
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # Chat streaming API
│   │   └── agent/
│   │       ├── github/route.ts # Direct GitHub operations
│   │       └── execute/route.ts # AI-powered code generation
│   ├── components/
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ModelSelector.tsx
│   │   ├── Sidebar.tsx
│   │   └── WelcomeScreen.tsx
│   ├── hooks/
│   │   └── useChat.ts
│   └── page.tsx
├── lib/
│   ├── firebase.ts
│   └── quota.ts
└── package.json
```

## Models Available

| Model | Provider | Description |
|-------|----------|-------------|
| Claude Opus 4.8 | Anthropic | Most capable |
| Claude Opus 4.7 | Anthropic | Balanced |
| Claude Opus 4.6 | Anthropic | Fast |
| GPT-5.5 | OpenAI | Most capable |
| GPT-5.4 | OpenAI | Balanced |
| GPT-5.4 Mini | OpenAI | Lightweight |
| GPT-5.3 Codex | OpenAI | Code specialist |
| GPT-5.2 | OpenAI | Fast |

## License

MIT

---

Built with ❤️ by [@johsua092-ui](https://github.com/johsua092-ui)
