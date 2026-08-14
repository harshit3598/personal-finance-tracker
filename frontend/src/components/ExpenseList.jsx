import React, { useState } from 'react';
import { expenseAPI, analyticsAPI } from '../api';
import './Components.css';

function ExpenseList({ expenses, onDelete, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [loading, setLoading] = useState(false);

  const filteredExpenses = filter === 'all' 
    ? expenses 
    : expenses.filter(exp => exp.category === filter);

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date) - new Date(a.date);
    } else if (sortBy === 'amount') {
      return b.amount - a.amount;
    } else if (sortBy === 'category') {
      return a.category.localeCompare(b.category);
    }
    return 0;
  });

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await expenseAPI.delete(id);
        onDelete(id);
      } catch (err) {
        alert('Failed to delete expense: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const blob = await analyticsAPI.exportCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert('Failed to export: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(expenses.map(exp => exp.category))];

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>Expenses</h2>
        <button onClick={handleExportCSV} className="export-btn" disabled={loading}>
          📥 {loading ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="list-controls">
        <div className="control-group">
          <label>Filter by Category:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Most Recent</option>
            <option value="amount">Highest Amount</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>

      {sortedExpenses.length === 0 ? (
        <div className="empty-state">
          <p>No expenses found. Start adding expenses to track your spending! 📊</p>
        </div>
      ) : (
        <div className="expenses-table">
          <div className="table-header">
            <div className="col date">Date</div>
            <div className="col description">Description</div>
            <div className="col category">Category</div>
            <div className="col amount">Amount</div>
            <div className="col action">Action</div>
          </div>
          {sortedExpenses.map(expense => (
            <div key={expense._id} className="table-row">
              <div className="col date">
                {new Date(expense.date).toLocaleDateString()}
              </div>
              <div className="col description">{expense.description}</div>
              <div className="col category">
                <span className="category-badge">{expense.category}</span>
              </div>
              <div className="col amount">${expense.amount.toFixed(2)}</div>
              <div className="col action">
                <button onClick={() => handleDelete(expense._id)} className="delete-btn">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="list-summary">
        <p>Total: <strong>${sortedExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</strong></p>
      </div>
    </div>
  );
}

export default ExpenseList;
