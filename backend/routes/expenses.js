const express = require('express');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');
const router = express.Router();

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Education', 'Other'];

// Field whitelist for updates — prevents mass-assignment (e.g. overwriting userId)
const UPDATABLE_FIELDS = ['description', 'amount', 'category', 'date', 'notes'];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Returns the first day of the month containing `date`, stored as a real Date (UTC midnight). */
function monthStart(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// Get all expenses for user
router.get('/', auth, async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    const query = { userId: req.userId };

    if (category) {
      if (!EXPENSE_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid category filter' });
      }
      query.category = category;
    }
    if (startDate || endDate) {
      query.date = {};
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (startDate && isNaN(start.getTime())) {
        return res.status(400).json({ error: 'Invalid startDate format' });
      }
      if (endDate && isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid endDate format' });
      }
      if (startDate) query.date.$gte = start;
      if (endDate) {
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error('List expenses error:', err.message);
    res.status(500).json({ error: 'Failed to load expenses' });
  }
});

// Add new expense
router.post('/', auth, async (req, res) => {
  try {
    const { description, amount, category, date, notes } = req.body || {};

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Please provide a description' });
    }
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Please provide a valid positive amount' });
    }
    if (amount > 10000000) {
      return res.status(400).json({ error: 'Amount is unrealistically large' });
    }
    if (!category || !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Please provide a valid category' });
    }

    let expenseDate = new Date();
    if (date) {
      expenseDate = new Date(date);
      if (isNaN(expenseDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
    }

    const expense = new Expense({
      userId: req.userId,
      description: description.trim(),
      amount: Math.round(amount * 100) / 100, // normalize to 2 decimals
      category,
      date: expenseDate,
      notes: typeof notes === 'string' ? notes.trim() : undefined,
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    console.error('Create expense error:', err.message);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (expense.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = req.body || {};

    if (updates.description !== undefined) {
      if (typeof updates.description !== 'string' || !updates.description.trim()) {
        return res.status(400).json({ error: 'Description cannot be empty' });
      }
    }
    if (updates.amount !== undefined) {
      const amt = Number(updates.amount);
      if (typeof updates.amount === 'string' && updates.amount !== '' && isNaN(amt)) {
        return res.status(400).json({ error: 'Amount must be a number' });
      }
      if (!isFinite(amt) || amt <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      updates.amount = Math.round(amt * 100) / 100;
    }
    if (updates.category !== undefined && !EXPENSE_CATEGORIES.includes(updates.category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (updates.date !== undefined) {
      const d = new Date(updates.date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      updates.date = d;
    }

    // Only copy whitelisted fields — never userId
    for (const field of UPDATABLE_FIELDS) {
      if (updates[field] !== undefined) {
        expense[field] = field === 'description' ? updates[field].trim() : updates[field];
      }
    }

    await expense.save();
    res.json(expense);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    console.error('Update expense error:', err.message);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (expense.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('Delete expense error:', err.message);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Set budget for a category (upsert)
router.post('/budget/set', auth, async (req, res) => {
  try {
    const { category, limit, month } = req.body || {};

    if (!category || !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Please provide a valid category' });
    }
    const limitNum = Number(limit);
    if (!isFinite(limitNum) || limitNum <= 0) {
      return res.status(400).json({ error: 'Please provide a valid positive limit' });
    }

    let monthDate = monthStart();
    if (month) {
      const parsed = new Date(month);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid month format' });
      }
      monthDate = monthStart(parsed);
    }

    const budget = await Budget.findOneAndUpdate(
      { userId: req.userId, category, month: monthDate },
      { $set: { limit: limitNum } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(budget);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    console.error('Set budget error:', err.message);
    res.status(500).json({ error: 'Failed to set budget' });
  }
});

// Get budgets for user, with current-month spent totals for a quick health view
router.get('/budget/get', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.userId }).sort({ month: -1, category: 1 });

    // Compute spent for the current month per category to make this endpoint actually useful
    const start = monthStart();
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const expenses = await Expense.find({
      userId: req.userId,
      date: { $gte: start, $lt: end },
    });

    const spentByCategory = {};
    expenses.forEach((exp) => {
      spentByCategory[exp.category] = (spentByCategory[exp.category] || 0) + exp.amount;
    });

    const withSpent = budgets.map((b) => {
      const obj = b.toObject();
      const spent = spentByCategory[b.category] || 0;
      obj.spentThisMonth = Math.round(spent * 100) / 100;
      obj.percentUsed = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
      return obj;
    });

    res.json(withSpent);
  } catch (err) {
    console.error('Get budgets error:', err.message);
    res.status(500).json({ error: 'Failed to load budgets' });
  }
});

// Delete a budget
router.delete('/budget/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    if (budget.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Budget.findByIdAndDelete(req.params.id);
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    console.error('Delete budget error:', err.message);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

module.exports = router;
