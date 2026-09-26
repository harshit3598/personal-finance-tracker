/**
 * Agent Tools Library
 * 
 * These are standalone functions that the Agent can call to accomplish tasks.
 * Each tool is isolated and reusable.
 */

const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

/**
 * Tool 1: Analyze Spending Patterns
 * Retrieves expenses and calculates statistics by category
 */
async function analyzeSpending(userId, months = 1) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const expenses = await Expense.find({
      userId,
      date: { $gte: startDate }
    });

    // Group by category
    const byCategory = {};
    let totalSpent = 0;

    expenses.forEach(expense => {
      if (!byCategory[expense.category]) {
        byCategory[expense.category] = {
          total: 0,
          count: 0,
          avg: 0,
          min: Infinity,
          max: -Infinity
        };
      }
      byCategory[expense.category].total += expense.amount;
      byCategory[expense.category].count += 1;
      byCategory[expense.category].min = Math.min(
        byCategory[expense.category].min,
        expense.amount
      );
      byCategory[expense.category].max = Math.max(
        byCategory[expense.category].max,
        expense.amount
      );
      totalSpent += expense.amount;
    });

    // Calculate averages
    Object.keys(byCategory).forEach(category => {
      byCategory[category].avg = (
        byCategory[category].total / byCategory[category].count
      ).toFixed(2);
    });

    return {
      success: true,
      timeframe: `${months} month(s)`,
      totalSpent: totalSpent.toFixed(2),
      expenseCount: expenses.length,
      byCategory,
      dailyAverage: (totalSpent / (months * 30)).toFixed(2)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tool 2: Detect Spending Anomalies
 * Finds unusual spending patterns (spikes, low activity, etc)
 */
async function detectAnomalies(userId, months = 3) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const expenses = await Expense.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: -1 });

    const anomalies = [];

    // Group by category to detect spikes
    const categoryStats = {};

    expenses.forEach(expense => {
      if (!categoryStats[expense.category]) {
        categoryStats[expense.category] = [];
      }
      categoryStats[expense.category].push(expense.amount);
    });

    // Analyze each category for anomalies
    Object.keys(categoryStats).forEach(category => {
      const amounts = categoryStats[category];
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / amounts.length
      );

      // Find outliers (more than 2 std dev from mean)
      amounts.forEach((amount, index) => {
        if (Math.abs(amount - avg) > 2 * stdDev && amount > avg) {
          anomalies.push({
            category,
            amount: amount.toFixed(2),
            expected: avg.toFixed(2),
            spike: ((amount / avg - 1) * 100).toFixed(1),
            type: 'HIGH_SPIKE'
          });
        }
      });

      // Detect unusually high category spending
      const totalInCategory = amounts.reduce((a, b) => a + b, 0);
      if (amounts.length > 10 && avg > 100) {
        anomalies.push({
          category,
          totalSpent: totalInCategory.toFixed(2),
          avgTransaction: avg.toFixed(2),
          type: 'CATEGORY_CONCERN',
          insight: `${category} transactions average $${avg.toFixed(2)}`
        });
      }
    });

    return {
      success: true,
      anomaliesFound: anomalies.length,
      anomalies: anomalies.slice(0, 10) // Top 10 anomalies
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tool 3: Calculate Savings Opportunities
 * Identifies where user can cut spending
 */
async function calculateSavingsOpportunities(userId, months = 1) {
  try {
    const spending = await analyzeSpending(userId, months);
    if (!spending.success) throw new Error('Failed to analyze spending');

    const opportunities = [];
    const { byCategory } = spending;

    // Define baseline budgets (reasonable monthly spending)
    const baselineBudgets = {
      'Food': 400,
      'Transport': 200,
      'Entertainment': 100,
      'Utilities': 150,
      'Healthcare': 100,
      'Shopping': 150,
      'Education': 100,
      'Other': 100
    };

    // Check each category against baseline
    Object.keys(byCategory).forEach(category => {
      const spent = parseFloat(byCategory[category].total);
      const baseline = baselineBudgets[category] || 100;
      const overage = spent - baseline;

      if (overage > 0) {
        opportunities.push({
          category,
          currentSpending: spent.toFixed(2),
          recommendedBudget: baseline.toFixed(2),
          potentialSavings: overage.toFixed(2),
          savingsPercentage: ((overage / spent) * 100).toFixed(1)
        });
      }
    });

    // Sort by savings potential
    opportunities.sort((a, b) => parseFloat(b.potentialSavings) - parseFloat(a.potentialSavings));

    const totalSavings = opportunities.reduce((sum, opp) => sum + parseFloat(opp.potentialSavings), 0);

    return {
      success: true,
      totalPotentialSavings: totalSavings.toFixed(2),
      opportunities,
      insight: `You could save $${totalSavings.toFixed(2)}/month with smart adjustments`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tool 4: Get Recent Transactions
 * Retrieves recent expenses for analysis
 */
async function getRecentTransactions(userId, limit = 10) {
  try {
    const expenses = await Expense.find({ userId })
      .sort({ date: -1 })
      .limit(limit);

    return {
      success: true,
      count: expenses.length,
      transactions: expenses.map(e => ({
        description: e.description,
        amount: e.amount,
        category: e.category,
        date: e.date.toISOString().split('T')[0],
        notes: e.notes
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tool 5: Get Monthly Trend
 * Shows spending trend over months
 */
async function getMonthlyTrend(userId, months = 6) {
  try {
    const trend = [];

    for (let i = months - 1; i >= 0; i--) {
      const startOfMonth = new Date();
      startOfMonth.setMonth(startOfMonth.getMonth() - i);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const expenses = await Expense.find({
        userId,
        date: { $gte: startOfMonth, $lt: endOfMonth }
      });

      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      const monthName = startOfMonth.toLocaleString('default', { month: 'short' });

      trend.push({
        month: monthName,
        total: total.toFixed(2),
        count: expenses.length
      });
    }

    return {
      success: true,
      trend,
      insight: `Trend shows spending over ${months} months`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tool 6: Smart Budget Recommendations
 * Suggests appropriate budgets based on spending patterns
 */
async function suggestSmartBudgets(userId) {
  try {
    const spending = await analyzeSpending(userId, 3); // Last 3 months
    if (!spending.success) throw new Error('Failed to analyze spending');

    const { byCategory } = spending;
    const recommendations = {};

    // Suggest 90th percentile of spending as budget (a bit more than average)
    Object.keys(byCategory).forEach(category => {
      const avg = parseFloat(byCategory[category].avg);
      // Budget should be average + 20% buffer for flexibility
      const suggested = Math.ceil(avg * 1.2 / 10) * 10; // Round to nearest 10

      recommendations[category] = {
        based_on_avg: avg.toFixed(2),
        suggested_budget: suggested,
        flexibility: ((suggested - avg) / avg * 100).toFixed(1)
      };
    });

    return {
      success: true,
      recommendations,
      note: 'Budgets include 20% flexibility buffer'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  analyzeSpending,
  detectAnomalies,
  calculateSavingsOpportunities,
  getRecentTransactions,
  getMonthlyTrend,
  suggestSmartBudgets
};
