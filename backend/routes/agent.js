/**
 * Agent API Routes
 * 
 * POST /api/agent/ask - Chat with the Financial Advisor Agent
 * GET /api/agent/capabilities - List what the agent can do
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { runFinancialAdvisor } = require('../services/financialAdvisor');

/**
 * POST /api/agent/ask
 * 
 * Chat with the Financial Advisor Agent
 * The agent will:
 * 1. Understand your question
 * 2. Plan which analysis to run
 * 3. Execute multiple tools
 * 4. Synthesize AI recommendations
 * 5. Return detailed answer + reasoning
 * 
 * Request:
 * {
 *   "query": "How can I save $500 this month?"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "answer": "Based on your spending...",
 *   "reasoning": [
 *     { step: 1, thought: "User wants to save...", timestamp: "..." },
 *     ...
 *   ],
 *   "toolCalls": [
 *     { tool: "analyzeSpending", timestamp: "..." },
 *     ...
 *   ],
 *   "data": {
 *     "analyzeSpending": { ... },
 *     "detectAnomalies": { ... },
 *     ...
 *   }
 * }
 */
router.post('/ask', auth, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a query'
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Query too long. Please keep it under 500 characters.'
      });
    }

    // Run the financial advisor agent
    console.log(`\n🤖 Running agent for user ${req.userId} with query: "${query}"\n`);
    const result = await runFinancialAdvisor(req.userId, query);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process query'
    });
  }
});

/**
 * GET /api/agent/capabilities
 * 
 * Returns what the agent can do
 */
router.get('/capabilities', (req, res) => {
  res.json({
    success: true,
    capabilities: [
      {
        name: 'spending_analysis',
        description: 'Analyze your spending patterns by category',
        examples: [
          'What am I spending the most on?',
          'Break down my expenses by category',
          'How much did I spend this month?'
        ]
      },
      {
        name: 'savings_recommendations',
        description: 'Find ways to save money',
        examples: [
          'How can I save $500 this month?',
          'Where can I cut spending?',
          'What are my biggest spending categories?'
        ]
      },
      {
        name: 'anomaly_detection',
        description: 'Identify unusual spending patterns',
        examples: [
          'Did I spend unusually this month?',
          'Are there any spending spikes?',
          'Show me anomalies in my spending'
        ]
      },
      {
        name: 'trend_analysis',
        description: 'See spending trends over time',
        examples: [
          'How is my spending trending?',
          'Am I spending more or less than last month?',
          'Show me my 6-month spending trend'
        ]
      },
      {
        name: 'budget_suggestions',
        description: 'Get smart budget recommendations',
        examples: [
          'What budget should I set?',
          'Recommend budgets for each category',
          'What are realistic spending limits?'
        ]
      }
    ],
    howItWorks: [
      '1. You ask a question about your finances',
      '2. The agent analyzes your query',
      '3. It runs relevant analysis tools',
      '4. It uses AI to synthesize recommendations',
      '5. You get detailed insights + reasoning'
    ],
    agent_features: [
      '🧠 Multi-step reasoning',
      '🔧 Multiple analysis tools',
      '📊 Data-driven recommendations',
      '💡 AI-powered insights',
      '🔍 Transparent decision-making (see all reasoning steps)'
    ]
  });
});

/**
 * POST /api/agent/test
 * 
 * Test endpoint to verify agent is working
 */
router.post('/test', auth, async (req, res) => {
  try {
    const result = await runFinancialAdvisor(
      req.userId,
      'How much am I spending on average?'
    );

    res.json({
      success: true,
      message: 'Agent is working correctly',
      sample_response: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Agent test failed',
      error: error.message
    });
  }
});

module.exports = router;
