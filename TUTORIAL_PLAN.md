# 🎬 Complete Video Tutorial Plan — "Expense Tracker with AI Agents"

**Course length:** ~3 h 50 min across **20 chapters**
**Audience:** developers who have never seen this codebase (beginner → advanced)
**Goal:** after watching, a developer can answer *"If I need to change something in this application, where do I go, why do I go there, what code do I change, and what other parts of the system will be affected?"*

> **How to use this document:** Chapters are ordered the way a human needs to understand the system — not the order of files on disk. Every chapter contains the full narration script (what the instructor says), the code walkthrough (exactly what to show), screen direction (what appears on screen), and a transition into the next chapter. You can record each chapter straight from this plan.

---

## 1. Project Understanding

### Project purpose

This is a **full-stack personal expense tracker** — a MERN application that lets a user register/login, record expenses, organize them into categories, set budgets, view charts and analytics, export CSV, and — the standout part — get **AI-powered financial advice at three levels of sophistication**:

1. **AI Expense Categorizer** — one LLM call to auto-suggest a category for an expense as you type it.
2. **Financial Advisor Agent** — a chat agent that plans which analysis tools to run, executes them against your real data, and writes a personalized answer with transparent reasoning.
3. **Multi-Agent System** — three specialist agents (Budget 💰, Savings 🏦, Risk 🚨) that analyze your finances **in parallel**, then a coordinator synthesizes their findings into a unified recommendation.

The project was clearly built as a *learning/showcase* app for the agent pattern: every agent logs its "thinking", every tool call is recorded, and the UI lets you expand the reasoning steps. That transparency is a design decision, not an accident — it's the project's main teaching device.

### Main features

- Register / login with JWT auth (passwords hashed with bcrypt)
- Create, list, filter, sort, update, and delete expenses
- Set per-category monthly budgets; check budget vs. actual
- Analytics: pie + bar charts, savings insights, top categories, CSV export
- AI category suggestion inline in the expense form (auto-applies above 85% confidence)
- Chat with a Financial Advisor agent that runs tools + shows reasoning
- One-click multi-agent analysis (Budget + Savings + Risk in parallel, AI-synthesized)
- Dark / black / system theme switching, persisted in `localStorage`

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite 4), React Router 6, axios, Chart.js via react-chartjs-2, date-fns |
| Backend | Node.js + Express 4 |
| Database | MongoDB via Mongoose 7 |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| AI | `openai` npm package pointed at **Groq's free OpenAI-compatible endpoint** (model `llama-3.3-70b-versatile`), with env-var overrides to switch providers |
| Dev tooling | nodemon (backend), Vite dev server (frontend), no test framework installed |

### High-level architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA on :3000)                                │
│  pages/ → components/ → api.js (axios, JWT header)           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (JSON) — CORS allowed
┌──────────────────────────▼──────────────────────────────────┐
│  Express API (on :8000)   backend/server.js                  │
│  routes/  auth · expenses · analytics · ai · agent · multi-agent │
│  middleware/auth.js  → JWT gatekeeper (req.userId)           │
│  services/  aiClient · aiService · agentTools ·              │
│             financialAdvisor · multiAgentCoordinator          │
│  agents/    budgetAgent · savingsAgent · riskAgent           │
└──────────┬────────────────────────────────┬─────────────────┘
           │                                │
┌──────────▼──────────┐        ┌────────────▼─────────────┐
│ MongoDB (mongoose)  │        │ Groq API (LLM, free tier) │
│ User · Expense ·    │        │ llama-3.3-70b-versatile  │
│ Budget              │        └──────────────────────────┘
└─────────────────────┘
```

**Data flow direction:** the frontend never talks to MongoDB or the LLM directly — every piece of data enters through an Express route, gets validated, is passed to a service/agent, and only the JSON result returns to the browser.

### Major components & their responsibilities

| Component | Responsibility |
|---|---|
| `server.js` | Bootstrap: express app, CORS, JSON parsing, DB connect, route mounting, listen |
| `middleware/auth.js` | Verify `Bearer` JWT, attach `req.userId`, else 401 |
| `models/` | Mongoose schemas: `User`, `Expense`, `Budget` |
| `routes/` | Thin HTTP layers: validate input → call services → shape responses |
| `services/aiClient.js` | **Single shared** LLM client (Groq, provider-switchable) |
| `services/aiService.js` | One-shot categorization + budget suggestions (deterministic temp 0.3) |
| `services/agentTools.js` | 6 standalone DB-analysis tools the agent can call |
| `services/financialAdvisor.js` | The single chat agent: plan → execute → synthesize → fallback |
| `agents/` + `services/multiAgentCoordinator.js` | 3 specialist agents run in parallel, coordinator synthesizes + prioritizes |
| `frontend/src/api.js` | axios instance + all endpoint wrappers + JWT interceptor |
| `pages/` | Login, Register, Dashboard (5 tabs) |
| `components/` | ExpenseForm (with 🤖 AI), ExpenseList, Analytics, AgentChat, MultiAgentPanel |
| `App.jsx` | Router, auth state, theme state (light/dark/black/system) |

### Important dependencies (and why they were chosen)

- **`openai` npm package** — even though the app calls Groq, the package is used because Groq exposes an OpenAI-compatible API; only `baseURL` + key + model differ. This makes provider switching a config change.
- **`mongoose`** — schema validation (the 8-category `enum` lives in the schema), object-id refs.
- **`axios`** — interceptors make attaching the JWT to every request one line.
- **`react-chartjs-2`** — declarative charts; theme-aware colors passed through options.
- **`date-fns`** — declared in `package.json`, but the code actually uses plain `Date`/`toLocaleString` (see Project Map note — it's an unused dependency).

---

## 2. Project Map

Complete file tree with the purpose of every important file. Items marked ⚠️ are **unused, deprecated, or inconsistent** — the instructor should flag them honestly rather than pretending they're part of the architecture.

```text
expense-tracker/
├── backend/
│   ├── server.js                  ★ ENTRY POINT — express app, middleware, mounts 6 route groups, listens
│   ├── .env                       ⚠️ SECRETS — PORT, MONGODB_URI, JWT_SECRET, NODE_ENV, OPENAI_API_KEY, GROQ_API_KEY (never commit / never show on screen)
│   ├── package.json               scripts: start (node), dev (nodemon); deps: express, mongoose, jwt, bcrypt, openai…
│   ├── middleware/
│   │   └── auth.js                JWT middleware — parses Bearer token, sets req.userId, 401 on failure
│   ├── models/
│   │   ├── User.js                name, email (unique), password (hashed), createdAt
│   │   ├── Expense.js             userId ref, description, amount, category enum (8), date, notes
│   │   └── Budget.js              userId ref, category enum, limit, month
│   ├── routes/
│   │   ├── auth.js                POST /register, POST /login, GET /me (auth)
│   │   ├── expenses.js            CRUD + POST /budget/set + GET /budget/get
│   │   ├── analytics.js           monthly-summary, category-breakdown, savings-insights, export/csv
│   │   ├── ai.js                  POST /categorize, GET /categories, POST /test
│   │   ├── agent.js               POST /ask, GET /capabilities, POST /test
│   │   └── multiAgent.js          POST /analyze, GET /agent/:name, /status, /health, /info, POST /test
│   ├── services/
│   │   ├── aiClient.js            ★ shared LLM client — GROQ_API_KEY, baseURL, AI_MODEL
│   │   ├── aiService.js           categorizeExpense() (temp 0.3), suggestBudgets() (temp 0.5), EXPENSE_CATEGORIES
│   │   ├── agentTools.js          6 tools: analyzeSpending, detectAnomalies, calculateSavingsOpportunities,
│   │   │                          getRecentTransactions, getMonthlyTrend, suggestSmartBudgets
│   │   ├── financialAdvisor.js    FinancialAdvisorAgent class — think(), callTool(), planToolCalls(),
│   │   │                          synthesizeWithAI(), fallbackAnalysis(); runFinancialAdvisor() factory
│   │   └── multiAgentCoordinator.js  MultiAgentCoordinator — runAllAgents() (Promise.all),
│   │                              synthesizeFindings(), prioritizeActions(), healthCheck(), getAgentStatus()
│   └── agents/
│       ├── budgetAgent.js         💰 analyzeBudgets() — category stats + recommendedBudget (+15% buffer)
│       ├── savingsAgent.js        🏦 findSavingsOpportunities() — benchmarks, difficulty, savings score
│       └── riskAgent.js           🚨 detectRisks() — z-score anomalies, behavioral changes, alerts, risk level
├── frontend/
│   ├── index.html                 HTML shell — inline gradient, #root, loads /src/main.jsx
│   ├── vite.config.js             dev server :3000, /api proxy → :8000 (note: api.js bypasses it — see below)
│   ├── package.json               react, react-dom, axios, react-router-dom, chart.js, react-chartjs-2, date-fns
│   └── src/
│       ├── main.jsx               ReactDOM.createRoot → renders <App/>
│       ├── App.jsx                ★ Router, auth state, theme state (light/dark/black/system), guards /dashboard
│       ├── api.js                 ★ axios instance (baseURL :8000/api), JWT interceptor, all API wrappers
│       ├── App.css                design tokens, dark-mode overrides via [data-theme]/[data-dark], theme toggle
│       ├── pages/
│       │   ├── Login.jsx          login form → authAPI.login → onLogin → /dashboard
│       │   ├── Register.jsx       register form (confirm-password check) → auto-login
│       │   └── Dashboard.jsx      5 tabs: Overview · Add Expense · Analytics · 🤖 AI Agent · 🕸️ Multi-Agent
│       └── components/
│           ├── ExpenseForm.jsx    add-expense form + 🤖 AI categorize button (auto-applies >0.85 confidence)
│           ├── ExpenseList.jsx    filter/sort table, delete, CSV export
│           ├── Analytics.jsx      Chart.js pie + bar, savings insights, theme-aware chart colors
│           ├── AgentChat.jsx      chat UI for the Financial Advisor; shows reasoning + tool calls
│           └── MultiAgentPanel.jsx  runs /multi-agent/analyze; renders synthesis, priorities, agent cards, thinking
└── README.md, QUICK_START.md, AI_SETUP_GUIDE.md, AI_QUICK_START.md,
    AGENT_GUIDE.md, AGENT_QUICK_REFERENCE.md   ⚠️ project docs (AI_SETUP_GUIDE loosely calls the pattern "RAG";
                                                there is NO vector DB / embeddings anywhere — see §6)
```

### ⚠️ Honest flags the instructor should state out loud

1. **`backend/models/Budget.js` vs. how agents read budgets.** The Budget schema stores one document per `{userId, category, limit, month}`. But `budgetAgent.js` calls `Budget.findOne({ userId })` and then reads `existingBudgets.budgets` — and `checkBudgetStatus()` reads `budgetDoc.budgets`. **There is no `budgets` field on the schema**, so that lookup is always `undefined`/`{}`. The expense-budget routes (`/budget/set`, `/budget/get`) work correctly with the real schema; the *agent* code is reading it wrong. This is a latent bug — say so, don't explain it away.
2. **`date-fns` is in `frontend/package.json` but never imported** — dead dependency.
3. **`frontend/src/api.js` hardcodes `http://localhost:8000/api`** — the Vite proxy in `vite.config.js` (`/api` → `:8000`) is effectively bypassed for real requests (they go straight to `:8000`, which is why backend CORS matters). The proxy is a valid alternative that isn't used.
4. **No tests.** Neither package has a `test` script. Don't invent one.
5. **No deployment config** (no Dockerfile, no CI, no hosting setup). Local dev only.
6. **`routes/ai.js` header comment mentions a `POST /suggest-category` endpoint that doesn't exist** — stale comment. `suggestBudgets()` in `aiService.js` is exported but **no route calls it**.
7. **`AgentChat.jsx` "quick questions"** dispatch a synthetic `submit` event on the form (`new Event('submit')`) to auto-send a question — a hack worth calling out.
8. **Tutorial artifacts** (video files, PDFs) were generated during development and deleted — they are not part of the app.

