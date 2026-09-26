import React, { useState } from 'react';
import { expenseAPI, aiAPI, getErrorMessage } from '../api';
import { useToast } from '../pages/Dashboard';
import './Components.css';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Education', 'Other'];

function ExpenseForm({ onExpenseAdded }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const addToast = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * AI Categorization Handler
   * Calls the AI Agent to suggest a category based on description and amount
   */
  const handleAICategorize = async () => {
    if (!form.description.trim()) {
      setError('Please enter a description first');
      return;
    }

    setAiLoading(true);
    setError('');
    setAiSuggestion(null);

    try {
      const response = await aiAPI.categorizeExpense(form.description, parseFloat(form.amount) || 1);

      if (response.data.success) {
        const suggestion = response.data.data;
        setAiSuggestion(suggestion);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to get AI suggestion. Is the AI service configured?'));
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = () => {
    if (!aiSuggestion) return;
    setForm((prev) => ({ ...prev, category: aiSuggestion.category }));
    addToast(`Category set to ${aiSuggestion.category}`);
  };

  const validate = () => {
    if (!form.description.trim()) return 'Please enter a description';
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) return 'Please enter a valid positive amount';
    if (amt > 10000000) return 'Amount is unrealistically large';
    if (!form.date) return 'Please choose a date';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await expenseAPI.add({
        ...form,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        notes: form.notes.trim() || undefined,
      });
      onExpenseAdded(response.data);
      setForm({
        description: '',
        amount: '',
        category: 'Food',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setAiSuggestion(null);
      addToast(`"${response.data.description}" added`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add expense'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Add New Expense</h2>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="exp-description">Description</label>
          <div className="input-with-button">
            <input
              id="exp-description"
              type="text"
              name="description"
              placeholder="e.g., Lunch at restaurant"
              value={form.description}
              onChange={handleChange}
              maxLength={200}
              required
            />
            <button
              type="button"
              onClick={handleAICategorize}
              disabled={aiLoading || !form.description.trim()}
              className="ai-btn"
              title="Use AI to suggest a category"
            >
              {aiLoading ? '🤖 Thinking…' : '✨ AI Suggest'}
            </button>
          </div>
          {aiSuggestion && (
            <div className="ai-suggestion" role="status">
              <div className="ai-suggestion-main">
                💡 AI suggests: <strong>{aiSuggestion.category}</strong> (
                {(aiSuggestion.confidence * 100).toFixed(0)}% confident)
                <button type="button" className="apply-btn" onClick={applySuggestion}>
                  Apply
                </button>
              </div>
              <small>{aiSuggestion.reasoning}</small>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="exp-amount">Amount ($)</label>
            <input
              id="exp-amount"
              type="number"
              name="amount"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="exp-category">Category</label>
            <select id="exp-category" name="category" value={form.category} onChange={handleChange}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="exp-date">Date</label>
          <input id="exp-date" type="date" name="date" value={form.date} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="exp-notes">Notes (optional)</label>
          <textarea
            id="exp-notes"
            name="notes"
            placeholder="Add any additional details…"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            maxLength={500}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Adding…' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
}

export default ExpenseForm;
