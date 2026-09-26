/**
 * BUDGET AGENT
 * ============
 * Specialization: Budget management, planning, and recommendations
 * 
 * This agent focuses on:
 * - Setting appropriate budgets
 * - Tracking budget vs actual spending
 * - Recommending budget adjustments
 * - Warning about budget overruns
 * 
 * AGENT CHARACTERISTICS:
 * Name: "Budget Advisor"
 * Personality: Practical, numbers-focused, goal-oriented
 * Tools: budgetCalculation, historicalAnalysis, comparisonAnalysis
 */

// Shared AI client (Groq free tier, OpenAI-compatible)
const { openai, AI_MODEL } = require('../services/aiClient');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

class BudgetAgent {
  constructor(userId) {
    this.userId = userId;
    this.name = '💰 Budget Advisor';
    this.specialty = 'Budget Planning & Management';
    this.thinking = [];
  }

  /**
   * AGENT THINKING PROCESS
   * Every decision the agent makes is logged
   */
  think(message) {
    this.thinking.push({
      timestamp: new Date().toISOString(),
      thought: message
    });
    console.log(`[${this.name}] ${message}`);
  }

  /**
   * PRIMARY METHOD: ANALYZE BUDGETS
   * 
   * This is what Budget Agent does best:
   * 1. Calculates current spending
   * 2. Recommends budgets
   * 3. Compares to spending
   * 4. Flags overruns
   */
  async analyzeBudgets() {
    this.think('Starting budget analysis...');

    try {
      // Get last 3 months of expenses
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const expenses = await Expense.find({
        userId: this.userId,
        date: { $gte: startDate }
      });

      this.think(`Analyzed ${expenses.length} expenses from last 3 months`);

      // Calculate by category
      const categoryStats = {};
      const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Education', 'Other'];

      categories.forEach(cat => {
        const catExpenses = expenses.filter(e => e.category === cat);
        const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
        const avg = catExpenses.length > 0 ? total / catExpenses.length : 0;
        const monthlyAvg = catExpenses.length > 0 ? (total / 3) : 0; // 3 months

        categoryStats[cat] = {
          transactionCount: catExpenses.length,
          totalSpent: total.toFixed(2),
          avgTransaction: avg.toFixed(2),
          monthlyAverage: monthlyAvg.toFixed(2),
          recommendedBudget: Math.ceil(monthlyAvg * 1.15 / 10) * 10 // +15% buffer
        };
      });

      this.think('Calculated statistics for all categories');

      // Get all budget docs (one per category/month) and keep the latest per category
      const budgetDocs = await Budget.find({ userId: this.userId }).sort({ month: -1 });
      const latestByCategory = {};
      budgetDocs.forEach((b) => {
        if (!latestByCategory[b.category]) latestByCategory[b.category] = b;
      });

      const existingBudgets = {};
      Object.entries(latestByCategory).forEach(([cat, b]) => {
        existingBudgets[cat] = { limit: b.limit, month: b.month };
      });

      this.think(`Retrieved ${Object.keys(existingBudgets).length} existing budget settings`);

      return {
        agent: this.name,
        specialty: this.specialty,
        categoryStats,
        existingBudgets,
        thinking: this.thinking
      };
    } catch (error) {
      this.think(`Error: ${error.message}`);
      return {
        agent: this.name,
        error: error.message,
        thinking: this.thinking
      };
    }
  }

  /**
   * AI-POWERED BUDGET RECOMMENDATION
   * Uses OpenAI to create intelligent budget suggestions
   */
  async generateBudgetRecommendation(categoryStats) {
    this.think('Asking AI for budget recommendations...');

    try {
      const prompt = `You are a budget advisor. Based on this spending data, create smart budget recommendations.

Spending Data:
${JSON.stringify(categoryStats, null, 2)}

Provide:
1. Recommended monthly budget for each category (slightly above historical average with 15% buffer)
2. Which categories are risky (high variance)
3. Which categories have potential savings
4. One actionable tip per category

Format as JSON with fields: budget, risk_level, savings_potential, tip`;

      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a practical budget advisor. Provide realistic, achievable budget recommendations based on actual spending data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      const recommendation = response.choices[0].message.content;
      this.think('AI recommendation generated');

      return recommendation;
    } catch (error) {
      this.think(`AI recommendation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * BUDGET ENFORCEMENT
   * Check current month's spending against budgets
   */
  async checkBudgetStatus() {
    this.think('Checking current month budget status...');

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Current month expenses
      const monthExpenses = await Expense.find({
        userId: this.userId,
        date: { $gte: startOfMonth }
      });

      this.think(`Reviewed ${monthExpenses.length} expenses this month`);

      const byCategory = {};
      monthExpenses.forEach(exp => {
        if (!byCategory[exp.category]) {
          byCategory[exp.category] = 0;
        }
        byCategory[exp.category] += exp.amount;
      });

      // Get budgets: latest per category across all stored months
      const budgetDocs = await Budget.find({ userId: this.userId }).sort({ month: -1 });
      const budgets = {};
      budgetDocs.forEach((b) => {
        if (budgets[b.category] === undefined) budgets[b.category] = b.limit;
      });

      // Check for overruns
      const overruns = [];
      Object.keys(byCategory).forEach(cat => {
        const spent = byCategory[cat];
        const budget = budgets[cat];
        if (budget === undefined) return; // no budget set for this category
        const percentage = (spent / budget) * 100;

        if (percentage > 100) {
          overruns.push({
            category: cat,
            budget: budget.toFixed(2),
            spent: spent.toFixed(2),
            overage: (spent - budget).toFixed(2),
            percentage: percentage.toFixed(1)
          });
        }
      });

      if (overruns.length > 0) {
        this.think(`⚠️ Found ${overruns.length} budget overruns`);
      } else {
        this.think('✅ All budgets on track');
      }

      return {
        agent: this.name,
        currentMonth: {
          byCategory,
          budgets,
          overruns
        },
        thinking: this.thinking
      };
    } catch (error) {
      this.think(`Error checking budgets: ${error.message}`);
      return {
        agent: this.name,
        error: error.message,
        thinking: this.thinking
      };
    }
  }
}

module.exports = BudgetAgent;
