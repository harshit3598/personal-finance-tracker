import React, { useState, useMemo } from 'react';
import { expenseAPI, getErrorMessage } from '../api';
import { useToast } from '../pages/Dashboard';
import './Components.css';

const ALL_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Education', 'Other'];

function ExpenseList({ expenses, onDelete, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [deletingId, setDeletingId] = useState(null);
  const [editing, setEditing] = useState(null); // expense being edited
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const addToast = useToast();

  const filteredExpenses = useMemo(() => {
    let list = filter === 'all' ? expenses : expenses.filter((exp) => exp.category === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (exp) =>
          exp.description.toLowerCase().includes(q) ||
          (exp.notes || '').toLowerCase().includes(q) ||
          exp.category.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });
  }, [expenses, filter, search, sortBy]);

  const categoriesPresent = useMemo(
    () => ['all', ...new Set([...expenses.map((e) => e.category)])],
    [expenses]
  );

  const handleDelete = async (id) => {
    const expense = expenses.find((e) => e._id === id);
    if (!window.confirm(`Delete "${expense?.description || 'this expense'}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await expenseAPI.delete(id);
      onDelete(id);
      addToast('Expense deleted');
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to delete expense'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (expense) => {
    setEditing(expense._id);
    setEditForm({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      notes: expense.notes || '',
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(editForm.amount);
    if (!editForm.description.trim() || isNaN(amt) || amt <= 0) {
      addToast('Description and a positive amount are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await expenseAPI.update(editing, {
        description: editForm.description.trim(),
        amount: amt,
        category: editForm.category,
        date: editForm.date,
        notes: editForm.notes.trim() || undefined,
      });
      setEditing(null);
      addToast('Expense updated');
      // Re-sync list from the server so all views stay consistent
      if (onRefresh) await onRefresh();
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to update expense'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredTotal = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>
          Expenses <span className="count-pill">{filteredExpenses.length}</span>
        </h2>
      </div>

      <div className="list-controls">
        <div className="control-group">
          <label htmlFor="filter-search">Search</label>
          <input
            id="filter-search"
            type="search"
            placeholder="Search description, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="control-group">
          <label htmlFor="filter-category">Filter by Category</label>
          <select id="filter-category" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {categoriesPresent.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="filter-sort">Sort by</label>
          <select id="filter-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Most Recent</option>
            <option value="amount">Highest Amount</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">🧾</div>
          {expenses.length === 0 ? (
            <>
              <p className="empty-title">No expenses yet</p>
              <p className="empty-sub">Add your first expense to start tracking your spending.</p>
            </>
          ) : (
            <>
              <p className="empty-title">No matching expenses</p>
              <p className="empty-sub">Try adjusting your search or filters.</p>
            </>
          )}
        </div>
      ) : (
        <div className="expenses-table" role="table" aria-label="Expense list">
          <div className="table-header" role="row">
            <div className="col date" role="columnheader">Date</div>
            <div className="col description" role="columnheader">Description</div>
            <div className="col category" role="columnheader">Category</div>
            <div className="col amount" role="columnheader">Amount</div>
            <div className="col action" role="columnheader">Actions</div>
          </div>
          {filteredExpenses.map((expense) => (
            <div key={expense._id} className={`table-row ${deletingId === expense._id ? 'row-deleting' : ''}`} role="row">
              <div className="col date" data-label="Date" role="cell">
                {new Date(expense.date).toLocaleDateString()}
              </div>
              <div className="col description" data-label="Description" role="cell">
                {expense.description}
                {expense.notes && <small className="row-notes">{expense.notes}</small>}
              </div>
              <div className="col category" data-label="Category" role="cell">
                <span className="category-badge">{expense.category}</span>
              </div>
              <div className="col amount" data-label="Amount" role="cell">
                ${expense.amount.toFixed(2)}
              </div>
              <div className="col action" role="cell">
                <button
                  onClick={() => startEdit(expense)}
                  className="icon-btn"
                  title="Edit expense"
                  aria-label={`Edit ${expense.description}`}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(expense._id)}
                  className="icon-btn"
                  disabled={deletingId === expense._id}
                  title="Delete expense"
                  aria-label={`Delete ${expense.description}`}
                >
                  {deletingId === expense._id ? '…' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="list-summary">
        <p>
          {filteredExpenses.length} item{filteredExpenses.length === 1 ? '' : 's'} · Total:{' '}
          <strong>${filteredTotal.toFixed(2)}</strong>
        </p>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => !saving && setEditing(null)} role="dialog" aria-modal="true" aria-label="Edit expense">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Expense</h3>
              <button className="icon-btn modal-close" onClick={() => setEditing(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <form onSubmit={saveEdit} className="modal-form">
              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <input
                  id="edit-description"
                  type="text"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  maxLength={200}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-amount">Amount ($)</label>
                  <input
                    id="edit-amount"
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    value={editForm.amount}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-category">Category</label>
                  <select id="edit-category" name="category" value={editForm.category} onChange={handleEditChange}>
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="edit-date">Date</label>
                <input id="edit-date" type="date" name="date" value={editForm.date} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="edit-notes">Notes (optional)</label>
                <textarea id="edit-notes" name="notes" rows={2} value={editForm.notes} onChange={handleEditChange} maxLength={500} />
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditing(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseList;