---

## 3. Recommended Learning Order

The sequence follows how a human must understand the system: **what → why → how it starts → data model → backend → frontend → each AI feature → cross-cutting concerns → full trace → extension.**

| # | Chapter | Duration | Builds on |
|---|---|---|---|
| 1 | Welcome & What We're Building | 8 min | — |
| 2 | Tech Stack & High-Level Architecture | 10 min | 1 |
| 3 | Codebase Map: The Folder Structure | 10 min | 2 |
| 4 | Setup: Running the App for the First Time | 12 min | 3 |
| 5 | Entry Points & Configuration | 12 min | 4 |
| 6 | The Database Layer: Three Mongoose Models | 12 min | 5 |
| 7 | Authentication: JWT + bcrypt End-to-End | 12 min | 6 |
| 8 | The REST API Layer: Routes, Validation, Errors | 12 min | 7 |
| 9 | Frontend Foundations: Router, API Client, State | 14 min | 8 |
| 10 | The Dashboard: Tabs, Stats, Expense List | 12 min | 9 |
| 11 | Core Feature: Adding an Expense (Full CRUD) | 12 min | 10 |
| 12 | Feature: Analytics & CSV Export | 12 min | 11 |
| 13 | AI Feature #1: The Expense Categorizer | 12 min | 11 |
| 14 | AI Feature #2: The Financial Advisor Agent | 15 min | 13 |
| 15 | AI Feature #3: The Multi-Agent System | 15 min | 14 |
| 16 | The Shared AI Client & Switching Providers | 8 min | 13–15 |
| 17 | Error Handling, Fallbacks & Graceful Degradation | 10 min | all backend |
| 18 | Theming: Dark Mode & the Design System | 8 min | 9 |
| 19 | Full End-to-End Trace: One Request Through Every Layer | 12 min | all |
| 20 | Extending the Project (with a live code change) | 10 min | all |

---

## 4. Complete Video Curriculum

---

### Chapter 1 — Welcome & What We're Building

**Duration:** 8 min
**Files:** none (overview; open the app)
**Concepts:** problem statement, feature tour, the three AI levels
**Learning Objective:** viewer can name what the app does and why the AI parts exist.

**Narration:**

> "Welcome! Over the next several hours we're going to take this project — a full-stack expense tracker with AI agents — and understand every piece of it, from the MongoDB schemas up to the React components and the LLM calls in between. By the end, you'll be able to open any file in this repository and know exactly why it exists, who calls it, and what would break if you changed it.
>
> So what is this thing? It's a personal finance app. You create an account, log in, and record expenses — things like 'Uber ride, twelve dollars' or 'Starbucks, five fifty'. Each expense gets a category — Food, Transport, Entertainment, and so on. You can filter, sort, delete, export to CSV, set budgets per category, and look at pie and bar charts of where your money goes.
>
> But the reason this project is interesting — and the reason we're spending most of the course on it — is that it layers **three different levels of AI** on top of a perfectly normal CRUD app.
>
> The first level is a one-shot categorizer: when you type an expense description, an AI suggests which category it belongs to, with a confidence score. One LLM call, done.
>
> The second level is a chat agent — a 'Financial Advisor'. You ask it a question like 'how can I save five hundred dollars this month?' and it *plans* which analysis tools to run, executes them against your real expense data, and then writes a personalized answer. Crucially, it records every step of its reasoning, and the UI lets you expand and read those steps.
>
> The third level is a multi-agent system. You click one button and **three specialist agents** — a Budget Advisor, a Savings Optimizer, and a Risk Monitor — analyze your finances *simultaneously*, in parallel, and then a coordinator merges their three reports into one unified recommendation with a health score and prioritized actions.
>
> So the thread running through this whole course is: this is a normal web app — and then we keep adding AI on top of it, and each time we add a *different* architectural pattern. The categorizer is a single call. The advisor is an agent loop with tools. The multi-agent system is parallel agents plus a coordinator. If you understand those three patterns, you understand modern AI application design — and this codebase is a perfect place to learn them, because they're small, readable, and heavily commented."

**Screen Direction:**
- Browser demo: register a throwaway account, add 2–3 expenses, show the Overview list and Analytics charts.
- Click the 🤖 AI button on the form once (show the suggestion box).
- Switch to the 🤖 AI Agent tab, send one question, expand "Show Agent Reasoning".
- Switch to 🕸️ Multi-Agent, click "🚀 Run Full Analysis", show the synthesis + agent cards.
- As you narrate the three AI levels, overlay labels: "Level 1: one call" / "Level 2: agent + tools" / "Level 3: parallel agents + coordinator".

**Transition:**
> "Before we look at any code, let's get the big picture of the technology — what each layer is responsible for and how they talk to each other. That's the map we'll be navigating for the rest of the course."

---

### Chapter 2 — Tech Stack & High-Level Architecture

**Duration:** 10 min
**Files:** none (diagram-driven; reference `backend/server.js` route mounting and `frontend/src/api.js` for the HTTP seam)
**Concepts:** client-server, REST, CORS, separation of concerns, three-tier architecture
**Learning Objective:** viewer can draw the architecture and label the data-flow arrows with real code.

**Narration:**

> "Let's zoom out and look at the whole system as three layers. On the left, a React single-page app running in the browser. In the middle, an Express API on port eight thousand. On the right, two things the backend talks to: MongoDB, and the Groq LLM API.
>
> Here's the rule that makes this app easy to understand: **the browser never touches the database, and it never calls the LLM.** All data — expenses, budgets, AI answers — flows through the Express API. The frontend makes HTTP requests, the backend does the work, and the backend returns JSON.
>
> Why structure it this way? Three reasons. First, security: the database credentials and the AI API key live only on the server. If the browser talked to MongoDB directly, the database password would be public. Second, the AI key is a server secret — every LLM call happens server-side. Third, it lets us put all the *business logic* — the agent reasoning, the statistical analysis, the validation — in one place, in JavaScript, and keep the UI dumb.
>
> There's one more thing I want you to notice, because it'll come up again and again: the backend is organized in *layers*. Requests arrive at a **route** — that's the HTTP layer, it validates the input. The route calls a **service** — that's the business logic. The service queries **models** — that's the database layer. And for the AI features, services also call the **LLM client**. We'll follow this same vertical slice over and over, so get comfortable with the pattern: *route → service → model/LLM → response*.
>
> On the frontend, the same discipline applies: pages compose components, components call a single axios module (`api.js`) that knows how to attach your login token, and state flows down from the Dashboard. No component ever constructs a raw fetch with a hardcoded URL."

**Screen Direction:**
- Show the architecture diagram (as in §1). Point at each arrow and name the code that implements it: frontend `api.js` → HTTP; `server.js` route mounting; `middleware/auth.js` as the gate; `services/aiClient.js` as the LLM seam; mongoose models → MongoDB.
- On the terminal: `curl http://localhost:8000/` to show the root JSON message.

**Transition:**
> "Now that you know the layers, let's walk the actual file tree and put every file in its box — including a few files that are dead weight, which I want you to know about so you don't waste time reading them."

---

### Chapter 3 — Codebase Map: The Folder Structure

**Duration:** 10 min
**Files:** entire tree (show `find backend frontend -type f`), plus the ⚠️ flags from §2
**Concepts:** project conventions, dead code, naming, comments-as-docs
**Learning Objective:** viewer can navigate the repo and spot unused files.

**Narration:**

> "Here's the entire project as a file tree. Let me give you the one-paragraph tour, and then I'll flag the traps.
>
> `backend/server.js` is the entry point. `backend/middleware/` has one file, the JWT gatekeeper. `backend/models/` has the three database schemas. `backend/routes/` has six routers — one per feature area. `backend/services/` is where the real logic lives, including the AI machinery. And `backend/agents/` holds the three specialist agents used by the multi-agent system.
>
> On the frontend, `src/main.jsx` boots React, `src/App.jsx` is the router and the home of auth state and theme state, `src/api.js` is the single HTTP client, `src/pages/` has the three screens, and `src/components/` has the five feature components. The `.css` files sit next to the components they style.
>
> A few things I want you to *not* waste time on. First: `date-fns` is listed in the frontend dependencies but never imported anywhere — dead dependency. Second: the route file for AI has a comment mentioning a `/suggest-category` endpoint that doesn't exist — stale documentation; the function `suggestBudgets` is exported but no route calls it. Third: there's no test framework and no deployment config in this repo — it's a local-dev project, and that's fine for learning.
>
> And one genuine inconsistency I want to flag now, because it will save you a confusing hour later: the `Budget` model stores one document per category with fields `category`, `limit`, `month` — but the budget *agent* reads `budgetDoc.budgets`, which doesn't exist on the schema. We'll come back to this in the multi-agent chapter; for now, just know that the normal expense-budget endpoints work with the real schema, and the agent code has a latent mismatch. That's not me complaining about the project — finding these mismatches is exactly the skill we're building."

**Screen Direction:**
- Open the repo in VS Code. Collapse/expand folders as you narrate.
- Run `find backend frontend -type f -not -path '*/node_modules/*'` in the terminal and compare with the on-screen tree.
- Highlight `date-fns` in `frontend/package.json`, the stale comment in `routes/ai.js`, the `budgets` reads in `budgetAgent.js` vs the `Budget` model.

**Transition:**
> "Enough map-reading — let's make it run. Setup is where the environment variables and the two servers come together, and it's also where half the beginner pain lives, so we'll go slowly."

---

### Chapter 4 — Setup: Running the App for the First Time

**Duration:** 12 min
**Files:** `backend/.env` (structure only — mask values!), `backend/package.json`, `frontend/package.json`, `vite.config.js`
**Concepts:** env vars, ports, MongoDB, API keys, required vs optional config
**Learning Objective:** viewer can run both servers and verify the app works; knows which config is required vs optional.

**Narration:**

> "Let's get this running on your machine. You'll need three things installed: Node.js — version sixteen or later will be fine for this project — MongoDB, and a code editor. MongoDB can be a local install or a free cloud cluster; either way it just needs to answer on a connection string.
>
> Open two terminals. In the first:
>
> `cd backend && npm install && npm run dev`
>
> In the second:
>
> `cd frontend && npm install && npm run dev`
>
> The backend runs on port eight thousand because its `.env` sets `PORT=8000`. The frontend dev server runs on port three thousand. Open http://localhost:3000 and you should see the login screen.
>
> Now, the configuration. The backend reads a file called `.env` — let me show you the *shape* of that file, but I will not show you the actual secret values, and neither should you ever commit this file.
>
> There are two groups of variables. **Required:** `MONGODB_URI` — the database connection string; if it's missing the server uses a default of `mongodb://localhost:27017/expense-tracker`. And `JWT_SECRET` — this signs your login tokens; make it a long random string. **Required only for AI features:** the API key. Here's a subtlety: the app is currently wired to Groq, a free LLM provider with an OpenAI-compatible API, and it reads `GROQ_API_KEY` first, falling back to `OPENAI_API_KEY`. So you need a key from either provider — Groq is free and needs no credit card. Without a key, the app runs perfectly fine: the statistical parts all work, and only the AI-written paragraphs fail gracefully. We'll see exactly how that graceful failure works in chapter seventeen.
>
> One more verification step: register an account and add an expense. If the row appears, the whole stack — frontend, API, database — is talking. That's your smoke test."

