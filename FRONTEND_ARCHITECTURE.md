# Frontend Architecture — How the UI Works

A complete map of the React side: how the app boots, how state is held, how every
button reaches the backend, and how the response gets back on screen.

---

## 1. The Big Picture

```text
index.html
   └─ main.jsx          ReactDOM.createRoot(#root).render(<App/>)
        └─ App.jsx      ★ Router + auth state + theme state (the top of the world)
             ├─ /login        → Login.jsx
             ├─ /register     → Register.jsx
             └─ /dashboard    → Dashboard.jsx   (protected: redirects to /login)
                  └─ 5 tabs (local state: expenses, activeTab)
                       ├─ Overview        → ExpenseList.jsx
                       ├─ Add Expense     → ExpenseForm.jsx
                       ├─ Analytics       → Analytics.jsx
                       ├─ 🤖 AI Agent     → AgentChat.jsx
                       └─ 🕸️ Multi-Agent  → MultiAgentPanel.jsx
                                │
                                ▼
                            api.js   ★ the ONLY file that talks to the backend
                                │  axios + JWT interceptor
                                ▼
                    Express API on http://localhost:8000/api
```

**Key ideas:**
- There is **no global state library** (no Redux/Context for data). State lives where it's
  needed: auth + theme at the top (`App.jsx`), expense data in `Dashboard.jsx`, chat
  messages in `AgentChat.jsx`. Data flows **down via props**, events flow **up via callbacks**.
- **`api.js` is the only file that performs HTTP.** Components never call `axios` or
  `fetch` directly — they call wrapper functions (`expenseAPI.add`, `aiAPI.categorizeExpense`, …).
- The backend URL is hardcoded (`http://localhost:8000/api`), so the Vite proxy in
  `vite.config.js` is effectively unused for real requests — the JWT interceptor + backend
  CORS make direct calls work.

---

## 2. Boot Sequence (main.jsx → App.jsx)

**`src/main.jsx`** — the entry point. Three lines:

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
);
```

`<React.StrictMode>` double-invokes effects in dev (that's why a request can appear twice
in DevTools — it's not a bug; production is unaffected).

**`src/App.jsx`** — owns three things:

| Concern | How | Why it lives here |
|---|---|---|
| **Routing** | `BrowserRouter` + `<Routes>` with `/login`, `/register`, `/dashboard`, and a `/` redirect | The 3 pages must swap without a reload |
| **Auth state** | `isAuthenticated` (from `localStorage.getItem('token')`), `user`; `handleLogin(token, user)` and `handleLogout()` persist/clear `localStorage` | Every page needs to know if the user is logged in; the token must survive refresh |
| **Theme state** | `themePref` ∈ `light \| dark \| black \| system`; resolves `system` via `matchMedia('(prefers-color-scheme: dark)')` with a live listener; applies `data-theme` + `data-dark` attributes to `<html>` | Theming is global — it must live above every page |

The guard: the `/dashboard` route renders `<Navigate to="/login" />` when
`isAuthenticated` is false. Callbacks are threaded down:
`<Dashboard onLogout={handleLogout} themeLabel={...} onToggleTheme={toggleTheme} />`.

---

## 3. The Network Layer — `src/api.js`

The frontend's "server.js". One axios instance + interceptor + one wrapper per endpoint:

```js
const api = axios.create({ baseURL: 'http://localhost:8000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;   // JWT on EVERY request
  return config;
});
```

| Export | Backend router it talks to | Example wrappers |
|---|---|---|
| `authAPI` | `/api/auth` | `register()`, `login()`, `getMe()` |
| `expenseAPI` | `/api/expenses` | `getAll()`, `add()`, `update()`, `delete()`, `setBudget()`, `getBudgets()` |
| `analyticsAPI` | `/api/analytics` | `getMonthlySummary()`, `getCategoryBreakdown()`, `getSavingsInsights()`, `exportCSV()` |
| `aiAPI` | `/api/ai` | `categorizeExpense()`, `getCategories()`, `testAI()` |
| `agentAPI` | `/api/agent` | `ask()`, `getCapabilities()`, `test()` |
| `multiAgentAPI` | `/api/multi-agent` | `analyze()`, `getAgent()`, `getStatus()`, `getHealth()`, `getInfo()`, `test()` |

**Convention:** add one wrapper here for every new backend endpoint, then call that
wrapper from the component — never the raw URL.

---

## 4. Pages (`src/pages/`)

### Login.jsx / Register.jsx
- Controlled forms → `authAPI.login(email, password)` / `authAPI.register(name, email, password)`
- On success, call `onLogin(token, user)` (passed from `App.jsx`) which stores them in
  `localStorage` and flips `isAuthenticated` → React Router navigates to `/dashboard`
- Register has a client-side confirm-password check before submitting
- Both render a floating theme-toggle button (top-right)

### Dashboard.jsx — the shell with 5 tabs
```jsx
const [activeTab, setActiveTab] = useState('overview');
const [expenses, setExpenses] = useState([]);
const [loading, setLoading] = useState(true);
```
- On mount: `expenseAPI.getAll()` → `setExpenses(...)`
- The tab bar is five `<button>`s; the content area renders one component based on
  `activeTab`
- **The shared state:** `expenses` is fetched here and passed down to `ExpenseList`
  (and re-fetched after `ExpenseForm` adds one, via `onExpenseAdded` → `loadExpenses()`).
  That's why a new expense appears in Overview instantly.

---

## 5. The 5 Feature Components (`src/components/`)

### ExpenseForm.jsx — add expense + 🤖 AI
- `handleSubmit` → `expenseAPI.add({...form, amount: parseFloat})` → `onExpenseAdded(resp.data)` → Dashboard reloads → `success` banner
- `handleAICategorize` → `aiAPI.categorizeExpense(description, amount)`:
  - Shows the suggestion box with category + confidence + reasoning
  - **Auto-applies the category only when `confidence > 0.85`** (a product rule, not an AI rule)
  - Disables the button + shows "🤖 Thinking..." while loading
  - Graceful errors: shows "Failed to get AI suggestion…" instead of crashing

### ExpenseList.jsx — the Overview table
- Filters by category, sorts by date/amount/category, deletes rows (`expenseAPI.delete`)
- CSV export button downloads the blob from `analyticsAPI.exportCSV()` (axios
  `responseType: 'blob'` → create an object URL → trigger download)

### Analytics.jsx — charts + insights
- `useEffect` per time range → fires `getMonthlySummary()` and `getCategoryBreakdown()`
  **in parallel** (`Promise.all`) → Chart.js pie + bar via `react-chartjs-2`
- **Theme-aware charts:** tick/grid colors and slice borders are chosen from the current
  theme (`theme` prop: `dark`/`black` count as dark) — otherwise Chart.js's default gray
  ticks become invisible on dark backgrounds
- Renders savings insights from `getSavingsInsights()`

### AgentChat.jsx — chat with the Financial Advisor
- Local `messages` array; `handleSendMessage` → `agentAPI.ask(query)` (input capped at
  500 chars, matching the backend limit) → appends the agent's `answer` plus expandable
  `reasoning[]` ("Show Agent Reasoning") and `toolCalls[]` ("Tools Used")
- Fetches `agentAPI.getCapabilities()` on mount to show example questions
- ⚠️ The "Try asking" quick buttons set the input value then **dispatch a synthetic
  `submit` event** on the form (`new Event('submit', { bubbles: true })`) to auto-send —
  a working hack, not a pattern to copy

### MultiAgentPanel.jsx — the multi-agent dashboard
- "🚀 Run Full Analysis" → `multiAgentAPI.analyze()` → renders:
  - The AI **synthesis** (executive summary, health score, priorities)
  - **Priority columns** (critical/high/medium/low)
  - **Agent cards** (budget 💰 / savings 🏦 / risk 🚨) with their reports + expandable thinking logs
- Graceful degradation: if the synthesis step fails (bad/missing API key, quota), it
  shows an amber notice — the per-agent statistical reports still render

---

## 6. How State Moves (the render cycle)

```text
User clicks 🤖 AI  (ExpenseForm)
   │  setAiLoading(true)  →  button shows "🤖 Thinking..."
   ▼
