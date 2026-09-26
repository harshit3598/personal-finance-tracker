# Backend Routing — How Requests Reach Your Code

A complete map of how HTTP requests flow through the Express backend: from the URL the
browser hits, through `server.js`, into a route file, and down to the models/services/agents.

---

## 1. The Big Picture

```text
Browser / Postman / curl
        │  HTTP request (JSON)
        ▼
backend/server.js  ── Express app, listens on PORT (8000 in .env)
        │  app.use('/api/<group>', router)  ← mounts 6 routers, strips the prefix
        ▼
backend/routes/<group>.js   ── express.Router()
        │  each handler: (req, res) → validate → delegate → respond
        ├──► auth middleware (JWT check) on protected routes → req.userId
        ▼
models/  services/  agents/   ── the actual work (DB queries, AI calls)
        │  JSON response
        ▼
  back to the browser
```

**Key idea:** a route file never contains business logic. It is a thin HTTP adapter:
parse input → call something → shape the JSON reply. That keeps every handler 5–15 lines.

---

## 2. How a Router Gets Mounted (`backend/server.js`)

```js
app.use('/api/auth', require('./routes/auth'));         // auth.js
app.use('/api/expenses', require('./routes/expenses')); // expenses.js
app.use('/api/analytics', require('./routes/analytics')); // analytics.js
app.use('/api/ai', require('./routes/ai'));             // ai.js
app.use('/api/agent', require('./routes/agent'));       // agent.js
app.use('/api/multi-agent', require('./routes/multiAgent')); // multiAgent.js
```

- `app.use('/api/auth', router)` means **every URL starting with `/api/auth`** is delegated
  to that router, and Express **strips the `/api/auth` prefix** before matching.
  So `POST /api/auth/register` becomes `POST /register` *inside* `auth.js`.
- The three middleware lines above the mounts do global work for every request:
  - `app.use(cors())` — lets the React app on `:3000` call this API
  - `app.use(express.json())` — parses JSON request bodies into `req.body`
- There is also a bare `GET /` route that returns `{ message: 'Expense Tracker API is running 🚀' }`.

---

## 3. The 6 Route Groups — Complete Endpoint Table

Legend: 🔓 public (no auth) · 🔒 requires JWT (auth middleware) · `req.query` = URL query string · `:param` = URL path segment

### 3.1 `routes/auth.js` — authentication
| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/api/auth/register` | 🔓 | Validates name/email/password, rejects duplicate email (400), bcrypt-hashes password, saves user, signs a 7-day JWT → `201 { token, user }` |
| POST | `/api/auth/login` | 🔓 | Finds user by email, `bcrypt.compare` password, signs a 7-day JWT → `{ token, user }`, or `401 Invalid credentials` |
| GET | `/api/auth/me` | 🔒 | Looks up the user via `req.userId`, returns it **without** the password hash (`.select('-password')`) |

### 3.2 `routes/expenses.js` — expenses CRUD + budgets
| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/expenses` | 🔒 | Lists the user's expenses, newest first. Optional `req.query`: `category`, `startDate`, `endDate` (both dates → a `$gte`/`$lte` range) |
| POST | `/api/expenses` | 🔒 | Creates an expense from `req.body` (description, amount, category, optional date/notes). **Always forces `userId: req.userId`** — you can't create an expense for someone else |
| PUT | `/api/expenses/:id` | 🔒 | Loads the expense, **ownership check** (`expense.userId.toString() !== req.userId.toString()` → 403), then `Object.assign` + save |
| DELETE | `/api/expenses/:id` | 🔒 | Same ownership check (403), then `findByIdAndDelete` |
| POST | `/api/expenses/budget/set` | 🔒 | Upserts a budget keyed by `{ userId, category, month }` (month = `YYYY-MM`) |
| GET | `/api/expenses/budget/get` | 🔒 | Returns all of the user's budgets |