**Screen Direction:**
- Show the `.env` file with all values masked (`GROQ_API_KEY=***`). State loudly: *never show real secrets on camera*.
- Terminal: `npm install` output, then `npm run dev` in both folders.
- Show `mongosh` connecting and `show dbs` (expense-tracker appears after first write).
- Browser: register → add expense → row appears.

**Terminal commands (exact, supported by package.json):**
```bash
cd backend && npm install && npm run dev     # nodemon → http://localhost:8000
cd frontend && npm install && npm run dev    # vite → http://localhost:3000
```

**Transition:**
> "The app is alive. But do you know *why* those two commands start everything? The entry points are next — `server.js` on the backend and `main.jsx` → `App.jsx` on the frontend. Let's read them top to bottom."

---

### Chapter 5 — Entry Points & Configuration

**Duration:** 12 min
**Files:** `backend/server.js`, `frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/vite.config.js`, `frontend/index.html`
**Concepts:** bootstrap order, middleware, route mounting, React strict mode, SPA routing, protected routes
**Learning Objective:** viewer can explain what runs in what order when the app starts.

**Narration:**

> "Every program has an entry point — let's find both of them.
>
> On the backend, `server.js` is the whole bootstrap, and it's beautifully short. Line one: `require('dotenv').config()` — that's what loads the `.env` file into `process.env`. Then it creates the express app and applies two pieces of global middleware: `cors()`, which lets the browser on port three thousand call this API on port eight thousand — remember, the frontend's axios talks to `:8000` directly, so CORS isn't optional — and `express.json()`, which parses incoming JSON bodies into `req.body`.
>
> Then MongoDB. `mongoose.connect(...)` — it's a promise, so `.then` logs success and `.catch` logs failure. Notice: the server does *not* wait for the database before starting to listen. The connection happens in the background. That's fine for this app, but it's worth knowing — if the DB is down at boot, the server still starts and the first requests will fail.
>
> Next, the six route mounts. This is the app's entire public surface: `/api/auth`, `/api/expenses`, `/api/analytics`, `/api/ai`, `/api/agent`, `/api/multi-agent`. Each one delegates to a router file. Finally, a root route, and `app.listen` on `PORT` — which is eight thousand from the `.env`.
>
> Now the frontend. `main.jsx` is three lines: grab the `#root` div from `index.html`, create a React root, render `<App/>` inside `<StrictMode>`. StrictMode double-invokes effects in development — that's a React thing that catches bugs; it doesn't affect production.
>
> `App.jsx` is the real entry point of the UI. Read it as three jobs. **Job one: auth state.** It reads the token from `localStorage` on load, exposes `handleLogin` and `handleLogout` which write/clear `localStorage` and flip a boolean, and it *guards* the dashboard route — if you're not authenticated and you ask for `/dashboard`, you get redirected to `/login`. **Job two: routing.** Four routes: login, register, dashboard, and a catch-all that redirects based on auth. **Job three: theming.** It holds a `themePref` — light, dark, black, or system — resolves it, writes `data-theme` onto the `<html>` element, and passes a `toggleTheme` callback down to the pages. The CSS reads those attributes; we'll spend a whole chapter on that later.
>
> One subtle thing in `vite.config.js`: the dev server runs on port three thousand and defines a proxy that forwards `/api/*` to port eight thousand. But `api.js` hardcodes the full URL `http://localhost:8000/api`, so in practice requests bypass the proxy. Keep both in your head — the proxy is the 'proper' approach, the hardcoded URL is what's actually happening."

**Code Walkthrough:**
- `server.js`: line by line. Emphasize the order: config → middleware → db → routes → listen.
- `main.jsx`: the three lines.
- `App.jsx`: walk `useEffect` for localStorage auth, the theme resolution, and the `<Routes>` block with the `<Navigate>` guard on `/dashboard`.

**Screen Direction:**
- Open `server.js`, highlight each section as you narrate.
- DevTools → Network on the login page; show a request hitting `:8000/api/auth/...` directly (proving the proxy bypass).
- Highlight the `Navigate to="/login"` guard in `App.jsx`.

**Transition:**
> "The servers are up and the app is wired. But where does the data actually live? Everything so far is about plumbing. Time to open MongoDB and meet the three collections that store every expense, user, and budget in this app."

---

### Chapter 6 — The Database Layer: Three Mongoose Models

**Duration:** 12 min
**Files:** `backend/models/User.js`, `backend/models/Expense.js`, `backend/models/Budget.js`
**Concepts:** schemas, MongoDB documents, ObjectId refs, enums, validation at the schema level
**Learning Objective:** viewer can read a Mongoose schema and predict what a saved document looks like.

**Narration:**

> "MongoDB is a document database — no tables, no rows, no foreign keys in the SQL sense. Instead we define *schemas* with Mongoose, and Mongoose enforces the shape and validates the data before it hits the database. This app has exactly three collections: users, expenses, and budgets. They're the entire universe of data in this project — keep that in mind, because every feature, every agent, every chart is just a different way of slicing these three collections.
>
> `User` is the simplest. `name` and `email` — and note `unique: true` on email, which creates a unique index, meaning the database itself will reject a second account with the same email. `password` is stored as a string, but — critical detail — the routes hash it with bcrypt *before* saving, so what actually lands in the database is never the plain password. `createdAt` defaults to now.
>
> `Expense` is the workhorse. `userId` is an `ObjectId` with a `ref: 'User'` — that's how MongoDB links an expense to its owner; every query in the app filters by `userId`. `description` and `amount` are required. `category` is required and has an `enum` — the eight fixed categories. That enum is enforced twice in this project: here in the schema, and again in the AI service. And `date` defaults to now but can be overridden — the form sends a chosen date.
>
> `Budget` links a user, a category, a `limit` — the monthly ceiling — and a `month`. Notice what's *not* here: there's no `budgets` object field. I flagged this in the codebase tour: the budget agent reads `budgetDoc.budgets`, which will always be undefined. The routes, by contrast, query the schema correctly — one document per category per month. If you're ever confused by that agent output, this is the reason.
>
> Now — why schemas? Because the alternative, trusting every request, is how data rot happens. The `enum` alone prevents a thousand typos: a category can't silently become 'FOOD' or 'food' or 'Foods'; it's either exactly 'Food' or the save fails. When we add the AI categorizer, you'll see the AI service validate its own output against this same list — the schema is the backstop and the service is the frontstop."

**Code Walkthrough:**
- Show each schema field-by-field with the type + constraints.
- In `mongosh`: `db.users.findOne()`, `db.expenses.findOne()` with real docs from the running app.

**Screen Direction:**
- VS Code: the three model files side by side.
- Terminal: `mongosh expense-tracker` → `show collections` → `db.expenses.find().pretty()` on real data.

**Transition:**
> "Now that we know what a user *is*, how does someone become one? That's authentication — the JWT dance. It's the piece every request in this app depends on, and it's beautifully centralized in one middleware file."

---

### Chapter 7 — Authentication: JWT + bcrypt End-to-End

