import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
};

export const analyticsAPI = {
  getMonthlySummary: (year, month) => api.get('/analytics/monthly-summary', { params: { year, month } }),
  getCategoryBreakdown: (months) => api.get('/analytics/category-breakdown', { params: { months } }),
  getSavingsInsights: (months) => api.get('/analytics/savings-insights', { params: { months } }),
  exportCSV: (startDate, endDate) => api.get('/analytics/export/csv', { params: { startDate, endDate }, responseType: 'blob' }),
};

export default api;