### 3.3 `routes/analytics.js` — summaries & export
| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/analytics/monthly-summary` | 🔒 | `req.query.year/month` (defaults to now) → totals per category + grand total for that month |
| GET | `/api/analytics/category-breakdown` | 🔒 | `req.query.months` (default 1) → total spent per category over the window |
| GET | `/api/analytics/savings-insights` | 🔒 | `req.query.months` (default 3) → budget overruns (warnings), top 3 categories, average monthly spend, a "reduce by 10%" savings opportunity |
| GET | `/api/analytics/export/csv` | 🔒 | `req.query.startDate/endDate` → builds a CSV string, sets `Content-Disposition: attachment` so the browser downloads `expenses.csv` |

### 3.4 `routes/ai.js` — AI expense categorizer
| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/api/ai/categorize` | 🔒 | Validates `description` + `amount` (400), calls `categorizeExpense()` in `services/aiService.js` → `{ success, data: { category, confidence, reasoning } }` |
| GET | `/api/ai/categories` | 🔓 | Static list of the 8 allowed categories (`EXPENSE_CATEGORIES`) |
| POST | `/api/ai/test` | 🔒 | Smoke-tests the AI service with a sample expense |

### 3.5 `routes/agent.js` — financial advisor chat agent
| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/api/agent/ask` | 🔒 | Validates `query` (non-empty, **≤ 500 chars** → 400), calls `runFinancialAdvisor(userId, query)` → `{ success, data: { answer, reasoning[], toolCalls[], data{} } }` |
| GET | `/api/agent/capabilities` | 🔓 | Static capability list + example questions (no DB work) |
| POST | `/api/agent/test` | 🔒 | Runs the advisor on a sample question |

### 3.6 `routes/multiAgent.js` — multi-agent system
| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/api/multi-agent/analyze` | 🔒 | `new MultiAgentCoordinator(req.userId).runAllAgents()` → runs budget/savings/risk agents **in parallel**, synthesizes → `{ success, data }` |
| GET | `/api/multi-agent/agent/:name` | 🔒 | Runs one agent by name (`budget`, `savings`, `risk`) via `coordinator.getAgentInsight(name)` |
| GET | `/api/multi-agent/status` | 🔒 | `coordinator.getAgentStatus()` — agent names, specialties, recent thinking logs |
| GET | `/api/multi-agent/health` | 🔒 | `coordinator.healthCheck()` — healthy / degraded / error |
| GET | `/api/multi-agent/info` | 🔓 | Static system info: 3 agents, specialties, how-it-works steps |
| POST | `/api/multi-agent/test` | 🔒 | Health check + pointer to run the full analysis |

**Totals:** 6 routers · 25 endpoints · 19 protected 🔒 · 6 public 🔓

---

## 4. The Routing Mechanics

### 4.1 Router creation (same pattern in every file)

```js
const express = require('express');
const router = express.Router();          // a mini-app that only handles routes
// ... route definitions ...
module.exports = router;                  // what server.js requires
```

### 4.2 Middleware is per-route

The `auth` middleware is passed as the **second argument** of each protected handler:

```js
router.get('/me', auth, async (req, res) => { ... });
//              ^^^^ runs BEFORE the handler:
//                   1. reads Authorization: Bearer <token>
//                   2. jwt.verify(token, JWT_SECRET)
//                   3. req.userId = decoded.userId  → available in the handler
//                   4. on failure: responds 401 and never reaches the handler
```

Three things flow from this:
- Handlers read the logged-in user as `req.userId` — every query filters by it.
- Public routes (`/register`, `/login`, `/categories`, `/capabilities`, `/info`) simply omit `auth`.
- **Auth is opt-in per route**, not global — that's why it's listed per endpoint above.

### 4.3 Where data comes from inside a handler

| Source | Accessor | Example |
|---|---|---|
| URL path segment | `req.params` | `PUT /api/expenses/abc123` → `req.params.id` = `"abc123"` |
| Query string | `req.query` | `GET /api/analytics/category-breakdown?months=3` → `req.query.months` = `"3"` |
| JSON body | `req.body` | `POST /api/expenses` → `req.body.description` (needs `express.json()`) |
| Auth middleware | `req.userId` | the verified user's `_id` (string) |

### 4.4 Route matching order matters

Express matches routes **in the order they're defined**, by method + path. In `expenses.js`
the param routes (`PUT /:id`, `DELETE /:id`) are defined **before** `/budget/set` and
`/budget/get`. That works today because the budget routes use `POST`/`GET` while `/:id`
routes use `PUT`/`DELETE` — no method collision.