**Duration:** 12 min
**Files:** `backend/routes/auth.js`, `backend/middleware/auth.js`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`, `frontend/src/api.js` (interceptor)
**Concepts:** hashing vs encryption, JWT structure, stateless auth, middleware, axios interceptors
**Learning Objective:** viewer can trace a login from form click to a stored token, and explain why the token authenticates later requests.

**Narration:**

> "Let's watch a login happen — it's the perfect first end-to-end trace, because it touches every layer we've talked about.
>
> You type your email and password and hit Login in `Login.jsx`. The component calls `authAPI.login(email, password)`, which is just a POST to `/api/auth/login`. The backend route in `auth.js` does three things. First, it checks the body has both fields — otherwise a 400. Second, it looks up the user: `User.findOne({ email })`. If there's no user, or the password doesn't match, it returns 401 'Invalid credentials' — notice it returns the *same* error for both cases, so an attacker can't learn which emails are registered.
>
> The password check is `bcrypt.compare(password, user.password)`. This is the part beginners get wrong, so pay attention: we do **not** decrypt the stored password and compare. bcrypt is a one-way hash with a random salt baked in — you can't reverse it, and you can't even compare two hashes directly. `compare` re-hashes your input with the stored salt and checks the result. That's why registering hashes with `bcrypt.hash(password, 10)` — the ten is the cost factor; higher means slower to compute, which is exactly what you want against brute force.
>
> If the password is right, the route *signs* a JSON Web Token: `jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })`. A JWT is a base64 payload — here just the user id — wrapped in a signature computed with the secret. The server sends `{ token, user }` back.
>
> Back in the browser, `Login.jsx` calls `onLogin(token, user)`. In `App.jsx` that stores the token in `localStorage` and flips the auth state to true, which makes the router render the dashboard.
>
> Now the clever part — how does every *later* request prove it's you? In `api.js`, the axios instance has a request interceptor: before any request leaves the browser, it reads the token from localStorage and attaches `Authorization: Bearer <token>`. On the backend, `middleware/auth.js` runs on every protected route: it strips `Bearer `, verifies the signature with the same `JWT_SECRET`, and — this is the key line — sets `req.userId = decoded.userId`. From that point on, the route can trust `req.userId` is the logged-in user, and every query filters by it. That's how a user only ever sees their own expenses: not by checking, but because the entire request is scoped to the id inside the token.
>
> Why is this called *stateless* auth? Because the server stores nothing about sessions. The token itself is the credential — it's self-contained and signed. The cost is that you can't 'revoke' a token server-side before it expires; the seven-day expiry is the escape hatch."

**Code Walkthrough:**
- `routes/auth.js`: register (validation → duplicate check → hash → save → sign), login (find → compare → sign), `/me` (`select('-password')`).
- `middleware/auth.js`: token extraction, `jwt.verify`, `req.userId`, the two 401 paths.
- `api.js` interceptor: the 5 lines that attach the Bearer header.
- DevTools Network: show the `Authorization` header on a real `/api/expenses` request.

**Screen Direction:**
- Terminal: register via curl, decode the JWT payload at jwt.io (paste only the payload section — no secrets).
- DevTools → Application → Local Storage: show `token` and `user` keys.
- DevTools → Network: click a request, show request headers → `Authorization: Bearer eyJ...`.

**Transition:**
> "Authentication is the gate. Every feature we look at from here on sits behind it. So let's open the gate and read the six routers that define the entire API surface — the vocabulary the frontend speaks."

---

### Chapter 8 — The REST API Layer: Routes, Validation, Errors

**Duration:** 12 min
**Files:** `backend/routes/expenses.js`, `backend/routes/analytics.js` (skim), `backend/routes/ai.js`, `backend/routes/agent.js`, `backend/routes/multiAgent.js` (structure)
**Concepts:** REST conventions, query params, ownership checks, error-status mapping, thin controllers
**Learning Objective:** viewer can predict what any endpoint returns and knows the consistent patterns across all six routers.

**Narration:**

> "Every feature in this app is exposed as a REST endpoint, and all six routers follow the same three-step recipe: validate the input, do the work (usually by calling a service), map failures to HTTP status codes. If you learn the recipe once, you can read all six files.
>
> Let's use `expenses.js` as the template. The router is created, and the auth middleware is passed to every route. `GET /` lists expenses — it builds a MongoDB query object from optional `category`, `startDate`, `endDate` query parameters, and always pins `userId: req.userId`. That `userId` is the whole security model — we saw it come out of the JWT in the last chapter. `POST /` creates one: it checks three required fields, constructs an `Expense` document, saves, and returns 201 with the created document. `PUT /:id` and `DELETE /:id` do the ownership check — this is the pattern to remember:
>
> `if (!expense || expense.userId.toString() !== req.userId.toString())` → 403.
>
> That `toString()` comparison matters — a Mongoose `ObjectId` won't `===` a string, so this is the correct way to compare them. Only the owner can edit or delete.
>
> Two routes live under `/expenses/budget/set` and `/expenses/budget/get` — note they're registered *after* the `/:id` routes, but that's fine because the methods differ; `PUT`/`DELETE` vs `POST`/`GET` never collide. The set route has a neat upsert: it tries `findOne` on user + category + month; if found it updates the limit, otherwise it creates a new budget document.
>
> `analytics.js` is the same recipe applied to aggregation: it fetches expenses over a window and reduces them in JavaScript — `monthly-summary` groups by category, `category-breakdown` does the same over N months, `savings-insights` compares budget limits to actuals and fabricates an 'opportunity' — note it computes 'reduce your top category by ten percent' — and `export/csv` builds a CSV string by hand and sets the `Content-Disposition` header so the browser downloads a file.
>
> The three AI routers — `ai.js`, `agent.js`, `multiAgent.js` — are thin on top of services we'll study in their own chapters. But notice their shape now: `ai.js` validates description and amount, calls `categorizeExpense`, wraps in `{ success: true, data }`. `agent.js` validates the query, caps it at five hundred characters, calls `runFinancialAdvisor`, and returns reasoning plus tool calls plus data. `multiAgent.js` instantiates a coordinator per request and calls `runAllAgents()`.
>
> One pattern worth naming: the response envelope. The CRUD routes return bare documents, but the AI routes wrap results in `{ success, data }` and often `{ success, error }`. The frontend checks `response.data.success` before using `response.data.data`. Inconsistent envelopes are a real-world thing you'll have to live with in codebases like this — note it, don't fight it."

**Code Walkthrough:**
- `expenses.js`: the ownership check, the date-range query build, the budget upsert.
- `analytics.js`: `savings-insights` — follow the insights array construction (warning/info/opportunity).
- Skim the AI routers' structure only (deep dives come later).

**Screen Direction:**
- Terminal: curl each method against the running server with the token from a login (register a user, capture the token, show `-H "Authorization: Bearer ..."`).
- Show a 403 by editing an expense belonging to a different user (create two users).
- Show the CSV download headers with `curl -i`.

**Transition:**
> "We've seen the server side of the vocabulary. Now let's cross the wire and see how the frontend speaks it — the axios client, the router, and the state that ties the pages together."

---

### Chapter 9 — Frontend Foundations: Router, API Client, State

**Duration:** 14 min
**Files:** `frontend/src/api.js`, `frontend/src/main.jsx` (recap), `frontend/src/App.jsx` (recap), `frontend/src/pages/Dashboard.jsx`
**Concepts:** axios instance + interceptors, SPA routing, lifting state, prop drilling, useEffect data loading
**Learning Objective:** viewer can explain where every piece of frontend state lives and how data reaches a component.

**Narration:**

> "Everything the frontend knows about the backend flows through one file: `api.js`. Look at the top — `axios.create({ baseURL: 'http://localhost:8000/api' })`. That's the single HTTP client; every feature module below it is just a thin wrapper naming an endpoint. Then the interceptor we already met attaches the Bearer token to every request. The beauty of this file is that no component ever writes a URL — you call `expenseAPI.add(expense)` and the URL, the method, and the auth header are someone else's problem.
>
> Each API module maps one-to-one to a backend router: `authAPI`, `expenseAPI`, `analyticsAPI`, `aiAPI`, `agentAPI`, `multiAgentAPI`. If you know the backend routes, you already know this file. This symmetry — same names on both sides of the wire — is the single most useful navigation trick in the whole project: when you see a network call in a component, you can find the backend handler in seconds.
>
> Now, state. This app has no Redux, no context for data — just React's `useState` and `useEffect`, with state owned by the Dashboard and passed down. `App.jsx` owns auth state and theme state. `Dashboard.jsx` owns the expense list and the active tab. Everything else is props and local component state. That's a deliberate simplicity: the data graph is small enough that prop drilling is fine.
>
> Look at `Dashboard.jsx` closely, because it's the shell for the rest of the course. On mount, `useEffect` calls `loadExpenses()` → `expenseAPI.getAll()` → the list is stored in `expenses`. Three stat cards are computed with `reduce` right in the render. Five tab buttons flip `activeTab`. And the content area conditionally renders one of five components, passing `expenses` and callbacks down. `handleAddExpense` prepends the new expense to the list — note it trusts the object the form got back from the server, which is the right way: the server response is the source of truth, not the form input.
>
> One React detail worth pausing on: `loadExpenses` is defined with `async/await`, and the `useEffect` that calls it has an empty dependency array — so it runs once on mount. That's the entire data-loading strategy of this app. No caching, no refetching on window focus, no pagination. For a personal expense tracker, that's fine — and knowing it's *not* there is part of understanding the system."

**Code Walkthrough:**
- `api.js`: the instance, the interceptor, one full module (`expenseAPI`).
- `Dashboard.jsx`: state declarations, `useEffect`, the conditional tab rendering block.

**Screen Direction:**
- DevTools → Network: reload the dashboard, show the single `/api/expenses` call.
- Click through all five tabs, showing that Analytics and the AI tabs make their own requests on mount.

**Transition:**
> "Now we start building features on top of this foundation — and the first one is the one you'll use every day: adding an expense. This is also our first complete vertical slice, from button click to MongoDB and back."

---

### Chapter 10 — The Dashboard: Tabs, Stats, and the Expense List

**Duration:** 12 min
**Files:** `frontend/src/components/ExpenseList.jsx`, `frontend/src/pages/Dashboard.css` (skim)
**Concepts:** derived state, filter/sort in the client, conditional rendering, empty states
**Learning Objective:** viewer can explain how the Overview tab works and where filtering/sorting happen.

**Narration:**

> "The Overview tab is where you land after login, and it renders `ExpenseList`. Here's a design choice worth noticing: **filtering and sorting happen in the browser, not in the database.** The dashboard fetches *all* expenses once, and `ExpenseList` keeps a `filter` state and a `sortBy` state. `filteredExpenses` is a derived value — `expenses.filter(...)` when a category is selected — and `sortedExpenses` is another derived value on top of it, with a comparator that switches on `sortBy`: date descending, amount descending, or category alphabetical. Nothing is re-fetched when you change the dropdowns; it's all client-side. For a personal dataset that's snappy and simple. If this app had ten thousand expenses, this would be the first thing to change — server-side filtering with query params, which the backend already supports, by the way.
>
> The delete flow shows the ownership model end to end. Click the trash button → a `window.confirm` dialog → `expenseAPI.delete(id)` → the backend's ownership check runs (403 if it's somehow not yours) → on success the component calls `onDelete(id)`, and the Dashboard filters the deleted expense out of its state. Notice the UI doesn't re-fetch; it optimistically reconciles from the callback.
>
> The export button is a nice little browser trick: `analyticsAPI.exportCSV()` with `responseType: 'blob'` returns a binary blob; the component creates an object URL, makes a temporary anchor element with a `download` attribute, clicks it, and the browser saves the file. No navigation, no page reload. The CSV itself — headers plus quoted fields — is built by hand in `analytics.js`, which is fine at this scale.
>
> And notice the empty state: if there are no expenses, you get 'No expenses found. Start adding expenses to track your spending!' — a small touch, but the kind of polish that tells you the person who built this cared about the experience, not just the data."

**Code Walkthrough:**
- `ExpenseList.jsx`: the derived `filteredExpenses`/`sortedExpenses`, the delete handler, the export handler, the render of the table.
- Contrast with the server-side filter capability in `routes/expenses.js` (`category`, `startDate`, `endDate` query params that the UI never uses).

**Screen Direction:**
- Browser: filter dropdown + sort dropdown live, no network requests (show DevTools Network staying quiet).
- Delete an expense, show the confirm dialog.
- Export CSV, show the downloaded file.
- Show `curl 'http://localhost:8000/api/expenses?category=Food'` to prove the server-side filtering the UI doesn't use.

**Transition:**
> "Time for our first complete vertical slice. We're going to follow one expense — from typing 'Uber ride' into the form, through the API, into MongoDB, and back onto the screen."

---

### Chapter 11 — Core Feature: Adding an Expense (Full CRUD)

**Duration:** 12 min
**Files:** `frontend/src/components/ExpenseForm.jsx`, `backend/routes/expenses.js` (POST), `backend/models/Expense.js`
**Concepts:** controlled forms, async submit, server validation, response-driven state
**Learning Objective:** viewer can trace a complete create operation through every layer.

**Narration:**

> "Let's slow down and follow one expense through the entire stack. This is the pattern you'll recognize in every feature we study from here on.
>
> **The form.** `ExpenseForm` is a controlled component: the whole form lives in one `form` state object — description, amount, category, date, notes — and every input calls `handleChange`, which updates it with `setForm(prev => ({ ...prev, [name]: value }))`. That spread-operator pattern — copy the old state, override one key — is the canonical React idiom; it's why you always see it.
>
> **Submit.** `handleSubmit` prevents the default page reload — that `e.preventDefault()` is non-negotiable in React forms, or the browser navigates away. It validates nothing itself — the HTML `required` attributes and `min="0"` do that client-side — then calls `expenseAPI.add({ ...form, amount: parseFloat(form.amount) })`. Note `parseFloat`: the input gives us a string, and the database wants a number. Type conversion at the boundary — that's a real-world lesson.
>
> **The wire.** `api.js` turns that into `POST http://localhost:8000/api/expenses` with the Bearer token attached by the interceptor. **The route.** `routes/expenses.js` checks description, amount, and category are present, then builds `new Expense({ userId: req.userId, ... })` — the ownership comes from the token, never from the body. It saves and returns 201 with the created document, which now has an `_id` and `createdAt` added by Mongoose.
>
> **The database.** Mongoose validates against the schema — the category enum, `amount >= 0` via `min: 0` — and inserts the document into the `expenses` collection.
> **Back in the browser.** `handleSubmit` gets the response, calls `onExpenseAdded(response.data)` — and remember what the Dashboard does: it *prepends the server's response* to its list. That's why the new row appears instantly, with the real `_id` and timestamps, without a refetch. Then the form resets and a success message shows for three seconds via `setTimeout`.
>
> If anything fails — network, validation, server error — the catch block reads `err.response?.data?.error` and shows it in the error banner. That optional chaining is important: if the request never got a response, `err.response` is undefined, and without the `?.` you'd throw a second error while handling the first."

**Code Walkthrough:**
- `ExpenseForm.jsx`: `handleChange`, `handleSubmit`, the reset block, the error/success banners.
- `routes/expenses.js` POST handler; `Expense.js` schema.
- Show the request in DevTools: Request payload, Request headers (Authorization), Response (201 + document).

**Screen Direction:**
- DevTools Network with the request expanded — this is the money shot: payload in, 201 + JSON out.
- `mongosh`: `db.expenses.find({description: 'Uber ride'})` to show the stored document.
- Show the row appearing in the UI immediately after.

**Transition:**
> "That's the CRUD spine of the app, and every other feature hangs off it. Next: the first AI level — the categorizer. Same vertical slice, but instead of just saving, the request first takes a detour to an LLM."

---

### Chapter 12 — Feature: Analytics & CSV Export

**Duration:** 12 min
**Files:** `frontend/src/components/Analytics.jsx`, `backend/routes/analytics.js`
**Concepts:** client/server split of computation, Chart.js configuration, parallel fetches, theme-aware rendering
**Learning Objective:** viewer can explain which analytics math happens where, and how charts stay readable in both themes.

**Narration:**

