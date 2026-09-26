import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, analyticsAPI, getErrorMessage } from '../api';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';
import Analytics from '../components/Analytics';
import AgentChat from '../components/AgentChat';
import MultiAgentPanel from '../components/MultiAgentPanel';
import BudgetPanel from '../components/BudgetPanel';
import './Dashboard.css';

/* ---------------- Toast system ---------------- */
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{t.type === 'error' ? '⚠️' : t.type === 'info' ? 'ℹ️' : '✅'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------------- Stat card ---------------- */
function StatCard({ label, value, hint, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon" aria-hidden="true">{icon}</span>
        <h3>{label}</h3>
      </div>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}

function DashboardInner({ user, onLogout, theme, themeLabel, onToggleTheme }) {
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const addToast = useToast();

  const loadExpenses = useCallback(async () => {
    setExpensesError('');
    setExpensesLoading(true);
    try {
      const response = await expenseAPI.getAll();
      setExpenses(response.data);
    } catch (err) {
      setExpensesError(getErrorMessage(err, 'Failed to load expenses'));
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleAddExpense = (newExpense) => {
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const handleUpdateExpense = (updated) => {
    setExpenses((prev) => prev.map((exp) => (exp._id === updated._id ? updated : exp)));
  };

  const handleDeleteExpense = (id) => {
    setExpenses((prev) => prev.filter((exp) => exp._id !== id));
  };

  const handleLogout = () => {
    if (window.confirm('Log out of Expense Tracker?')) {
      onLogout();
      navigate('/login', { replace: true });
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await analyticsAPI.exportCSV();
      const url = window.URL.createObjectURL(blob.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('Expenses exported as CSV');
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to export CSV'), 'error');
    }
  };

  // Stats scoped to the current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthExpenses = expenses.filter((e) => new Date(e.date) >= monthStart);
  const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalAll = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = expenses.length > 0 ? totalAll / expenses.length : 0;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'add', label: 'Add Expense' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'agent', label: '🤖 AI Advisor' },
    { id: 'multiAgent', label: '🕸️ Multi-Agent' },
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>💰 Expense Tracker</h1>
          <p>
            Welcome back, <strong>{user?.name || 'friend'}</strong> — here's your month at a glance.
          </p>
        </div>
        <div className="header-actions">
          <button onClick={onToggleTheme} className="theme-toggle-btn" title="Theme: Light → Dark → Black → System">
            {themeLabel}
          </button>
          <button onClick={handleExportCSV} className="ghost-btn" title="Download all expenses as CSV">
            ⬇ Export
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-stats">
        <StatCard
          icon="📅"
          label="This Month"
          value={`$${monthTotal.toFixed(2)}`}
          hint={`${monthExpenses.length} transaction${monthExpenses.length === 1 ? '' : 's'}`}
        />
        <StatCard
          icon="🧾"
          label="All-Time Total"
          value={`$${totalAll.toFixed(2)}`}
          hint={`${expenses.length} transaction${expenses.length === 1 ? '' : 's'}`}
        />
        <StatCard icon="📊" label="Average Expense" value={`$${avgExpense.toFixed(2)}`} hint="Per transaction" />
      </div>

      <nav className="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="dashboard-content">
        {activeTab === 'overview' && (
          expensesLoading ? (
            <div className="loading-panel" role="status">
              <div className="spinner" />
              <p>Loading your expenses…</p>
            </div>
          ) : expensesError ? (
            <div className="error-panel" role="alert">
              <p>⚠️ {expensesError}</p>
              <button onClick={loadExpenses} className="primary-btn">
                Try Again
              </button>
            </div>
          ) : (
            <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} onRefresh={loadExpenses} />
          )
        )}

        {activeTab === 'add' && <ExpenseForm onExpenseAdded={handleAddExpense} />}

        {activeTab === 'budgets' && <BudgetPanel expenses={expenses} />}

        {activeTab === 'analytics' && <Analytics expenses={expenses} theme={theme} />}

        {activeTab === 'agent' && <AgentChat />}

        {activeTab === 'multiAgent' && <MultiAgentPanel />}
      </main>
    </div>
  );
}

function Dashboard(props) {
  return (
    <ToastProvider>
      <DashboardInner {...props} />
    </ToastProvider>
  );
}

export default Dashboard;
