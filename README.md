# 🧠 Memoria — Your AI-Powered Personal Assistant

**Memoria** is an intelligent, full-stack AI assistant built with **Next.js 16**, designed to seamlessly manage your **Gmail**, **Google Calendar**, and **Google Meet** — all from a single conversational interface.

Ask it anything. It reads your emails, schedules meetings, creates Meet links, deploys autonomous background agents, and more.

---

## ✨ Features

### 💬 AI Chat Interface
- Natural language chat powered by **OpenAI GPT-4o** with persistent, per-user conversation history stored in MongoDB
- Streaming tool-call loop with multi-step reasoning (agentic execution)
- **Generative UI** — the assistant can render interactive React forms (e.g., agent configuration cards) directly inside the chat
- Markdown rendering with GitHub Flavored Markdown (GFM) support
- Mobile-responsive with a collapsible sidebar

### 📧 Gmail Integration
- **Search emails** using semantic vector search (MongoDB Atlas Vector Search)
- **List recent emails** filtered by date range or sender
- **Send emails** directly from the chat
- **Email Sync Engine**: Syncs a configurable date range of Gmail messages, generates OpenAI embeddings, and stores them in MongoDB for fast semantic retrieval
- Background sync via **Inngest** (async, cancellable, observable)

### 📅 Google Calendar Integration
- **View upcoming events** for any date range
- **Create calendar events** with full metadata, description, and optional Google Meet links
- Calendar page with a real-time visual grid, fetched directly from the Google Calendar API (no stale DB data)

### 🎥 Google Meet Integration
- **Create standalone Meet links** with a title, schedule, and optional attendees
- **Retrieve Meet details** for any existing calendar event by event ID

### 🤖 Autonomous Background Agents
- Create named AI agents with custom system prompts, configurable run intervals, and granular permissions (read memory, draft emails, send emails)
- Agents are deployed as persistent Inngest CRON jobs running on a universal scheduler
- Manage agents from a dedicated `/agents` dashboard with avatar thumbnails (via DiceBear)

### 🎨 Theming System
- **5+ built-in color themes** (Default, Amethyst, Ocean, etc.) with full dark/light mode support
- In-line blocking script applies saved CSS custom properties before first paint — **zero FOUC (Flash of Unstyled Content)**
- Real-time theme switching with full-page reload to ensure correct CSS cascade

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5 |
| **Auth** | [Clerk](https://clerk.com/) (Google OAuth with token propagation) |
| **AI / LLM** | [OpenAI](https://openai.com/) (`gpt-4o`, embeddings) |
| **Database** | [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) |
| **Vector Search** | MongoDB Atlas Vector Search |
| **Background Jobs** | [Inngest](https://www.inngest.com/) (durable async functions & CRON) |
| **Google APIs** | Gmail v1, Calendar v3, Meet (via `googleapis`) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) + Radix UI primitives |
| **Styling** | TailwindCSS v4 + `tw-animate-css` |
| **Charts** | [Recharts](https://recharts.org/) |
| **Markdown** | `react-markdown` + `remark-gfm` |

---

## 📁 Project Structure

```
memoria/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Sign-in / Sign-up pages (Clerk)
│   │   ├── (home)/              # Protected app layout
│   │   │   ├── page.tsx         # Root → Chat page
│   │   │   ├── chat/[id]/       # Individual chat session route
│   │   │   ├── calendar/        # Google Calendar visual page
│   │   │   └── agents/          # Autonomous agents dashboard
│   │   ├── api/
│   │   │   ├── inngest/         # Inngest HTTP event handler
│   │   │   └── webhooks/        # Clerk user-sync webhook
│   │   ├── layout.tsx           # Root layout (Clerk + Themes + TooltipProvider)
│   │   └── globals.css          # Design system, CSS variables, theme tokens
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx   # Main chat UI (messages, input, generative UI)
│   │   │   ├── ChatSidebar.tsx  # Collapsible session history sidebar
│   │   │   └── ChatSyncCard.tsx # Proactive email sync invitation card
│   │   ├── create-agent/        # Agent creation/edit form
│   │   ├── side-bar/            # Navigation sidebar with theme-aware SVG logo
│   │   ├── theme/               # Color palette picker UI
│   │   ├── SyncManager.tsx      # Client-side Inngest sync orchestration
│   │   ├── login-form.tsx       # Custom Clerk sign-in form
│   │   └── signup-form.tsx      # Custom Clerk sign-up form
│   │
│   ├── lib/
│   │   ├── actions/             # Next.js Server Actions
│   │   │   ├── chat.actions.ts      # Chat CRUD + the main AI agent runner
│   │   │   ├── gmail.actions.ts     # Gmail fetch, sync, send, vector search
│   │   │   ├── calendar.actions.ts  # Google Calendar read/write
│   │   │   ├── agent.actions.ts     # Autonomous agent CRUD
│   │   │   ├── sync.actions.ts      # Sync status helpers
│   │   │   └── user.actions.ts      # User profile & sync settings
│   │   ├── agent/
│   │   │   ├── tools.ts         # OpenAI function-calling tool definitions
│   │   │   ├── tools/           # Individual tool implementations
│   │   │   │   ├── calendar.ts  # get_upcoming_events, create_calendar_event
│   │   │   │   ├── meet.ts      # create_meet_link, get_meet_details
│   │   │   │   └── emails.ts    # (email tool helpers)
│   │   │   └── cors.ts          # Google OAuth2 client factory
│   │   ├── database/
│   │   │   ├── db.ts            # Mongoose connection singleton
│   │   │   └── models/
│   │   │       ├── user.model.ts        # User + sync settings
│   │   │       ├── chat.model.ts        # Chat sessions + message history
│   │   │       ├── email-memory.model.ts # Synced emails + embeddings
│   │   │       ├── agent.model.ts       # Autonomous agent configs
│   │   │       └── calendar-event.model.ts
│   │   ├── registry/
│   │   │   └── theme.ts         # Theme palette definitions (CSS var maps)
│   │   └── openai.ts            # OpenAI client + embedding helper
│   │
│   ├── inngest/
│   │   ├── client.ts            # Inngest client instance
│   │   └── functions/
│   │       ├── email-sync.ts    # Durable Gmail sync function
│   │       ├── agent-worker.ts  # Per-agent execution function
│   │       ├── universal-cron.ts # CRON scheduler that fans out to all active agents
│   │       └── index.ts         # Function registry export
│   │
│   ├── hooks/                   # Custom React hooks
│   └── proxy.ts                 # (Optional) API proxy configuration
│
├── public/                      # Static assets (logo, favicon)
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- A **MongoDB Atlas** cluster (with Vector Search enabled on the `embedding` field)
- **Clerk** account with Google OAuth configured and the following Google API scopes:
  - `https://www.googleapis.com/auth/gmail.modify`
  - `https://www.googleapis.com/auth/calendar`
- An **OpenAI** API key
- An **Inngest** account (or run the local dev server)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd memoria
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# OpenAI
OPENAI_API_KEY=sk-...

# MongoDB
MONGODB_URI=mongodb+srv://...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# App URL (for webhooks and Inngest)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configure Clerk Webhooks

In your Clerk dashboard, add a webhook endpoint pointing to `http://localhost:3000/api/webhooks/clerk` (use a tunneling service like ngrok for local development). Subscribe to the `user.created` event.

### 5. Set Up MongoDB Atlas Vector Search

Create a Vector Search index named `default` on the `emailmemories` collection with the following configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "userId"
    }
  ]
}
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Run Inngest Dev Server (for background jobs)

