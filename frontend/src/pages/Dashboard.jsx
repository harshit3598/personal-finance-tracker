import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, analyticsAPI } from '../api';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';
import Analytics from '../components/Analytics';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getAll();
      setExpenses(response.data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = (newExpense) => {
    setExpenses([newExpense, ...expenses]);
  };

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(exp => exp._id !== id));
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>💰 Expense Tracker</h1>
          <p>Welcome, {user?.name}!</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Expenses</h3>
          <p className="stat-value">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <p className="stat-value">{expenses.length}</p>
        </div>
        <div className="stat-card">
          <h3>Average Expense</h3>
          <p className="stat-value">${expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0.00'}</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Add Expense
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <ExpenseList 
            expenses={expenses} 
            onDelete={handleDeleteExpense}
            onRefresh={loadExpenses}
          />
        )}
        {activeTab === 'add' && (
          <ExpenseForm onExpenseAdded={handleAddExpense} />
        )}
        {activeTab === 'analytics' && (
          <Analytics expenses={expenses} />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