⚠️ **Gotcha for future changes:** if you add a `GET /:id` route, define it **after**
`GET /budget/get`, otherwise `GET /api/expenses/budget/get` would match `/:id` with
`id = "budget"` and break. Same rule applies in any router: literal paths before param paths.

### 4.5 Error handling — the per-route try/catch pattern

There is no central Express error handler; every handler wraps its work:

```js
router.post('/', auth, async (req, res) => {
  try {
    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Please provide description, amount, and category' });
    }
    const expense = await Expense.create({ ...req.body, userId: req.userId });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });   // anything unexpected → 500
  }
});
```

### 4.6 Status codes used across the API

| Code | Meaning | Where |
|---|---|---|
| 200 | OK (default) | most successful GETs/PUTs |
| 201 | Created | `POST /register`, `POST /expenses`, `POST /budget/set` |
| 400 | Bad request — missing/invalid input | validation checks in every router |
| 401 | Not authenticated / bad token | `auth` middleware, login failure |
| 403 | Authenticated but not the owner | `PUT`/`DELETE /expenses/:id` ownership check |
| 500 | Server error | every `catch` block |

---

## 5. The Thin-Route Pattern (what every handler does)

Every handler follows the same 4 steps — if you understand one, you understand all 25:

1. **Extract input** from `req.body` / `req.query` / `req.params`
2. **Validate** — return `400` early on bad input
3. **Delegate** — call a model, service, or agent (the only place "thinking" happens)
4. **Respond** — `res.json(...)` / `res.status(201).json(...)` / CSV headers

```text
routes/ai.js ──────► services/aiService.js ──────► services/aiClient.js ──► Groq API
routes/agent.js ───► services/financialAdvisor.js ─► services/agentTools.js ─► MongoDB
routes/multiAgent.js ► services/multiAgentCoordinator.js ► agents/budgetAgent.js ─► MongoDB
                                                      ► agents/savingsAgent.js ─► MongoDB
                                                      ► agents/riskAgent.js    ─► MongoDB
routes/expenses.js ─► models/Expense.js ─► MongoDB            (routes never query the DB directly)
routes/analytics.js ► models/Expense.js · Budget.js ─► MongoDB (same — thin routes)
```

---

## 6. How the Frontend Reaches These Routes

The React app never writes raw URLs. It goes through `frontend/src/api.js`, which has
one wrapper per endpoint (e.g. `expenseAPI.add`, `aiAPI.categorizeExpense`,
`multiAgentAPI.analyze`). The axios instance:

```js
const api = axios.create({ baseURL: 'http://localhost:8000/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;   // feeds the auth middleware
  return config;
});
```

So `multiAgentAPI.analyze()` → `POST http://localhost:8000/api/multi-agent/analyze`
→ matches the `multiAgent` router → `auth` middleware → handler.

---

## 7. Adding a New Route (recipe)

To add e.g. `GET /api/analytics/trend`:

1. **Pick the right router** — `routes/analytics.js` fits; create a new file under
   `backend/routes/` only for a new feature group.
2. **Add the handler** — thin route pattern, `auth` middleware, try/catch:
   ```js
   router.get('/trend', auth, async (req, res) => {
     try {
       const data = await SomeService.computeTrend(req.userId, req.query.months);
       res.json(data);
     } catch (err) {
       res.status(500).json({ error: err.message });
     }
   });
   ```
3. **Mount it** — only if you created a new router file: add
   `app.use('/api/<group>', require('./routes/<file>'))` in `server.js`.
4. **Expose it to the frontend** — add a wrapper in `frontend/src/api.js`.
5. **Restart the backend** — nodemon picks up route files automatically (it watches
   `backend/`), so a restart is only needed after changing `server.js` or `.env`.

---

## 8. Quick Reference — Request Flow for One Endpoint

`POST /api/agent/ask` with body `{ "query": "How can I save $500?" }`

```text
1. express.json()          → req.body = { query: "..." }
2. app.use('/api/agent')   → routes/agent.js, path now "/ask"
3. router.post('/ask', auth, ...)
     auth middleware       → Authorization header verified → req.userId set
4. handler: validate query (non-empty, ≤ 500 chars)
5. runFinancialAdvisor(req.userId, query)   → plans tools, queries MongoDB, calls Groq
6. res.json({ success: true, data: result })
7. axios in the browser receives it → AgentChat renders the answer
```
