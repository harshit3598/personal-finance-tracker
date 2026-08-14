const express = require('express');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all expenses for user
router.get('/', auth, async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    let query = { userId: req.userId };

    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new expense
router.post('/', auth, async (req, res) => {
  try {
    const { description, amount, category, date, notes } = req.body;

    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Please provide description, amount, and category' });
    }

    const expense = new Expense({
      userId: req.userId,
      description,
      amount,
      category,
      date: date ? new Date(date) : new Date(),
      notes
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense || expense.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(expense, req.body);
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense || expense.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set budget for category
router.post('/budget/set', auth, async (req, res) => {
  try {
    const { category, limit, month } = req.body;

    if (!category || !limit) {
      return res.status(400).json({ error: 'Please provide category and limit' });
    }

    let budget = await Budget.findOne({
      userId: req.userId,
      category,
      month: new Date(month || new Date()).toISOString().slice(0, 7)
    });

    if (budget) {
      budget.limit = limit;
      await budget.save();
    } else {
      budget = new Budget({
        userId: req.userId,
        category,
        limit,
        month: new Date(month || new Date()).toISOString().slice(0, 7)
      });
      await budget.save();
    }

    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get budgets for user
router.get('/budget/get', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.userId });
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
