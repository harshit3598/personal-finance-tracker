const express = require('express');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');
const router = express.Router();

/** Parse & validate a month range (1-24), defaulting to 3 */
function parseMonths(raw, fallback = 3) {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) return fallback;
  return Math.min(n, 24);
}

// Get monthly summary
router.get('/monthly-summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const year = req.query.year !== undefined ? parseInt(req.query.year, 10) : now.getFullYear();
    // API month is 1-based for callers; default to current month
    const monthParam = req.query.month !== undefined ? parseInt(req.query.month, 10) : now.getMonth() + 1;

    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    if (isNaN(monthParam) || monthParam < 1 || monthParam > 12) {
      return res.status(400).json({ error: 'Invalid month (must be 1-12)' });
    }

    // JS Date months are 0-based
    const startDate = new Date(year, monthParam - 1, 1);
    const endDate = new Date(year, monthParam, 1);

    const expenses = await Expense.find({
      userId: req.userId,
      date: { $gte: startDate, $lt: endDate },
    });

    const byCategory = {};
    let total = 0;
    expenses.forEach((exp) => {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
      total += exp.amount;
    });

    res.json({
      month: `${year}-${String(monthParam).padStart(2, '0')}`,
      totalExpenses: Math.round(total * 100) / 100,
      byCategory,
      count: expenses.length,
    });
  } catch (err) {
    console.error('Monthly summary error:', err.message);
    res.status(500).json({ error: 'Failed to load monthly summary' });
  }
});

// Get category breakdown
router.get('/category-breakdown', auth, async (req, res) => {
  try {
    const months = parseMonths(req.query.months);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setHours(0, 0, 0, 0);

    const expenses = await Expense.find({
      userId: req.userId,
      date: { $gte: startDate },
    });

    const breakdown = {};
    expenses.forEach((exp) => {
      breakdown[exp.category] = Math.round(((breakdown[exp.category] || 0) + exp.amount) * 100) / 100;
    });

    res.json(breakdown);
  } catch (err) {
    console.error('Category breakdown error:', err.message);
    res.status(500).json({ error: 'Failed to load category breakdown' });
  }
});

// Get savings insights
router.get('/savings-insights', auth, async (req, res) => {
  try {
    const months = parseMonths(req.query.months) || 3;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setHours(0, 0, 0, 0);

    const expenses = await Expense.find({
      userId: req.userId,
      date: { $gte: startDate },
    });

    const budgets = await Budget.find({ userId: req.userId });

    const monthlyTotals = {};
    const categoryTotals = {};

    expenses.forEach((exp) => {
      const month = exp.date.toISOString().slice(0, 7);
      monthlyTotals[month] = (monthlyTotals[month] || 0) + exp.amount;
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const insights = [];
    const totalSpent = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);
    const avgMonthly = totalSpent / months;

    // Find over-budget categories
    budgets.forEach((budget) => {
      const spent = categoryTotals[budget.category] || 0;
      if (budget.limit > 0 && spent > budget.limit) {
        insights.push({
          type: 'warning',
          category: budget.category,
          spent: Math.round(spent * 100) / 100,
          limit: budget.limit,
          message: `You've exceeded your ${budget.category} budget by $${(spent - budget.limit).toFixed(2)}`,
        });
      }
    });

    const catTotalSum = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    // Find highest spending categories
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: catTotalSum > 0 ? ((amount / catTotalSum) * 100).toFixed(1) : '0.0',
      }));

    if (expenses.length === 0) {
      insights.push({
        type: 'info',
        message: 'No expenses recorded in this period yet — add a few to unlock insights.',
      });
    } else {
      insights.push({
        type: 'info',
        message: `Average monthly spending: $${avgMonthly.toFixed(2)}`,
      });
    }

    // Savings opportunity
    const highestCategory = topCategories[0];
    if (highestCategory && highestCategory.amount > 0) {
      const potentialSavings = (highestCategory.amount * 0.1 / months).toFixed(2);
      insights.push({
        type: 'opportunity',
        category: highestCategory.category,
        amount: potentialSavings,
        message: `Reduce ${highestCategory.category} by 10% to save about $${potentialSavings} monthly`,
      });
    }

    res.json({
      insights,
      topCategories,
      avgMonthly: Math.round(avgMonthly * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
    });
  } catch (err) {
    console.error('Savings insights error:', err.message);
    res.status(500).json({ error: 'Failed to load savings insights' });
  }
});

// Export expenses as CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.userId };

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
      if (endDate) query.date.$lte = end;
    }

    const expenses = await Expense.find(query).sort({ date: -1 });

    // Escape a value for CSV: wrap in quotes, double embedded quotes, neutralize formula injection
    const esc = (value) => {
      let s = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(s)) {
        s = `'${s}`; // prevent CSV/formula injection in Excel
      }
      return `"${s.replace(/"/g, '""')}"`;
    };

    let csv = 'Date,Description,Category,Amount,Notes\n';
    expenses.forEach((exp) => {
      csv += [
        esc(exp.date.toISOString().slice(0, 10)),
        esc(exp.description),
        esc(exp.category),
        esc(exp.amount.toFixed(2)),
        esc(exp.notes || ''),
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err.message);
    res.status(500).json({ error: 'Failed to export expenses' });
  }
});

module.exports = router;
