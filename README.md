# 🧠 AI Kernel

Modern AI chat interface built with **Next.js 16**, **React**, and **Tailwind CSS v4**.

![AI Kernel](https://img.shields.io/badge/AI-Kernel-8b5cf6?style=for-the-badge&logo=openai&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)

## Features

- 💬 **Real-time streaming** — Responses stream in real-time via SSE
- 🗂️ **Multi-conversation** — Create, switch, and delete conversations
- 📱 **Responsive design** — Works on desktop and mobile
- 🎨 **Dark theme** — Beautiful dark UI with violet accents
- ⚡ **Fast** — Built on Next.js App Router with Turbopack
- 🛑 **Stop generation** — Cancel AI responses mid-stream

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

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js 16 | React framework with App Router |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first CSS |
| SSE Streaming | Real-time AI responses |

## Project Structure

```
ai-kernel/
├── app/
│   ├── api/chat/        # API route (proxies to AI backend)
│   ├── components/      # React components
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── WelcomeScreen.tsx
│   ├── hooks/           # Custom hooks
│   │   └── useChat.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── package.json
└── README.md
```

## License

MIT
