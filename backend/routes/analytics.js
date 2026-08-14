const express = require('express');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');
const router = express.Router();

// Get monthly summary
router.get('/monthly-summary', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    const date = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()));
    
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const expenses = await Expense.find({
      userId: req.userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const byCategory = {};
    let total = 0;

    expenses.forEach(exp => {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
      total += exp.amount;
    });

    res.json({
      month: startDate.toISOString().slice(0, 7),
      totalExpenses: total,
      byCategory,
      expenses: expenses.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get category breakdown
router.get('/category-breakdown', auth, async (req, res) => {
  try {
    const { months = 1 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const expenses = await Expense.find({
      userId: req.userId,
      date: { $gte: startDate }
    });

    const breakdown = {};
    expenses.forEach(exp => {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
    });

    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get savings insights
router.get('/savings-insights', auth, async (req, res) => {
  try {
    const { months = 3 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const expenses = await Expense.find({
      userId: req.userId,
      date: { $gte: startDate }
    });

    const budgets = await Budget.find({ userId: req.userId });

    const monthlyTotals = {};
    const categoryTotals = {};

    expenses.forEach(exp => {
      const month = exp.date.toISOString().slice(0, 7);
      monthlyTotals[month] = (monthlyTotals[month] || 0) + exp.amount;
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const insights = [];
    const avgMonthly = Object.values(monthlyTotals).reduce((a, b) => a + b, 0) / months;

    // Find over-budget categories
    budgets.forEach(budget => {
      const spent = categoryTotals[budget.category] || 0;
      if (spent > budget.limit) {
        insights.push({
          type: 'warning',
          category: budget.category,
          spent,
          limit: budget.limit,
          message: `You've exceeded your ${budget.category} budget by $${(spent - budget.limit).toFixed(2)}`
        });
      }
    });

    // Find highest spending categories
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: ((amount / Object.values(categoryTotals).reduce((a, b) => a + b, 0)) * 100).toFixed(1)
      }));

    insights.push({
      type: 'info',
      message: `Average monthly spending: $${avgMonthly.toFixed(2)}`
    });

    // Savings opportunity
    const highestCategory = topCategories[0];
    if (highestCategory) {
      const potentialSavings = (highestCategory.amount * 0.1).toFixed(2);
      insights.push({
        type: 'opportunity',
        category: highestCategory.category,
        amount: potentialSavings,
        message: `Reduce ${highestCategory.category} by 10% to save $${potentialSavings} monthly`
      });
    }

    res.json({
      insights,
      topCategories,
      avgMonthly,
      totalSpent: Object.values(monthlyTotals).reduce((a, b) => a + b, 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export expenses as CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { userId: req.userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query).sort({ date: -1 });

    let csv = 'Date,Description,Category,Amount,Notes\n';
    expenses.forEach(exp => {
      csv += `"${exp.date.toISOString().slice(0, 10)}","${exp.description}","${exp.category}","${exp.amount}","${exp.notes || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
