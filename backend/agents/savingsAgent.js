/**
 * SAVINGS AGENT
 * =============
 * Specialization: Finding savings opportunities and optimization
 * 
 * This agent focuses on:
 * - Identifying spending inefficiencies
 * - Finding areas to cut costs
 * - Comparing spending vs benchmarks
 * - Calculating total savings potential
 * 
 * AGENT CHARACTERISTICS:
 * Name: "Savings Optimizer"
 * Personality: Aggressive, opportunity-focused, optimization-driven
 * Tools: costAnalysis, benchmarkComparison, opportunityIdentification
 */

// Shared AI client (Groq free tier, OpenAI-compatible)
const { openai, AI_MODEL } = require('../services/aiClient');
const Expense = require('../models/Expense');

class SavingsAgent {
  constructor(userId) {
    this.userId = userId;
    this.name = '🏦 Savings Optimizer';
    this.specialty = 'Finding Savings & Cost Optimization';
    this.thinking = [];
  }

  /**
   * AGENT THINKING PROCESS
   * Log every decision and analysis
   */
  think(message) {
    this.thinking.push({
      timestamp: new Date().toISOString(),
      thought: message
    });
    console.log(`[${this.name}] ${message}`);
  }

  /**
   * PRIMARY METHOD: FIND SAVINGS OPPORTUNITIES
   * 
   * Algorithm:
   * 1. Get spending by category
   * 2. Compare to industry benchmarks
   * 3. Identify outliers
   * 4. Calculate savings potential
   * 5. Rank by impact
   */
  async findSavingsOpportunities() {
    this.think('Starting savings analysis...');

    try {
      // Get last 3 months
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const expenses = await Expense.find({
        userId: this.userId,
        date: { $gte: startDate }
      });

      this.think(`Analyzing ${expenses.length} expenses`);

      // Industry benchmarks (typical monthly spending)
      const benchmarks = {
        'Food': 350,
        'Transport': 200,
        'Entertainment': 100,
        'Utilities': 150,
        'Healthcare': 100,
        'Shopping': 100,
        'Education': 100,
        'Other': 50
      };

      // Calculate spending
      const spending = {};
      const categories = Object.keys(benchmarks);

      categories.forEach(cat => {
        const catExpenses = expenses.filter(e => e.category === cat);
        const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
        const monthly = total / 3;
        
        spending[cat] = {
          monthlyAverage: monthly.toFixed(2),
          benchmark: benchmarks[cat],
          difference: (monthly - benchmarks[cat]).toFixed(2),
          percentageDiff: (((monthly - benchmarks[cat]) / benchmarks[cat]) * 100).toFixed(1),
          savings: Math.max(0, monthly - benchmarks[cat]).toFixed(2)
        };
      });

      this.think('Compared spending to industry benchmarks');

      // Find opportunities
      const opportunities = categories
        .filter(cat => parseFloat(spending[cat].savings) > 0)
        .map(cat => ({
          category: cat,
          currentSpending: spending[cat].monthlyAverage,
          benchmark: spending[cat].benchmark,
          potentialSavings: spending[cat].savings,
          difficulty: this.calculateDifficulty(cat, parseFloat(spending[cat].percentageDiff))
        }))
        .sort((a, b) => parseFloat(b.potentialSavings) - parseFloat(a.potentialSavings));

      const totalSavings = opportunities.reduce((sum, opp) => sum + parseFloat(opp.potentialSavings), 0);

      this.think(`Found ${opportunities.length} savings opportunities totaling $${totalSavings.toFixed(2)}`);

      return {
        agent: this.name,
        specialty: this.specialty,
        spending,
        opportunities,
        totalPotentialSavings: totalSavings.toFixed(2),
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
   * CALCULATE DIFFICULTY LEVEL
   * 
   * How hard is it to reduce this category?
   * - Easy: Discretionary (entertainment, shopping)
   * - Medium: Reducible (food, transport)
   * - Hard: Essential (utilities, healthcare)
   */
  calculateDifficulty(category, percentageDiff) {
    if (category === 'Utilities' || category === 'Healthcare') {
      return 'Hard'; // Hard to reduce essential expenses
    } else if (category === 'Food' || category === 'Transport') {
      return 'Medium'; // Can be reduced with effort
    } else if (category === 'Entertainment' || category === 'Shopping') {
      return 'Easy'; // Easy to cut discretionary spending
    }
    return 'Medium';
  }

  /**
   * QUICK WIN OPPORTUNITIES
   * Savings that are easy to implement
   */
  async getQuickWins() {
    this.think('Calculating quick wins...');

    try {
      const savings = await this.findSavingsOpportunities();

      if (savings.error) return savings;

      // Filter for easy wins
      const quickWins = savings.opportunities
        .filter(opp => opp.difficulty === 'Easy')
        .slice(0, 3);

      this.think(`Found ${quickWins.length} quick win opportunities`);

      return {
        agent: this.name,
        quickWins,
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
   * AI-POWERED SAVINGS STRATEGIES
   * Get creative savings tips from AI
   */
  async generateSavingsStrategies(opportunities) {
    this.think('Asking AI for creative savings strategies...');

    try {
      const topOps = opportunities.slice(0, 5);
      const prompt = `You are a savings expert. Given these spending categories where user can save money:

${topOps.map(o => `- ${o.category}: Currently $${o.currentSpending}/month, benchmark $${o.benchmark}/month, Can save $${o.potentialSavings}`).join('\n')}

For each category, provide:
1. One practical tip to reduce spending
2. Estimated savings percentage
3. Difficulty (Easy/Medium/Hard)
4. Timeline to implement (weeks)

Format as JSON array`;

      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a practical savings expert. Provide realistic, actionable tips for reducing spending.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 1000
      });

      this.think('AI strategies generated');
      return response.choices[0].message.content;
    } catch (error) {
      this.think(`AI strategy generation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * SAVINGS SCORE
   * Overall savings efficiency score (0-100)
   */
  async calculateSavingsScore() {
    this.think('Calculating savings efficiency score...');

    try {
      const savings = await this.findSavingsOpportunities();
      if (savings.error) return { score: 0, error: savings.error };

      // Score calculation:
      // - Start at 100
      // - Deduct for each category over benchmark
      // - More overage = lower score

      let score = 100;
      Object.values(savings.spending).forEach(stat => {
        const overage = parseFloat(stat.percentageDiff);
        if (overage > 0) {
          score -= Math.min(overage / 2, 10); // Max 10 points per category
        }
      });

      score = Math.max(0, Math.round(score));

      this.think(`Savings score: ${score}/100`);

      return {
        agent: this.name,
        score,
        rating: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work',
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
}

module.exports = SavingsAgent;
