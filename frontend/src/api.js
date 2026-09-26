import axios from 'axios';

// Use the Vite dev proxy in development (avoids CORS issues entirely);
// fall back to an explicit URL for production builds.
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // AI endpoints can take a while
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handling: clear stale session and return to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loops on the auth pages themselves
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** Normalize API errors into a human-readable message */
export const getErrorMessage = (err, fallback = 'Something went wrong') => {
  if (err?.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (!err.response) return 'Cannot reach the server. Is the backend running?';
  return err.response.data?.error || err.response.data?.message || fallback;
};

export const authAPI = {
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  add: (expense) => api.post('/expenses', expense),
  update: (id, expense) => api.put(`/expenses/${id}`, expense),
  delete: (id) => api.delete(`/expenses/${id}`),
  setBudget: (budget) => api.post('/expenses/budget/set', budget),
  getBudgets: () => api.get('/expenses/budget/get'),
  deleteBudget: (id) => api.delete(`/expenses/budget/${id}`),
};

export const analyticsAPI = {
  getMonthlySummary: (year, month) => api.get('/analytics/monthly-summary', { params: { year, month } }),
  getCategoryBreakdown: (months) => api.get('/analytics/category-breakdown', { params: { months } }),
  getSavingsInsights: (months) => api.get('/analytics/savings-insights', { params: { months } }),
  // NOTE: responseType must be 'blob' for file downloads to work
  exportCSV: (startDate, endDate) =>
    api.get('/analytics/export/csv', { params: { startDate, endDate }, responseType: 'blob' }),
};

// AI Agent API endpoints
export const aiAPI = {
  categorizeExpense: (description, amount) => api.post('/ai/categorize', { description, amount }),
  getCategories: () => api.get('/ai/categories'),
  testAI: () => api.post('/ai/test'),
};

// Financial Advisor Agent API endpoints
export const agentAPI = {
  ask: (query) => api.post('/agent/ask', { query }),
  getCapabilities: () => api.get('/agent/capabilities'),
  test: () => api.post('/agent/test'),
};

// Multi-Agent System API endpoints
export const multiAgentAPI = {
  analyze: () => api.post('/multi-agent/analyze'),
  getAgent: (agentName) => api.get(`/multi-agent/agent/${agentName}`),
  getStatus: () => api.get('/multi-agent/status'),
  getHealth: () => api.get('/multi-agent/health'),
  getInfo: () => api.get('/multi-agent/info'),
  test: () => api.post('/multi-agent/test'),
};

export default api;