> "The Analytics tab is a great lesson in *where* computation happens. The backend computes the numbers — grouped totals, averages, percentages — and the frontend only *renders* them. That's the right split for a reason: the raw expense data is big, the summary is small, and the math stays consistent no matter what UI you build on top.
>
> Look at the component. On mount — and again whenever you change the month range — it fires two requests in parallel with `Promise.all`: `getCategoryBreakdown(monthRange)` and `getSavingsInsights(monthRange)`. `Promise.all` is the key word: the two fetches run concurrently and the component only proceeds when both resolve. That's the same concurrency primitive the multi-agent system uses, by the way — we'll meet it again in chapter fifteen.
>
> The data becomes Chart.js config. The pie gets a fixed palette of eight colors; the bar is the brand purple `#667eea`. Both read from the same `categoryBreakdown` object. Then the options — and here's the theming hook: the component receives `theme` as a prop from the Dashboard, computes `isDark`, and picks tick, grid, and slice-border colors accordingly. This is why the charts stay readable in dark mode: Chart.js doesn't inherit CSS colors, so without these three variables the axis labels would be invisible on a dark background. Small code, real bug it prevents.
>
> The insights section renders `savingsInsights.insights` — each item has a `type` of warning, info, or opportunity — and the CSS styles each type differently. The 'top categories' list and the hardcoded money-saving tips round it out. Notice those tips are static text in the component, not AI-generated — a good example of the app's honesty about what is and isn't AI.
>
> One thing the component does *not* do: it doesn't use the `expenses` prop it receives, even though the Dashboard passes the full list. It re-fetches from the analytics endpoints instead. That's a mild redundancy — worth noticing, because it's the kind of inefficiency you'd clean up in a refactor."

**Code Walkthrough:**
- `Analytics.jsx`: the `useEffect` + `Promise.all`, the `pieData`/`barData` builders, the `chartOptions`/`barOptions` theme colors, the insights render.
- `analytics.js`: `savings-insights` — walk the insights array: over-budget warnings from `Budget.find`, the average-spending info line, the 10%-savings opportunity.

**Screen Direction:**
- Browser: switch month ranges, watch the two network requests fire.
- Toggle dark mode and zoom into the chart — show the tick colors change.
- `mongosh`: show the raw expenses behind a pie slice.

**Transition:**
> "The analytics are deterministic — the same data always gives the same numbers. Now we introduce the wildcard: AI. Level one, the categorizer: one LLM call, one category, with confidence."

---

### Chapter 13 — AI Feature #1: The Expense Categorizer

**Duration:** 12 min
**Files:** `backend/services/aiService.js`, `backend/routes/ai.js`, `frontend/src/components/ExpenseForm.jsx` (AI button), `frontend/src/api.js` (`aiAPI`)
**Concepts:** prompt engineering, system vs user messages, temperature, JSON output + validation, confidence thresholds
**Learning Objective:** viewer can explain the full categorizer flow and why it's a *single* LLM call with strict output parsing.

**Narration:**

> "This is the smallest AI feature in the app, and it's the perfect introduction to talking to an LLM from code. It's one function, one API call, and a strict contract on the output.
>
> The frontend entry point is the 🤖 AI button next to the description field. `handleAICategorize` guards two things first: a description is required, and the amount must be positive — the API is useless without them. Then it calls `aiAPI.categorizeExpense(description, amount)` → `POST /api/ai/categorize`.
>
> The route validates again — remember the recipe: validate, then delegate — and calls `categorizeExpense()` in `aiService.js`. Now look at what this function does. It builds **two** messages. The system message is where the real prompt engineering lives: it defines the eight categories, demands *only* JSON with three fields — category, confidence, reasoning — and gives merchant examples: Uber and Lyft are Transport, Starbucks and McDonald's are Food, Netflix is Entertainment, utility bills are Utilities. The user message is just the actual expense: 'Categorize this expense: Description: "Uber ride", Amount: $12'.
>
> The call itself is one line through the shared client: `model: AI_MODEL`, those two messages, `temperature: 0.3`, `max_tokens: 200`. Let me pause on temperature, because it's the parameter that encodes a design decision. Low temperature means the model is more deterministic — the same description gets the same category almost every time. For categorization, you *want* boring, predictable answers; a creative categorizer is a broken categorizer. That's why this feature uses 0.3 while the chat agent uses 0.7 — the chat *should* be varied and natural, the categorizer should not. And `max_tokens: 200` is a ceiling: the whole answer is a tiny JSON blob, so 200 tokens is plenty, and it keeps the call fast and cheap.
>
> Then the contract enforcement — this is the part most tutorials skip, and it's the part that makes production code work. The model returns text. The function does `JSON.parse(content)` — and if the model wrapped the JSON in prose, that parse throws and the whole thing fails. Then it validates the category against `EXPENSE_CATEGORIES` — if the model invented a category that's not in the enum, it throws. The schema enum in MongoDB is the final backstop. Three layers of defense: prompt, parse + validate, database enum.
>
> Back in the form, the suggestion comes home: if confidence is above 0.85, the form *auto-selects* the category and shows a success message; otherwise it shows the suggestion box with the reasoning. That threshold is the product decision: above 85 percent, the AI is probably right, so we act for you; below it, we ask you to decide. And if the whole call fails — no API key, quota exceeded — the catch block shows a friendly error and the form still works with the manual dropdown. AI is an enhancement, never a blocker. That's a philosophy this whole codebase follows."

**Code Walkthrough:**
- `aiService.js`: the system prompt, the user prompt, the call params, the `JSON.parse` + enum validation.
- `routes/ai.js`: input validation, the `{ success, data }` envelope.
- `ExpenseForm.jsx`: `handleAICategorize`, the confidence threshold, the suggestion box render.
- `aiClient.js`: show where `AI_MODEL` and the key come from (full provider discussion in ch. 16).

**Screen Direction:**
- Terminal: `curl -X POST :8000/api/ai/categorize -H "Authorization: ..." -d '{"description":"Uber ride","amount":12}'` → show the JSON response.
- Show the model's raw reply before parsing (add a console.log temporarily? — no; instead show a hand-made example of prose-wrapped JSON and how it would fail).
- Browser: type "Netflix subscription" → click 🤖 AI → category auto-applies with the success banner.

**Transition:**
> "One call, one answer — that's level one. Level two is where it gets interesting: an *agent*. The same data, but now the system decides *which tools to run* based on your question, executes them, and reasons over the results. Meet the Financial Advisor."

---

### Chapter 14 — AI Feature #2: The Financial Advisor Agent

**Duration:** 15 min
**Files:** `backend/services/financialAdvisor.js`, `backend/services/agentTools.js`, `frontend/src/components/AgentChat.jsx`, `backend/routes/agent.js`
**Concepts:** the agent loop (observe → plan → execute → analyze), tool functions, keyword-based planning, reasoning traces, fallbacks
**Learning Objective:** viewer can explain the observe-plan-execute-analyze loop and how tool results become a personalized answer.

**Narration:**

> "Here's the conceptual leap of the whole course: a *single LLM call* can't answer 'how can I save five hundred dollars this month?' — the model doesn't know your expenses. So we give the model *tools*: functions that query the database. The agent's job is to decide which tools to run, run them, and then reason over their results. This loop — observe, plan, execute, analyze — is the agent pattern.
>
> Start with the six tools in `agentTools.js`. They're the agent's hands. `analyzeSpending` fetches expenses over N months and computes per-category totals, counts, averages, and a daily average. `detectAnomalies` does real statistics — for each category it computes the mean and standard deviation, then flags any transaction more than two standard deviations above the mean as a `HIGH_SPIKE`. `calculateSavingsOpportunities` compares your category totals against hardcoded baseline budgets and reports the overage as potential savings. `getRecentTransactions` and `getMonthlyTrend` are self-explanatory. `suggestSmartBudgets` recommends a budget of average-plus-20-percent, rounded to the nearest ten. Notice every tool returns `{ success: true, ... }` or `{ success: false, error }` — a uniform contract the agent can trust.
>
> Now the agent itself, in `financialAdvisor.js`. It's a class with state: `userId`, plus arrays that accumulate `reasoning` and `toolCalls`. The `think()` method appends a step with a timestamp and logs it — this is how the entire reasoning trace gets built, and it's what the UI shows you in the 'Show Agent Reasoning' panel.
>
> The entry point is `runAgent(userQuery)`, and it's the four-phase loop in code. **Phase one, observe:** it logs the query. **Phase two, plan:** `planToolCalls(query)` — and here's an honest detail: the planning is *keyword matching*, not LLM reasoning. Lowercase the query; if it contains 'save', 'budget', 'reduce', 'money', or 'spending', add spending analysis and savings opportunities. 'trend', 'pattern', or 'month' adds the trend tool. 'unusual', 'anomal', 'spike' adds anomaly detection. If nothing matched, fall back to a comprehensive default set, then dedupe with a `Set`. It's simple, deterministic, and *completely transparent* — for a teaching project, that's a feature. A production agent might ask the LLM to choose tools via function calling; this one uses rules. Both are valid; know which one you're reading.
>
> **Phase three, execute:** a `for` loop over the plan, calling `callTool` for each. `callTool` looks the function up in the tools module — note it's a plain object lookup, no framework — records the call, stores the result in `this.results[toolName]`, and logs success or failure. **Phase four, analyze:** `synthesizeWithAI(userQuery, this.results)` serializes every tool result into a big JSON context, embeds it in a prompt with the user's question, and asks the LLM to write the answer in a fixed five-section format: key insights, recommendations, savings potential, concerns, next steps. Temperature 0.7 — conversational variety is welcome here, unlike the categorizer.
>
> The response that comes back is a goldmine for learning: `{ answer, reasoning, toolCalls, data }`. The answer is the LLM text; the rest is the *audit trail* — every thought, every tool call, every raw result. That's the transparency design decision I mentioned in chapter one, and it's the whole reason this app is a great teaching tool.
>
> And if the LLM call fails? `synthesizeWithAI` catches and calls `fallbackAnalysis`, which builds a decent markdown answer from the raw tool results *without any AI at all*. The agent still answers, just less fluently. Graceful degradation — the same philosophy as the categorizer.
>
> On the UI side, `AgentChat.jsx` is a normal chat: messages in state, a submit handler that calls `agentAPI.ask`, and — the good part — each agent message can expand to show the reasoning steps and the tools used. The quick-question buttons are a slightly hacky detail: they set the input value and then dispatch a synthetic `submit` event on the form. It works; it's also exactly the kind of code you'd replace with a cleaner refactor, and I want you to be able to recognize that."
>
> One more honest note: the route caps queries at 500 characters (`query.length > 500` → 400). Input limits like this are the cheap, boring defenses that keep an LLM-powered endpoint from being abused — worth remembering when you build your own.

**Code Walkthrough:**
- `agentTools.js`: `analyzeSpending` (stats), `detectAnomalies` (std-dev math), `suggestSmartBudgets` (20% buffer math).
- `financialAdvisor.js`: `planToolCalls` keyword rules, `callTool` lookup, `synthesizeWithAI` prompt + call, `fallbackAnalysis`.
- `AgentChat.jsx`: `handleSendMessage`, the expanded reasoning render, the synthetic-submit quick buttons.

**Screen Direction:**
- Browser: ask "How can I save $500 this month?" → expand "Show Agent Reasoning" (the steps appear), "Tools Used" (analyzeSpending + calculateSavingsOpportunities).
- Terminal: show the backend console logs `[Agent Thought N] ...` streaming in as the agent runs — this is a great visual.
- Run the same query with the API key removed → show the fallback answer still renders.

**Transition:**
> "One agent with tools is powerful. But this project goes one step further: what if instead of one generalist, you had three *specialists* working at the same time, each obsessed with one dimension of your money — and a coordinator to merge their opinions? That's the multi-agent system, and it's the crown jewel of this codebase."

---

