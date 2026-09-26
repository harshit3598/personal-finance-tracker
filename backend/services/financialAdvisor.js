/**
 * Financial Advisor Agent
 * 
 * A TRUE agent that:
 * 1. Understands user goals/questions
 * 2. Plans which tools to use
 * 3. Executes tools and analyzes results
 * 4. Reasons about findings
 * 5. Generates recommendations
 * 
 * This demonstrates the AGENT LOOP:
 * Observe → Plan → Execute → Analyze → Repeat → Conclude
 */

// Shared AI client (Groq free tier, OpenAI-compatible)
const { openai, AI_MODEL } = require('./aiClient');
const tools = require('./agentTools');

/**
 * Financial Advisor Agent
 */
class FinancialAdvisorAgent {
  constructor(userId) {
    this.userId = userId;
    this.reasoning = [];
    this.toolCalls = [];
    this.results = {};
  }

  /**
   * Add reasoning to the conversation trace
   */
  think(message) {
    this.reasoning.push({
      step: this.reasoning.length + 1,
      thought: message,
      timestamp: new Date().toISOString()
    });
    console.log(`[Agent Thought ${this.reasoning.length}] ${message}`);
  }

  /**
   * Execute a tool and record the result
   */
  async callTool(toolName, ...args) {
    this.think(`Calling tool: ${toolName}`);

    try {
      if (!tools[toolName]) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const result = await tools[toolName](this.userId, ...args);
      this.toolCalls.push({ tool: toolName, timestamp: new Date().toISOString() });
      this.results[toolName] = result;

      if (result.success) {
        this.think(`Tool ${toolName} succeeded. Analyzing results...`);
      } else {
        this.think(`Tool ${toolName} failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.think(`Error calling tool ${toolName}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Main Agent Method
   * Plans and executes the best strategy for a user query
   */
  async runAgent(userQuery) {
    this.think(`User query received: "${userQuery}"`);
    this.think('Analyzing query to determine tools needed...');

    // Plan: Based on query, decide which tools to use
    const plan = this.planToolCalls(userQuery);
    this.think(`Plan created. Tools to use: ${plan.join(', ')}`);

    // Execute: Call all planned tools
    this.think('Executing tool calls...');
    for (const toolName of plan) {
      if (toolName === 'analyzeSpending') {
        await this.callTool('analyzeSpending', 3);
      } else if (toolName === 'detectAnomalies') {
        await this.callTool('detectAnomalies', 3);
      } else if (toolName === 'calculateSavingsOpportunities') {
        await this.callTool('calculateSavingsOpportunities', 1);
      } else if (toolName === 'getMonthlyTrend') {
        await this.callTool('getMonthlyTrend', 6);
      } else if (toolName === 'suggestSmartBudgets') {
        await this.callTool('suggestSmartBudgets');
      } else if (toolName === 'getRecentTransactions') {
        await this.callTool('getRecentTransactions', 15);
      }
    }

    // Analyze: Process results with AI
    this.think('All tools executed. Using AI to synthesize findings...');
    const synthesizedAnalysis = await this.synthesizeWithAI(userQuery, this.results);

    // Return: Comprehensive response
    return {
      answer: synthesizedAnalysis,
      reasoning: this.reasoning,
      toolCalls: this.toolCalls,
      data: this.results
    };
  }

  /**
   * Plan which tools to call based on user query
   * This is the DECISION-MAKING step of the agent
   */
  planToolCalls(query) {
    const plan = [];

    // Convert query to lowercase for matching
    const q = query.toLowerCase();

    // Decide which tools to use based on keywords
    if (
      q.includes('save') ||
      q.includes('budget') ||
      q.includes('reduce') ||
      q.includes('money') ||
      q.includes('spending')
    ) {
      plan.push('analyzeSpending');
      plan.push('calculateSavingsOpportunities');
    }

    if (
      q.includes('trend') ||
      q.includes('pattern') ||
      q.includes('history') ||
      q.includes('month')
    ) {
      plan.push('getMonthlyTrend');
    }

    if (
      q.includes('unusual') ||
      q.includes('anomal') ||
      q.includes('spike') ||
      q.includes('strange') ||
      q.includes('odd')
    ) {
      plan.push('detectAnomalies');
    }

    if (q.includes('recent') || q.includes('latest')) {
      plan.push('getRecentTransactions');
    }

    if (q.includes('budget') || q.includes('recommend') || q.includes('suggest')) {
      plan.push('suggestSmartBudgets');
    }

    // If no specific tools matched, run a comprehensive analysis
    if (plan.length === 0) {
      plan.push('analyzeSpending');
      plan.push('calculateSavingsOpportunities');
      plan.push('detectAnomalies');
    }

    // Remove duplicates
    return [...new Set(plan)];
  }

  /**
   * Synthesize tool results with AI reasoning
   * This is where AI adds intelligent analysis to raw data
   */
  async synthesizeWithAI(userQuery, results) {
    try {
      if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
        throw new Error('No AI API key configured');
      }
      // Build a comprehensive context from all tool results
      const context = JSON.stringify(results, null, 2);

      const prompt = `You are a helpful financial advisor analyzing expense data.

User asked: "${userQuery}"

Here's the data I've gathered:
${context}

Based on this analysis:
1. Provide a friendly, personalized response to their question
2. Highlight the most important insights
3. Give specific, actionable recommendations
4. Show potential savings or concerns
5. Be encouraging and practical

Format your response with:
- 📊 KEY INSIGHTS (what stands out)
- 💡 RECOMMENDATIONS (specific actions)
- 🎯 SAVINGS POTENTIAL (if applicable)
- ⚠️ CONCERNS (any red flags)
- 🚀 NEXT STEPS (what to do)`;

      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a knowledgeable and friendly financial advisor. Provide clear, actionable advice based on spending data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error in AI synthesis:', error);
      // Fallback: return structured analysis without AI
      return this.fallbackAnalysis(results);
    }
  }

  /**
   * Fallback analysis if AI fails
   */
  fallbackAnalysis(results) {
    let analysis = '## Financial Analysis\n\n';

    if (results.analyzeSpending?.success) {
      const data = results.analyzeSpending;
      analysis += `📊 **Spending Summary**\n`;
      analysis += `- Total spent: $${data.totalSpent}\n`;
      analysis += `- Number of expenses: ${data.expenseCount}\n`;
      analysis += `- Daily average: $${data.dailyAverage}\n\n`;
    }

    if (results.calculateSavingsOpportunities?.success) {
      const data = results.calculateSavingsOpportunities;
      analysis += `💰 **Savings Opportunities**\n`;
      analysis += `- Total potential savings: $${data.totalPotentialSavings}/month\n`;
      data.opportunities.slice(0, 3).forEach(opp => {
        analysis += `- ${opp.category}: Save $${opp.potentialSavings} (${opp.savingsPercentage}%)\n`;
      });
      analysis += '\n';
    }

    if (results.detectAnomalies?.success) {
      const data = results.detectAnomalies;
      if (data.anomaliesFound > 0) {
        analysis += `⚠️ **Spending Anomalies Found: ${data.anomaliesFound}**\n`;
        data.anomalies.slice(0, 3).forEach(anom => {
          analysis += `- ${anom.category}: $${anom.amount} (${anom.spike}% above average)\n`;
        });
        analysis += '\n';
      }
    }

    return analysis || 'Analysis complete. No significant findings.';
  }
}

/**
 * Run the agent for a user query
 */
async function runFinancialAdvisor(userId, query) {
  const agent = new FinancialAdvisorAgent(userId);
  return agent.runAgent(query);
}

module.exports = {
  FinancialAdvisorAgent,
  runFinancialAdvisor
};
