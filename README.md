# 💰 Expense Tracker App

A full-stack MERN (MongoDB, Express, React, Node.js) web application for tracking personal expenses, categorizing spending, setting budgets, and getting savings insights — supercharged with an AI layer: an expense categorizer, a conversational financial advisor, and a multi-agent analysis system.

## 🎯 Features

### Core
- ✅ **User Authentication** — Secure registration and login with JWT
- ✅ **Expense Tracking** — Add, edit, and delete expenses with categories
- ✅ **Category Management** — 8 pre-defined expense categories
- ✅ **Real-time Dashboard** — Total expenses, transaction count, averages
- ✅ **Budget Management** — Set spending limits per category, with overspend warnings
- ✅ **Smart Analytics** — Pie/bar charts, category breakdowns, monthly summaries
- ✅ **Savings Insights** — Recommendations, top spending categories, potential savings
- ✅ **Export Function** — Download expense data as CSV
- ✅ **Responsive Design** — Works on desktop and mobile

### AI-Powered
- ✅ **AI Expense Categorizer** — Suggests a category from an expense description and amount
- ✅ **Financial Advisor Agent** — Ask questions in natural language ("How much did I spend on food last month?") and get answers computed from your own data
- ✅ **Multi-Agent System** — A coordinator orchestrates three specialist agents:
  - **Budget Agent** — budget adherence and overspend risk
  - **Savings Agent** — savings opportunities and recommendations
  - **Risk Agent** — anomaly detection and spending alerts
  - …then synthesizes their reports into an executive summary with priorities, quick wins, and a financial health score
- ✅ **Graceful Degradation** — AI features fall back to locally-computed analysis when the AI provider is unavailable or not configured

## 📦 Tech Stack

**Backend:**
- Node.js & Express.js
- MongoDB (via Mongoose)
- JWT authentication + bcryptjs password hashing
- OpenAI-compatible SDK (default: Groq free endpoint with `openai/gpt-oss-120b`)

**Frontend:**
- React 18 + Vite
- Chart.js / react-chartjs-2 for data visualization
- Axios for API calls
- React Router for navigation
- date-fns for date handling

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or Atlas cloud instance)
- npm

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (or edit the existing one):

```env
# Required
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=any-long-random-string

# Server
PORT=5000

# AI (optional — AI features degrade gracefully without it)
GROQ_API_KEY=your-groq-api-key        # free from console.groq.com
# OPENAI_API_KEY=sk-...               # alternative provider
# OPENAI_BASE_URL=...                 # any OpenAI-compatible endpoint
# AI_MODEL=openai/gpt-oss-120b        # any model the provider serves
```

```bash
npm run dev
# Server runs on http://localhost:5000
```

> The API exits at startup if MongoDB is unreachable. AI features are optional: without a key, the categorizer/advisor/multi-agent endpoints return locally-computed fallbacks instead of erroring.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

The Vite dev server proxies `/api` requests, so no CORS issues. For production builds, set `VITE_API_URL` to your backend URL:

```env
VITE_API_URL=https://your-backend.example.com/api
```

## 📝 Usage Guide

1. **Register/Login** — create an account, or log in with existing credentials
2. **Add Expenses** — enter description, amount, category, and date; click **AI Suggest** in the form to auto-pick the category
3. **View Expenses** — Overview tab: filter, sort, edit, delete, export to CSV
4. **Set Budgets** — Budget tab: assign per-category monthly limits
5. **Analytics & Insights** — charts, monthly summaries, savings recommendations, overspend warnings
6. **Chat with your Advisor** — Agent tab: ask questions about your spending in plain English
7. **Run a Multi-Agent Analysis** — Multi-Agent panel: one click runs all three specialist agents and produces a summary, priorities, quick wins, and a health score

## 🏗️ Project Structure

```
.
├── backend/
│   ├── server.js             # Express app, rate limiting, health check, graceful shutdown
│   ├── routes/               # API endpoints (thin controllers)
│   │   ├── auth.js           #   register / login / me
│   │   ├── expenses.js       #   CRUD + budgets
│   │   ├── analytics.js      #   summaries, breakdowns, CSV export
│   │   ├── ai.js             #   AI categorizer
│   │   ├── agent.js          #   financial advisor agent
│   │   └── multiAgent.js     #   multi-agent orchestration
│   ├── agents/               # budgetAgent, savingsAgent (+ advisor logic)
│   ├── services/             # aiClient (shared provider), financialAdvisor,
│   │   └── multiAgentCoordinator.js
│   ├── models/               # Mongoose schemas
│   ├── middleware/auth.js    # JWT verification
│   └── .env                  # environment variables
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Login, Register, Dashboard
│   │   ├── components/       # ExpenseForm, ExpenseList, BudgetPanel, Analytics,
│   │   │                     # AgentChat, MultiAgentPanel
│   │   ├── api.js            # Axios instance + all API wrappers
│   │   ├── App.jsx           # routing
│   │   └── main.jsx          # entry point
│   └── vite.config.js
│
└── README.md
```