### Chapter 15 — AI Feature #3: The Multi-Agent System

**Duration:** 15 min
**Files:** `backend/agents/budgetAgent.js`, `backend/agents/savingsAgent.js`, `backend/agents/riskAgent.js`, `backend/services/multiAgentCoordinator.js`, `frontend/src/components/MultiAgentPanel.jsx`, `backend/routes/multiAgent.js`
**Concepts:** parallel execution (`Promise.all`), specialization, coordinator pattern, statistical anomaly detection (z-scores), synthesis + prioritization
**Learning Objective:** viewer can explain what each agent computes, how they run in parallel, and how the coordinator synthesizes + prioritizes.

**Narration:**

> "Here's the architecture we're about to read — commit it to memory, because it's the pattern you'll reuse in your own AI apps. A coordinator instantiates three agents. All three run *at the same time* — not one after another — each analyzing the same expenses through its own lens. When all three finish, the coordinator feeds their three reports to the LLM and asks for a unified synthesis, then buckets the recommendations by priority.
>
> Let's meet the three specialists. They share a design: each is a class with a `userId`, a name, a specialty, and a `thinking` array — every agent logs its thoughts exactly like the Financial Advisor did.
>
> **The Budget Agent** pulls three months of expenses, and for each of the eight categories computes transaction count, total, average transaction, monthly average, and — the fun part — `recommendedBudget: Math.ceil(monthlyAvg * 1.15 / 10) * 10`. Read that math backwards: take the monthly average, add a 15 percent buffer, round up to the nearest ten dollars. That's a *business rule encoded in arithmetic* — the whole recommendation is just that formula plus the data. There's also a `checkBudgetStatus` that compares current-month spending to budgets and lists overruns — and I'll remind you of the flag from chapter three: it reads `budgetDoc.budgets`, which doesn't exist on the schema, so that branch always sees no budgets. The numbers you'll actually see in the UI come from `analyzeBudgets`, which works.
>
> **The Savings Agent** compares your monthly averages against hardcoded industry benchmarks — Food 350, Transport 200, Entertainment 100, and so on. Anything above benchmark becomes an opportunity with `potentialSavings`, ranked descending, plus a `difficulty` rating: Utilities and Healthcare are Hard, Food and Transport are Medium, Entertainment and Shopping are Easy — because discretionary spending is easier to cut than essential bills. Sum the opportunities and you get `totalPotentialSavings`.
>
> **The Risk Agent** is the statistician. It pulls six months of expenses, groups amounts by category, and computes the mean and standard deviation. Any current-month transaction whose **z-score** — how many standard deviations it sits from the mean — exceeds two is flagged as an anomaly, with a severity bump if the z-score exceeds three. It also compares this month's total to the average of the previous two, flagging a behavioral change if the swing exceeds 20 percent, severe if over 50. Then it scores the overall risk: 30 points per high anomaly, 10 per medium, 20 per high behavioral change, capped at 100 — 80+ Critical, 50+ High, 20+ Medium, else Low. Every number in that report is computed by code you can read, which is exactly what makes this teachable.
>
> Now the coordinator, `multiAgentCoordinator.js`. The constructor instantiates all three agents. The heart is `runAllAgents`: it logs, then — the crucial line — `const [budgetResults, savingsResults, riskResults] = await Promise.all([...])`. `Promise.all` fires all three `async` methods *simultaneously* and waits for all of them. If you'd written `await` three times in a row, the agents would run sequentially and the analysis would take three times as long. This one keyword is the whole 'multi' in multi-agent.
>
> Then `synthesizeFindings` builds a context object from the three results and sends it to the LLM with a prompt asking for an executive summary, top three priorities, quick wins, watch-outs, and a health score — as JSON. (One bug was fixed here during development: the context was declared inside the `try` and referenced in the `catch`, which crashed the whole analysis whenever the AI call failed — the declaration now lives outside, so a synthesis failure degrades gracefully and the agent reports still come back.)
>
> `prioritizeActions` then tries to parse the synthesis text as JSON — it regex-matches the first `{...}` block, because LLMs sometimes wrap JSON in prose — and buckets any priorities it finds into critical, high, medium, and low. Notice the resilience everywhere: if parsing fails, the buckets just stay empty rather than crashing.
>
> The frontend, `MultiAgentPanel.jsx`, is a model of defensive rendering. It fetches `/multi-agent/info` for the roster, then `/multi-agent/analyze` on the button click. The synthesis is rendered through a JSON parser with a plain-text fallback, plus case-insensitive key matching — because the LLM's JSON keys aren't guaranteed to match (`health_score` vs `healthScore`). Each agent gets a collapsible card with its table, and a 'show agent thinking' toggle. There's even a coordinator activity log. The whole panel is a lesson in *trusting the model less than the code*: the statistical data is rendered directly from the typed results, and the LLM prose is treated as unreliable text to be parsed defensively.
>
> The endpoint routes in `multiAgent.js` are thin: `POST /analyze` creates a coordinator for `req.userId` and calls `runAllAgents`. One coordinator per request — stateless, which is the right call for a read-only analysis."

**Code Walkthrough:**
- `budgetAgent.js`: the `recommendedBudget` formula; `savingsAgent.js`: benchmarks + `calculateDifficulty`; `riskAgent.js`: the z-score math, `calculateRiskLevel` scoring.
- `multiAgentCoordinator.js`: `Promise.all`, `synthesizeFindings` (context outside try), `prioritizeActions` (regex JSON parse).
- `MultiAgentPanel.jsx`: `parseJson`, `pick`, the agent-card renderers.

**Screen Direction:**
- Draw the coordinator diagram; animate the three agents' logs streaming in parallel in the backend console.
- Terminal: `curl -X POST :8000/api/multi-agent/analyze` with the token — show the JSON structure: `agentResults.budget/.savings/.risk`, `synthesis`, `prioritized`, `coordination`.
- Browser: run the full analysis, expand a thinking log, show the prioritized action columns.

**Transition:**
> "Three AI features, three different patterns — and they all call the LLM through the *same* client. That file is the subject of the next chapter, because it's the one place you'd touch to swap the entire AI backend."

---

### Chapter 16 — The Shared AI Client & Switching Providers

**Duration:** 8 min
**Files:** `backend/services/aiClient.js`
**Concepts:** single-responsibility for external services, OpenAI-compatible APIs, env-var-driven configuration
**Learning Objective:** viewer can explain how to switch AI providers by changing one file or one env var.

**Narration:**

> "Every AI call in this app — the categorizer, the advisor, the coordinator, the two agents that generate deep-dive recommendations — goes through exactly one module: `aiClient.js`. And it's sixteen lines. That's the payoff of the abstraction we've been seeing all along.
>
> Read it with me. It requires the `openai` package. It creates one client: `new OpenAI({ apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1' })`. And it exports `AI_MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile'`.
>
> Three things to unpack. First, the key: Groq first, OpenAI as fallback — so you can run the app with either. Second, the base URL: this is what makes Groq work with the `openai` package at all. Groq deliberately implements the same wire protocol as OpenAI — same paths, same request and response shapes — so the official OpenAI SDK works against it with just a different `baseURL` and key. That compatibility is the entire trick behind 'free AI'. Third, the model, overridable by `AI_MODEL`.
>
> Why centralize? Because the alternative — each service constructing its own client — means that switching providers would touch five files, and worse, five files could drift out of sync. Here, switching from Groq to, say, Mistral or Gemini is literally `OPENAI_BASE_URL=https://api.mistral.ai/v1` and `AI_MODEL=open-mistral-nemo` in the `.env` — or, if you wanted a permanent change, editing these two lines in one file. Every call site is untouched. That's the definition of a good seam: the rest of the app doesn't know or care which company is generating the tokens.
>
> The cost of the abstraction is worth naming honestly: every service shares one `temperature`/`max_tokens` *capability*, but the *values* are chosen per feature — we saw 0.3 for categorization, 0.5–0.6 for the agents' recommendations, 0.7 for chat and synthesis. Those aren't in the shared file; they're deliberate per-call choices, which is exactly where they belong. The seam handles *where* and *which model*; each feature handles *how creative*."