In a separate terminal:

```bash
npx inngest-cli@latest dev
```

---

## 🔑 Key Concepts

### Agentic Chat Loop

The chat is powered by a multi-step tool-calling loop in `chat.actions.ts`. When the user sends a message:

1. The message + conversation history is sent to **GPT-4o** with the full tool list.
2. If the model calls a tool (e.g., `create_calendar_event`), the request is dispatched to the corresponding server-side implementation.
3. The tool result is appended to the message context and sent back to the model.
4. The loop repeats until the model returns a final text response.
5. The conversation is persisted to MongoDB.

### Generative UI

When the AI calls `create_autonomous_agent`, the response includes a special `[RENDER_AGENT_FORM]` marker followed by a JSON payload. The `ChatWindow` component parses this and renders a live `<AgentForm>` component directly inside the assistant's message bubble — allowing the user to review, edit, and save the agent configuration inline.

### Email Memory & Vector Search

Emails are synced from Gmail, encoded as OpenAI text embeddings (`text-embedding-3-small`), and stored in MongoDB Atlas. When the user asks semantic questions (e.g., "What did my recruiter say?"), a vector similarity search retrieves the most relevant emails and passes them to the LLM as context.

### Inngest Background Jobs

Long-running Gmail sync operations and autonomous agent runs are offloaded to **Inngest** durable functions, avoiding Next.js serverless function timeouts. The `universal-cron.ts` function runs on a global tick, looks up all ACTIVE agents, and fans out an event per agent to the `agent-worker.ts` function.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

---

## 🧩 Environment & Integrations Checklist

- [x] Clerk — Auth + Google OAuth token retrieval
- [x] OpenAI — LLM completions + text embeddings
- [x] MongoDB Atlas — Data persistence + Vector Search
- [x] Inngest — Background job execution + CRON scheduling
- [x] Google Gmail API — Email read + send
- [x] Google Calendar API — Event read + write
- [x] Google Meet — Conference link creation

---

## 📄 License

This project was built for the **COEP Inspiron '26** hackathon. All rights reserved.