## 📚 Deeper Documentation

- **`BACKEND_ROUTING.md`** — the 6 route groups, all endpoints, JWT middleware, the thin-route pattern, and how to add an endpoint
- **`FRONTEND_ARCHITECTURE.md`** — boot sequence, state & props, the `api.js` network layer, the feature components, and how a click reaches the backend
- **`AI_SETUP_GUIDE.md`** / **`AI_QUICK_START.md`** — AI provider configuration details

## 📊 Expense Categories

- 🍔 Food
- 🚗 Transport
- 🎬 Entertainment
- 💡 Utilities
- 🏥 Healthcare
- 🛍️ Shopping
- 📚 Education
- 📌 Other

## 💡 API Reference

Base URL: `http://localhost:5000/api` — all endpoints except `auth/register` and `auth/login` require `Authorization: Bearer <token>`.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |

### Expenses & Budgets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/expenses` | List expenses (filter/sort via query params) |
| POST | `/api/expenses` | Add expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| POST | `/api/expenses/budget/set` | Set budget for a category |
| GET | `/api/expenses/budget/get` | Get all budgets |
| DELETE | `/api/expenses/budget/:id` | Delete a budget |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/monthly-summary` | Monthly totals (`?year=&month=`) |
| GET | `/api/analytics/category-breakdown` | Spending by category (`?months=`) |
| GET | `/api/analytics/savings-insights` | Savings recommendations (`?months=`) |
| GET | `/api/analytics/export/csv` | CSV export (`?startDate=&endDate=`) |

### AI Categorizer
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/categorize` | Suggest category from description + amount |
| GET | `/api/ai/categories` | List supported categories |
| POST | `/api/ai/test` | Connectivity test |

### Financial Advisor Agent
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/agent/ask` | Ask a natural-language question about your finances |
| GET | `/api/agent/capabilities` | List what the agent can answer |
| POST | `/api/agent/test` | Connectivity test |

### Multi-Agent System
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/multi-agent/analyze` | Run all agents + synthesis |
| GET | `/api/multi-agent/agent/:name` | Run one agent (`budget`, `savings`, `risk`) |
| GET | `/api/multi-agent/status` | Agent availability/config status |
| GET | `/api/multi-agent/health` | Health of the multi-agent pipeline |
| GET | `/api/multi-agent/info` | Public system info (no auth) |
| POST | `/api/multi-agent/test` | Connectivity test |

### Utility
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API welcome message |
| GET | `/health` | Health check incl. DB status |

## 🔐 Security

- Passwords hashed with bcryptjs
- JWT tokens (7-day expiry) for API authentication
- In-memory rate limiting (30 requests / 15 min per IP) on auth endpoints
- Global 401 handling on the frontend clears stale sessions and redirects to login
- JSON-only error responses; no stack traces leaked
- Graceful shutdown on SIGTERM/SIGINT closes MongoDB connections

## 💾 Data Persistence

All data lives in MongoDB:
- User accounts and authentication
- Expense records
- Budget settings
- Full expense history for analytics

## 🎨 Customization

- **Theme colors** — edit `frontend/src/App.css` and component CSS files (primary `#667eea`, secondary `#764ba2`)
- **Add categories** — edit the enum in `backend/models/Expense.js` and the options in `frontend/src/components/ExpenseForm.jsx`
- **Budget logic** — `backend/routes/expenses.js`
- **Switch AI provider** — everything routes through `backend/services/aiClient.js`; change `OPENAI_BASE_URL` / `AI_MODEL` env vars, no code changes needed

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| MongoDB connection error | Ensure MongoDB is running (`mongod`), or update `MONGODB_URI` for Atlas |
| CORS issues | The Vite proxy handles this in dev — make sure backend is running |
| Backend port busy | Change `PORT` in `backend/.env` |
| Frontend port busy | Change `port` in `frontend/vite.config.js` |
| AI features return generic answers | No API key configured, or provider down — check `GROQ_API_KEY`; local fallbacks are still returned |
| 429 Too many attempts | Auth rate limit hit (30/15 min per IP) — wait and retry |

## 📈 Future Enhancements

- [ ] Recurring expense tracking
- [ ] Multiple user support (family/couples)
- [ ] Push notifications for budget alerts
- [ ] Mobile app version
- [ ] Advanced filtering and search
- [ ] Expense forecasting
- [ ] Integration with banking APIs

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Support

For issues or suggestions, feel free to open an issue or contact the development team.

---

**Happy Tracking! 🎉 Start managing your finances smartly today!**