**Code Walkthrough:**
- `aiClient.js` top to bottom; trace `openai` + `AI_MODEL` imports in one other service.
- Show the `.env` variables (masked): `GROQ_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `AI_MODEL`.

**Screen Direction:**
- Split screen: `aiClient.js` on the left, `aiService.js`/`multiAgentCoordinator.js` imports highlighted on the right.
- Terminal: run one categorize call with `AI_MODEL` overridden to a different model name, show it works unchanged.

**Transition:**
> "We've seen fallbacks everywhere — the advisor's fallback analysis, the coordinator's graceful synthesis failure, the form's friendly error. That's not accidental. Let's make error handling its own chapter, because it's the difference between a demo and an app."

---

### Chapter 17 — Error Handling, Fallbacks & Graceful Degradation

**Duration:** 10 min
**Files:** `backend/services/financialAdvisor.js` (fallback), `backend/services/multiAgentCoordinator.js` (synthesis catch), `frontend/src/components/MultiAgentPanel.jsx` (synthesis error notice), `frontend/src/components/ExpenseForm.jsx` (error banner), `backend/routes/*` (error mapping)
**Concepts:** try/catch boundaries, status-code mapping, fallback strategies, the "AI optional" philosophy
**Learning Objective:** viewer can enumerate every error path in the app and explain the degradation strategy.

**Narration:**

> "Let's take stock of every place this app can fail, and what happens in each case — because the *pattern* is more important than any single catch block.
>
> **Level one: validation errors.** Routes check their input and return 400 — 'description is required', 'valid amount is required', 'query too long'. The frontend reads `err.response?.data?.error` and shows it. Cheap, deterministic, always available.
>
> **Level two: auth errors.** The middleware returns 401 for a missing or invalid token, 401 for bad credentials — deliberately identical messages so you can't probe for registered emails. And the ownership checks return 403 when the user id in the token doesn't match the document's owner. The status codes are the contract: 400 you sent something wrong, 401 you're not who you claim, 403 you're not allowed to touch *this*, 500 we broke.
>
> **Level three: database failures.** Any thrown error in a route is caught and returned as 500 with `err.message`. Crude — it leaks internal messages to the client — but consistent. Every route follows it.
>
> **Level four — the interesting one: AI failures.** The philosophy is: **AI is an enhancement; the app must survive without it.** Three concrete implementations. The Financial Advisor's `synthesizeWithAI` catches and calls `fallbackAnalysis`, which formats the raw tool results into markdown — the user still gets a useful, data-backed answer, just with no LLM flair. The multi-agent coordinator's `synthesizeFindings` catches and returns the agent findings with an `error` field — and the frontend's `MultiAgentPanel` detects that and renders an amber notice: 'The AI synthesis step failed... the individual agent reports below are still complete.' The categorizer throws through to the form, which shows 'Failed to get AI suggestion. Is the API key configured?' and leaves the manual dropdown fully usable.
>
> Here's the real-world detail worth stressing: these fallbacks were *written after* the failure modes were observed. During this project's development, the synthesis step genuinely crashed with 'context is not defined' because of that scoping bug — and with a placeholder API key, it returned 401s and 429s (quota exceeded). Each of those real incidents is why the catch blocks and the amber notice exist. When you build your own AI features, expect the same: the model will fail in ways you didn't predict, and the app needs a defined, visible degradation path for every one. The 401/429 you saw in the UI earlier in this project's life were the system working as designed — failing loudly and legibly instead of hanging."

**Code Walkthrough:**
- `financialAdvisor.js` → `fallbackAnalysis`; `multiAgentCoordinator.js` → the catch in `synthesizeFindings` (show the `context` fix); `MultiAgentPanel.jsx` → `synthesis.error && !raw` notice; `routes/*` → the try/catch → 500 envelope.

**Screen Direction:**
- Terminal: run the multi-agent analyze with a deliberately bad key → show the amber notice in the UI and the agent reports still rendering.
- DevTools: stop the backend → click the AI button → show the friendly error, form still works.

**Transition:**
> "The app is functionally complete now — except for one cross-cutting feature you've been seeing in every screenshot: the themes. Let's spend one chapter on the design system, because it's the best example in this codebase of CSS done *systematically*."

---

### Chapter 18 — Theming: Dark Mode & the Design System

**Duration:** 8 min
**Files:** `frontend/src/App.css`, `frontend/src/App.jsx` (theme logic), `frontend/src/components/Analytics.jsx` (theme-aware charts)
**Concepts:** CSS custom properties (design tokens), attribute selectors, specificity, `matchMedia`, persisted preferences
**Learning Objective:** viewer can explain how the four themes resolve and where every color lives.

**Narration:**

> "The theme system is the cleanest piece of CSS in this project, so let's read it as a design lesson. There are four user preferences — light, dark, black, and system — but only three actual looks, because 'system' resolves to dark or light based on your OS.
>
> Start in `App.jsx`. `themePref` is the user's stored choice, read from `localStorage` and defaulting to light. A second piece of state, `systemDark`, tracks whether the OS prefers dark — and a `matchMedia('(prefers-color-scheme: dark)')` listener updates it *live*, so if you flip your OS theme while the app is open, the app follows. Then the resolution: `theme = themePref === 'system' ? (systemDark ? 'dark' : 'light') : themePref`. The resolved theme is written to `document.documentElement.dataset.theme`, and a `data-dark` attribute is added for the two dark variants. The toggle button simply cycles through the four preferences, and the choice is persisted to `localStorage` so it survives reloads.
>
> Now the CSS, in `App.css`. At the top, `:root` defines a set of custom properties — design tokens — for the light palette: `--bg`, `--card-bg`, `--text`, `--accent`, and so on. Then `[data-theme='dark']` redefines those same variables — a blue-tinted slate palette — and `[data-theme='black']` a pure-black one. This is the whole trick of scalable theming: **components never hardcode colors; they reference `var(--bg)`.** When the attribute changes, every `var()` resolves to the new value, and the entire app re-themes with zero per-component dark styles.
>
> But this project has component stylesheets too — `Components.css`, `AgentChat.css`, `MultiAgentPanel.css`, and the rest — and they *do* hardcode colors. So there's a second block in `App.css`: `[data-theme='dark']` and `[data-theme='black']` selectors that override each component class with dark values. Why does this work against specificity? Because an attribute selector plus a class beats a plain class — `[data-theme='dark'] .stat-card` wins over `.stat-card`. It's scoped, it lives in one file, and light mode is untouched because the overrides only match when the attribute is present.
>
> The one place CSS can't reach is the canvas: the Chart.js charts in `Analytics.jsx`. That's why the component receives `theme` as a prop and computes `tickColor`, `gridColor`, and `sliceBorder` — remember that from chapter twelve. Charts and other canvas-based graphics will always need JavaScript-level theming; everything else can be pure CSS.
>
> If you're building on this project, the rule to follow is: new colors go into the token blocks in `App.css`; components reference tokens; component-specific overrides for dark go in the one override block. Fight the urge to sprinkle hardcoded dark colors through component files — that's how theme systems rot."

**Code Walkthrough:**
- `App.css`: the `:root` tokens, one dark palette block, one representative override rule.
- `App.jsx`: the `matchMedia` effect, theme resolution, the effect writing `data-theme`/`data-dark`.
- `Analytics.jsx`: the `isDark` colors.

**Screen Direction:**
- Browser: cycle all four themes; in DevTools Elements, show `<html data-theme="dark" data-dark="true">` and the `--bg` variable changing.
- Show `localStorage` `theme` key persisting across reload.

**Transition:**
> "We've covered every file and every feature. Now we connect everything we've learned in the chapter this whole course has been building toward: one complete request, followed through every layer, with the actual code at every step."

---

### Chapter 19 — Full End-to-End Trace: One Request Through Every Layer

**Duration:** 12 min
**Files:** all (this is the capstone trace)
**Concepts:** the complete vertical slice, connecting every chapter
**Learning Objective:** viewer can narrate any feature's full path from click to database and back.

**Narration:**

> "Everything we've learned, in one trace. We're going to add an expense and use the AI categorizer, following *every* layer. Keep your fingers on the keyboard — I want you to open these files with me.
>
> **1. The user action.** In the browser, on the Add Expense tab, I type 'Uber ride' and twelve dollars, and click the 🤖 AI button. That click lands in `ExpenseForm.jsx` → `handleAICategorize`. *(Open the file, point at the handler.)*
>
> **2. The API call.** It calls `aiAPI.categorizeExpense(description, parseFloat(amount))` → `api.post('/ai/categorize', ...)`. The axios instance prepends `http://localhost:8000/api`, and the interceptor adds `Authorization: Bearer <token>`. *(Open `api.js`; highlight the interceptor.)*
>
> **3. The backend gate.** The request hits Express on port 8000. The router `app.use('/api/ai', require('./routes/ai'))` routes it, and the `auth` middleware runs first: it verifies the JWT and sets `req.userId`. *(Open `middleware/auth.js`.)*
>
> **4. The route.** `POST /categorize` validates description and amount, then calls `categorizeExpense` from `aiService.js`. *(Open `routes/ai.js`.)*
>
> **5. The service.** `categorizeExpense` builds the system and user prompts, calls the shared client with temperature 0.3, parses the JSON, and validates the category against the enum. *(Open `aiService.js`.)*
>
> **6. The LLM.** The client in `aiClient.js` — Groq key, `llama-3.3-70b-versatile` — generates the answer. No database involved in this leg; the only data is the prompt text.
>
> **7. The response unwinds.** `aiService` returns `{ category: 'Transport', confidence: 0.97, reasoning }`; the route wraps it in `{ success: true, data }`; axios resolves it in the component. Confidence is above 0.85, so the form auto-selects Transport and shows the success banner.
>
> **8. The user submits.** Now the *second* request of this trace: `handleSubmit` → `expenseAPI.add({ description: 'Uber ride', amount: 12, category: 'Transport', ... })` → `POST /api/expenses`. Same gate, same middleware. The route checks the three required fields, builds `new Expense({ userId: req.userId, ... })` — ownership from the token — and `expense.save()` runs Mongoose validation: category must be in the enum, amount must be non-negative. *(Open `routes/expenses.js` and the `Expense` model.)*
>
> **9. The database.** The document lands in the `expenses` collection. Mongo assigns `_id` and `createdAt`.
>
> **10. The UI updates.** The route returns 201 with the document; `handleSubmit` calls `onExpenseAdded(response.data)`; the Dashboard prepends it to `expenses`; the row renders in the Overview tab — with `expense.amount.toFixed(2)` formatting it as `$12.00`. *(Open `Dashboard.jsx`'s `handleAddExpense` and `ExpenseList.jsx`'s render.)*
>
> One user action, one AI call, one save — and we touched ten files, two servers, a database, and an external LLM API. That's the vertical slice. If you can trace any feature like this, you understand the application."
>
> Draw the full diagram on screen as you go, and mark each arrow with the file that implements it.

**Screen Direction:**
- The full trace diagram with file names on every arrow (as in §5 of this document).
- Live: do the exact steps in the browser while DevTools Network is open; pause on each request.
- `mongosh`: show the stored document with `category: 'Transport'`.

**Transition:**
> "Now you understand the system deeply. The final chapter turns that understanding into action: how to change this project — including a live code change we'll make together."

---

### Chapter 20 — Extending the Project (with a Live Code Change)

**Duration:** 10 min
**Files:** depends on the chosen extension; walk one full change live (see §8 for options)
**Concepts:** applying the mental model: "where do I go, what do I change, what breaks?"
**Learning Objective:** viewer can plan a feature change using the architecture map.

**Narration:**

> "The final test of understanding: change the app. Let me show you the decision procedure, then we'll actually do one.
>
> The procedure is four questions. **Where does the data come from?** If the feature needs new stored data, the answer starts at the `models/` layer. **Where does it enter?** New behavior exposed to the UI needs a route in the matching router. **Where is the logic?** Anything non-trivial goes in `services/`. **What breaks?** Follow the callers — a schema change affects every query, a route change affects `api.js`, an API change affects the component that calls it.
>
> Let's do a concrete one: **add a 'Recurring' flag to expenses** — a checkbox so you can mark subscriptions. Walk it with me. **(Open each file as you go.)**
>
> Step one, the model: add `recurring: { type: Boolean, default: false }` to `Expense.js`. Step two, the route: nothing needed — `POST /` already copies `req.body` fields into the document, and `PUT /:id` uses `Object.assign(expense, req.body)`, so the new field flows through for free. Step three, the frontend API: nothing needed — `expenseAPI.add` sends the whole form. Step four, the form: add a checkbox bound to `form.recurring`. Step five, the list: render a small 'recurring' badge. That's the whole feature — and the reason it's small is the architecture: the route's generic handling and the form's `{...form}` spread mean new scalar fields propagate with almost no boilerplate. Now restart the dev server (nodemon picks up the backend automatically; Vite hot-reloads the frontend), add an expense with the checkbox, and check MongoDB: `db.expenses.findOne()` shows `recurring: true`.
>
> Then ask the 'what breaks' question: the AI categorizer doesn't care about the field (it only sees description and amount), the analytics don't aggregate it, the agents don't read it — so nothing downstream breaks. But if you'd *renamed* an existing field, every aggregation in `analytics.js` and every tool in `agentTools.js` would need updating — that's the blast radius you now know how to estimate.
>
> That's the whole course, in one skill: knowing the blast radius. Congratulations — you can now navigate this codebase the way its author does."

**Screen Direction:**
- Live code: make the five edits with the viewer, run it, demo it, check the DB.
- End screen: recap the architecture diagram and the "where do I go" map.

**Transition:**
> "In the next sections of this document you'll find the full end-to-end trace diagrams, the confusion-point list, the final demo script, extension exercises, and a one-page cheat sheet — everything you need to record or re-teach this course."

---

## 5. End-to-End Execution Walkthrough (reference for Chapters 11 & 19)

### Trace A — "Add an expense with AI categorization" (the capstone)

```text
USER clicks 🤖 AI with "Uber ride", $12
  → ExpenseForm.handleAICategorize()              [frontend/src/components/ExpenseForm.jsx]
  → aiAPI.categorizeExpense()                     [frontend/src/api.js — POST /api/ai/categorize, Bearer added]
  → express → routes/ai.js (auth middleware sets req.userId)
  → services/aiService.categorizeExpense()        [system prompt + user prompt]
  → services/aiClient.js → Groq API (temp 0.3, max_tokens 200)
  → JSON.parse + enum validation
  → { success: true, data: { category: "Transport", confidence: 0.97, reasoning } }
  → form auto-selects Transport (confidence > 0.85)
USER clicks "Add Expense"
  → ExpenseForm.handleSubmit()
  → expenseAPI.add({...form, amount: parseFloat})  [POST /api/expenses]
  → routes/expenses.js → new Expense({ userId: req.userId, ... }) → mongoose validation → save
  → MongoDB "expenses" collection
  → 201 + document
  → onExpenseAdded(response.data) → Dashboard prepends → ExpenseList renders row
```

### Trace B — "How can I save $500 this month?" (agent chat)

```text
USER sends message
  → AgentChat.handleSendMessage()                  [frontend/src/components/AgentChat.jsx]
  → agentAPI.ask(query)                            [POST /api/agent/ask]
  → routes/agent.js (auth, ≤500 chars)
  → runFinancialAdvisor(userId, query) → new FinancialAdvisorAgent
  → planToolCalls(query)  → keywords "save" → [analyzeSpending, calculateSavingsOpportunities]
  → callTool x2 → agentTools.js → MongoDB queries
  → synthesizeWithAI(query, results) → Groq (temp 0.7, max_tokens 1000)
  → fallbackAnalysis() if the LLM call fails
  → { answer, reasoning[], toolCalls[], data{} }
  → AgentChat renders answer + expandable reasoning/tools
```

### Trace C — Multi-agent analyze (parallel)

```text
USER clicks 🚀 Run Full Analysis
  → MultiAgentPanel.runAnalysis()                  [frontend/src/components/MultiAgentPanel.jsx]
  → multiAgentAPI.analyze()                        [POST /api/multi-agent/analyze]
  → routes/multiAgent.js → new MultiAgentCoordinator(userId)
  → runAllAgents():
      Promise.all([
        budgetAgent.analyzeBudgets(),      → Expense.find (3 mo) → category stats + +15% budget
        savingsAgent.findSavingsOpportunities(), → Expense.find (3 mo) → benchmarks → opportunities
        riskAgent.detectRisks()            → Expense.find (6 mo) → z-scores → anomalies/alerts/risk level
      ])
  → synthesizeFindings(3 reports) → Groq (temp 0.7, max_tokens 1200) → executive summary/priorities/health
      → on failure: return agentFindings + error (graceful)
  → prioritizeActions(synthesis) → critical/high/medium/low buckets
  → MultiAgentPanel renders synthesis, priority columns, agent cards, thinking logs, coordination log
```

---

## 6. Common Confusion Points (and how the instructor should clarify)

1. **"Is this RAG?"** — No. The project docs loosely call context-injection "RAG," but there are **no embeddings and no vector store**. Retrieval here is structured MongoDB queries (agents/tools) and computed statistics passed into prompts. Clarify: RAG = similarity search over text; this app = programmatic grounding. If someone wants true RAG (e.g., embedding past categorized expenses to improve the categorizer), that would be a *new* feature.
2. **JWT vs sessions.** The server stores no session. The token *is* the credential, signed with `JWT_SECRET`. You cannot revoke a token early; expiry is the only escape hatch. Also: the frontend stores it in `localStorage` — XSS could steal it; a hardened app would use httpOnly cookies.
3. **`bcrypt.compare` doesn't decrypt.** Passwords are one-way hashed with a per-user salt. You can't recover the plaintext, and two users with the same password have different hashes.
4. **The Budget model vs. the budget agent mismatch.** The schema stores per-category documents (`category`, `limit`, `month`), but `budgetAgent.js` reads `budgetDoc.budgets` (a field that doesn't exist) and `Budget.findOne({ userId })` (which returns at most one document). The agent's budget-overrun logic is effectively dead. The expense-budget *routes* work correctly. Don't explain this away — name it as a latent bug.
5. **`Promise.all` vs sequential awaits.** The multi-agent speed comes from parallel execution. Sequential `await` calls would triple the runtime. `Promise.all` fails fast — if one agent rejects, all results are lost (here agents catch their own errors and return objects, so this rarely triggers).
6. **The hardcoded API URL vs the Vite proxy.** `api.js` targets `http://localhost:8000/api` directly, so the `/api` proxy in `vite.config.js` is bypassed — which is why the backend needs `cors()`. Both approaches exist in the repo; the proxy is unused in practice.
7. **LLM output is text, not data.** The categorizer parses JSON and validates against the enum; the coordinator regex-extracts the `{...}` block and matches keys case-insensitively; the panel has a plain-text fallback. All three are the same lesson: never trust model output as structured data — validate every field.
8. **Temperature semantics.** 0.3 = deterministic (categorization), 0.7 = varied/natural (chat/synthesis). `max_tokens` is a *ceiling*, not a target length; it caps output, never input.
9. **401 vs 429 vs the placeholder key.** 401 = bad/missing key; 429 = key valid but quota exhausted/billing not set up. Both produce the same visible symptom (synthesis fails, amber notice), but the fix differs (new key vs add billing/credits).
10. **The `ObjectId` comparison.** `expense.userId.toString() !== req.userId.toString()` — never `===` a Mongoose ObjectId with a string directly.
11. **`StrictMode` double effects.** React 18 dev StrictMode runs effects twice on mount — requests may appear twice in DevTools. Not a bug; production is unaffected.
12. **Confidence threshold 0.85 is a product rule, not AI.** The form auto-applies the category only above 85% — a deliberate UX decision in `ExpenseForm.jsx`.
13. **`err.response?.data?.error`.** The optional chaining matters: if the request never reached the server, `err.response` is undefined; without `?.` you'd throw inside the catch.
14. **The quick-question buttons dispatch a synthetic `submit` event** on the form — a working hack, not a pattern to copy.
15. **No tests, no deployment config, dead `date-fns`, stale route comments** — flag all of these as-is (see §2).

---

## 7. Final Demo (complete script for the instructor)

> Setup: fresh account ("demo@example.com"), Mongo running, both servers up, real Groq key configured.

1. **Register + login.** "Watch the token appear — I'll show you it in Application → Local Storage, and we'll see it attached to the next request in DevTools."
2. **Add expenses with AI.** Type "Uber ride" / 12 → 🤖 AI → "Transport, 97%, auto-applied." Add 3–4 more across categories (Netflix → Entertainment, grocery run → Food, electric bill → Utilities). Show each row appearing in Overview.
3. **Analytics.** Open Analytics → pie and bar appear from the 4 expenses; switch to 1 Month; show the two parallel network calls; show the insights (top category, average monthly spend).
4. **Agent chat.** Ask "How can I save money this month?" → show answer + expand "Show Agent Reasoning" (steps) + "Tools Used". Jump into `planToolCalls` on screen and map the keywords.
5. **Multi-agent.** Run Full Analysis → watch the backend console logs stream in parallel → show the synthesis, health score, priority columns, and one agent's thinking log. Open `multiAgentCoordinator.js` and point at the `Promise.all`.
6. **Theme.** Cycle Light → Dark → Black → System; flip OS dark mode and show it follow live.
7. **CSV.** Export; open the file.
8. **Wrap-up.** "Every step we just did — every number, every sentence — came from ten files across two servers, a database, and an LLM API. If you can trace it, you own it."

---

## 8. Extension Exercises (3–5 realistic examples; one walked through fully)

1. **Add a `recurring` (subscription) flag to expenses** — *fully walked through in Chapter 20.* Model field → routes pass-through → form checkbox → list badge. Teaches the "new scalar field" blast radius.
2. **Add a new API endpoint: `GET /api/analytics/trend`** — reuse `getMonthlyTrend` from `agentTools.js` in a route, add an `analyticsAPI.trend()` wrapper, render a line chart. Teaches the route→service→api.js→component slice for *new* endpoints.
3. **Add a new agent to the multi-agent system (e.g., a "Subscriptions Auditor")** — model it on `savingsAgent.js`, register it in `MultiAgentCoordinator`'s constructor, add it to `Promise.all`, add its meta to `MultiAgentPanel`'s `AGENT_META` and to the `/info` route, extend the synthesis prompt. Teaches the "add a specialist" blast radius — the coordinator, panel, and info route all change together.
4. **Add real RAG to the categorizer** — store embeddings of past categorized expenses (e.g., `sqlite-vec` or a hosted vector store), retrieve the most similar examples, append them to the categorizer's system prompt, measure whether accuracy improves. Teaches embeddings + retrieval + prompt augmentation (and why plain grounding isn't RAG).
5. **Turn the 500-character agent-query limit into a chat-history feature** — persist conversations in a new `Conversation` model, add routes, pass `history` into `synthesizeWithAI`'s prompt. Teaches multi-turn memory, which the current agent intentionally lacks (each `ask` is stateless).

---

## 9. Final Cheat Sheet

### Commands
```bash
cd backend  && npm install && npm run dev   # Express on :8000 (nodemon)
cd frontend && npm install && npm run dev   # Vite on :3000
mongosh expense-tracker                      # inspect: users, expenses, budgets
curl -X POST localhost:8000/api/auth/register -H "Content-Type: application/json" -d '{"name":"A","email":"a@b.c","password":"pw"}'
# then use the returned token:  -H "Authorization: Bearer <token>"
```

### Environment variables (backend/.env — never commit; mask on screen)
| Var | Required? | Purpose |
|---|---|---|
| `PORT` | yes | API port (8000) |
| `MONGODB_URI` | yes | connection string (default `mongodb://localhost:27017/expense-tracker`) |
| `JWT_SECRET` | yes | signs login tokens |
| `GROQ_API_KEY` | for AI features | primary AI key (free tier, no card) |
| `OPENAI_API_KEY` | fallback | used if `GROQ_API_KEY` unset |
| `OPENAI_BASE_URL` | optional | provider switch (default: Groq endpoint) |
| `AI_MODEL` | optional | default `llama-3.3-70b-versatile` |
| `NODE_ENV` | optional | present but unused in code |

### Important files → what they do
| File | Role |
|---|---|
| `backend/server.js` | bootstrap: middleware, DB connect, 6 route mounts, listen |
| `backend/middleware/auth.js` | JWT verify → `req.userId` |
| `backend/models/{User,Expense,Budget}.js` | the 3 collections (only data in the app) |
| `backend/routes/*` | HTTP layer: validate → call service → status codes |
| `backend/services/aiClient.js` | the only LLM seam (provider-switchable) |
| `backend/services/aiService.js` | categorizer (temp 0.3) + budget suggester |
| `backend/services/agentTools.js` | 6 DB-analysis tools |
| `backend/services/financialAdvisor.js` | chat agent loop (plan → execute → synthesize → fallback) |
| `backend/agents/*` | 3 specialist agents (stats + AI deep-dives) |
| `backend/services/multiAgentCoordinator.js` | parallel run + synthesis + prioritization |
| `frontend/src/api.js` | axios client + JWT interceptor + all endpoints |
| `frontend/src/App.jsx` | router, auth state, theme state |
| `frontend/src/pages/Dashboard.jsx` | 5 tabs, expense state |
| `frontend/src/components/*` | the 5 feature UIs |

### Key concepts
- **Vertical slice:** route → service → model/LLM → response; the browser never touches DB or LLM directly.
- **Auth:** stateless JWT in `localStorage`, attached by axios interceptor, verified by middleware; ownership via `req.userId`.
- **3 AI patterns:** one-shot call (categorizer) → agent loop with tools (advisor) → parallel agents + coordinator (multi-agent).
- **Graceful degradation:** AI fails → fallback analysis / amber notice / working manual UI. 401 = bad key, 429 = quota.
- **Temperature by feature:** 0.3 deterministic / 0.5–0.6 recommendations / 0.7 conversational.
- **Theming:** CSS tokens in `:root` + `[data-theme]` overrides; `data-dark` gates both dark variants; charts themed in JS.
- **Known quirks:** Budget-model/agent mismatch; dead `date-fns`; unused Vite proxy; stale route comments; no tests.

### How everything connects (one paragraph)
The browser renders React pages that call `api.js`, which attaches the JWT and hits Express on `:8000`. Every route is gated by the auth middleware and validates its input, then delegates to a service: CRUD/analytics services query the three Mongoose models; AI features build prompts and call the shared `aiClient.js` → Groq. The advisor and the three agents compute statistics over the same models and hand results to the LLM for synthesis, always with a code-level fallback. Responses flow back as JSON into React state, which re-renders the UI. To change anything: touch the model if the data changes, the route/`api.js` if the surface changes, the service/agent if the logic changes — and trace the callers to know the blast radius.
