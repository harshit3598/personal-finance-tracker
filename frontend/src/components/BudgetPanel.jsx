import React, { useState, useEffect, useCallback } from 'react';
import { expenseAPI, getErrorMessage } from '../api';
import { useToast } from '../pages/Dashboard';
import './Components.css';

const ALL_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Education', 'Other'];

/**
 * Budget panel: set/update monthly budgets per category, see progress
 * against this month's spending, and delete budgets.
 */
function BudgetPanel() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ category: 'Food', limit: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLimit, setEditLimit] = useState('');
  const addToast = useToast();

  const loadBudgets = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const response = await expenseAPI.getBudgets();
      setBudgets(response.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load budgets'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleSetBudget = async (e) => {
    e.preventDefault();
    const limit = parseFloat(form.limit);
    if (isNaN(limit) || limit <= 0) {
      addToast('Please enter a valid positive limit', 'error');
      return;
    }
    setSaving(true);
    try {
      await expenseAPI.setBudget({ category: form.category, limit });
      addToast(`${form.category} budget set to $${limit.toFixed(2)}/month`);
      setForm({ category: form.category, limit: '' });
      await loadBudgets();
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to set budget'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id) => {
    const limit = parseFloat(editLimit);
    if (isNaN(limit) || limit <= 0) {
      addToast('Please enter a valid positive limit', 'error');
      return;
    }
    try {
      await expenseAPI.setBudget({ category: budgets.find((b) => b._id === id).category, limit });
      addToast('Budget updated');
      setEditingId(null);
      await loadBudgets();
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to update budget'), 'error');
    }
  };

  const handleDelete = async (budget) => {
    if (!window.confirm(`Remove the ${budget.category} budget?`)) return;
    try {
      await expenseAPI.deleteBudget(budget._id);
      addToast(`${budget.category} budget removed`);
      setBudgets((prev) => prev.filter((b) => b._id !== budget._id));
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to delete budget'), 'error');
    }
  };

  const startEdit = (budget) => {
    setEditingId(budget._id);
    setEditLimit(String(budget.limit));
  };

  const currentMonthBudgets = budgets.filter((b) => {
    const now = new Date();
    return (
      new Date(b.month).getUTCFullYear() === now.getUTCFullYear() &&
      new Date(b.month).getUTCMonth() === now.getUTCMonth()
    );
  });

  const totalBudget = currentMonthBudgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = currentMonthBudgets.reduce((sum, b) => sum + (b.spentThisMonth || 0), 0);

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>🎯 Monthly Budgets</h2>
      </div>
      <p className="section-sub">
        Set a monthly limit per category and track how much of it you've used this month.
      </p>

      {error && (
        <div className="error-panel" role="alert">
          <p>⚠️ {error}</p>
          <button onClick={loadBudgets} className="primary-btn">Try Again</button>
        </div>
      )}

      {loading ? (
        <div className="loading-panel" role="status">
          <div className="spinner" />
          <p>Loading budgets…</p>
        </div>
      ) : (
        <>
          <form onSubmit={handleSetBudget} className="budget-form">
            <div className="control-group">
              <label htmlFor="budget-category">Category</label>
              <select
                id="budget-category"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label htmlFor="budget-limit">Monthly Limit ($)</label>
              <input
                id="budget-limit"
                type="number"
                placeholder="e.g., 400"
                min="0.01"
                step="0.01"
                value={form.limit}
                onChange={(e) => setForm((prev) => ({ ...prev, limit: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Set Budget'}
            </button>
          </form>

          {budgets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">🎯</div>
              <p className="empty-title">No budgets yet</p>
              <p className="empty-sub">Set a monthly limit for a category above to start tracking.</p>
            </div>
          ) : (
            <>
              {currentMonthBudgets.length > 0 && (
                <div className="budget-overview">
                  <div className="budget-overview-item">
                    <span>Total budgeted</span>
                    <strong>${totalBudget.toFixed(2)}</strong>
                  </div>
                  <div className="budget-overview-item">
                    <span>Spent this month</span>
                    <strong>${totalSpent.toFixed(2)}</strong>
                  </div>
                  <div className="budget-overview-item">
                    <span>Remaining</span>
                    <strong className={totalBudget - totalSpent < 0 ? 'text-danger' : 'text-success'}>
                      ${(totalBudget - totalSpent).toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}

              <div className="budget-list">
                {budgets.map((budget) => {
                  const spent = budget.spentThisMonth || 0;
                  const pct = budget.limit > 0 ? Math.min(100, (spent / budget.limit) * 100) : 0;
                  const over = spent > budget.limit;
                  return (
                    <div key={budget._id} className={`budget-item ${over ? 'budget-over' : ''}`}>
                      <div className="budget-item-top">
                        <span className="category-badge">{budget.category}</span>
                        {editingId === budget._id ? (
                          <div className="budget-edit">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editLimit}
                              onChange={(e) => setEditLimit(e.target.value)}
                              aria-label={`New limit for ${budget.category}`}
                            />
                            <button className="primary-btn btn-sm" onClick={() => saveEdit(budget._id)}>Save</button>
                            <button className="ghost-btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="budget-amounts">
                            <span className="budget-limit">${budget.limit.toFixed(2)}/mo</span>
                            <span className={`budget-spent ${over ? 'text-danger' : ''}`}>
                              ${spent.toFixed(2)} spent
                            </span>
                            <button className="icon-btn" onClick={() => startEdit(budget)} aria-label={`Edit ${budget.category} budget`}>✏️</button>
                            <button className="icon-btn" onClick={() => handleDelete(budget)} aria-label={`Delete ${budget.category} budget`}>🗑️</button>
                          </div>
                        )}
                      </div>
                      <div className="progress-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${budget.category} budget usage`}>
                        <div
                          className={`progress-fill ${over ? 'progress-over' : pct > 80 ? 'progress-warn' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="progress-label">
                        {over
                          ? `Over budget by $${(spent - budget.limit).toFixed(2)}`
                          : `${Math.round(pct)}% of budget used`}
                        {budget.percentUsed !== undefined && !over && pct <= 100 && (
                          <span className="progress-note"> · ${Math.max(0, budget.limit - spent).toFixed(2)} left</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default BudgetPanel;