aiAPI.categorizeExpense("Uber ride", 12)
   │  axios attaches JWT → POST http://localhost:8000/api/ai/categorize
   ▼
backend: auth → routes/ai.js → aiService → Groq
   ▼
response.data.data = { category: "Transport", confidence: 0.97, reasoning: "..." }
   │  setAiSuggestion(response.data.data)      ← state update
   │  confidence 0.97 > 0.85 → setForm({...prev, category: "Transport"})
   ▼
React re-renders → category dropdown shows Transport + green suggestion box
```

This is the pattern for every feature:
**event handler → api.js wrapper → backend → `setState` → re-render.**

---

## 7. Theming (App.css)

- **Design tokens:** `:root` defines the light palette as CSS variables
  (`--bg`, `--card`, `--text`, `--primary`, …); `[data-theme="dark"]` and
  `[data-theme="black"]` override them (black = pure `#000` surfaces)
- **Gating:** a `data-dark` attribute on `<html>` activates one shared block of dark
  override rules for both dark variants — `[data-theme="dark"]` selector always wins over
  plain component selectors, so light mode is untouched
- **The toggle** in the Dashboard header and on auth pages **cycles**
  `light → dark → black → system → light` and shows the current mode
- **Persistence:** the preference is saved to `localStorage` (`theme` key) so it survives reloads

---

## 8. Adding a New UI Feature (recipe)

Say you add `GET /api/analytics/trend` (backend done, see `BACKEND_ROUTING.md` §7):

1. **`src/api.js`** — add the wrapper:
   ```js
   export const analyticsAPI = { ..., trend: (months) => api.get('/analytics/trend', { params: { months } }) };
   ```
2. **Component** — fetch in `useEffect`, store in state, render:
   ```jsx
   const [trend, setTrend] = useState(null);
   useEffect(() => { analyticsAPI.trend(6).then(r => setTrend(r.data)); }, []);
   ```
3. **Wire it in** — either render it inside an existing component or add a new tab in
   `Dashboard.jsx` (new button + `{activeTab === 'x' && <Component/>}`)
4. Follow the render cycle: handler → wrapper → state → re-render. Done.

---

## 9. Quick Reference

| File | Role |
|---|---|
| `src/main.jsx` | mounts React into `#root` |
| `src/App.jsx` | router, auth state, theme state, route guard |
| `src/api.js` | axios + JWT interceptor + every endpoint wrapper |
| `src/pages/Login.jsx` / `Register.jsx` | auth forms → token → `onLogin` |
| `src/pages/Dashboard.jsx` | 5 tabs + shared `expenses` state |
| `src/components/ExpenseForm.jsx` | add expense + 🤖 AI (auto-apply > 85%) |
| `src/components/ExpenseList.jsx` | table, filter, sort, delete, CSV |
| `src/components/Analytics.jsx` | Chart.js, theme-aware, savings insights |
| `src/components/AgentChat.jsx` | advisor chat + expandable reasoning/tools |
| `src/components/MultiAgentPanel.jsx` | multi-agent analysis UI |
| `src/App.css` | design tokens + dark/black overrides |

**The golden rule:** components render, `api.js` talks, state updates re-render.
If you can trace one button click end-to-end, you can trace them all.
