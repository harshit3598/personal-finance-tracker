/**
 * MULTI-AGENT API ROUTES
 * ======================
 * 
 * Endpoints to interact with the multi-agent system
 * 
 * API Endpoints:
 * POST   /api/multi-agent/analyze    - Run all agents
 * GET    /api/multi-agent/agent/:name - Get specific agent insight
 * GET    /api/multi-agent/status     - Check agent status
 * GET    /api/multi-agent/health     - Health check
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MultiAgentCoordinator = require('../services/multiAgentCoordinator');

/**
 * POST /api/multi-agent/analyze
 * 
 * Run the complete multi-agent analysis
 * 
 * This endpoint:
 * 1. Creates a coordinator for this user
 * 2. Deploys all 3 agents
 * 3. Agents run in parallel
 * 4. Results are synthesized
 * 5. Returns comprehensive analysis
 * 
 * WORKFLOW VISUALIZATION:
 * 
 * Request: POST /api/multi-agent/analyze
 *    ↓
 * Coordinator created
 *    ↓
 * Three agents deploy simultaneously:
 * 
 *    Budget Agent              Savings Agent            Risk Agent
 *    ├─ analyzeBudgets()       ├─ findSavingsOps()      ├─ detectRisks()
 *    ├─ getStatus              ├─ getSavingsScore()     ├─ quickCheck()
 *    └─ Thinking logs          └─ Thinking logs         └─ Thinking logs
 *           ↓                        ↓                         ↓
 *    ────────────────────────────────────────────────────────→
 *                                  ↓
 *                         Coordinator waits for all
 *                                  ↓
 *                         Synthesizes findings
 *                                  ↓
 *                         Prioritizes actions
 *                                  ↓
 * Response: {
 *   agentResults: {
 *     budget: {...},
 *     savings: {...},
 *     risk: {...}
 *   },
 *   synthesis: "...",
 *   prioritized: {...},
 *   coordination: [...]
 * }
 */
router.post('/analyze', auth, async (req, res) => {
  try {
    console.log('\n🤖 Multi-Agent Analysis Started');
    console.log('═══════════════════════════════════════');

    // Create coordinator for this user
    const coordinator = new MultiAgentCoordinator(req.userId);

    // Run all agents
    const result = await coordinator.runAllAgents();

    console.log('═══════════════════════════════════════');
    console.log('🤖 Multi-Agent Analysis Complete\n');

    if (result.status === 'error') {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Multi-agent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Multi-agent analysis failed'
    });
  }
});

/**
 * GET /api/multi-agent/agent/:name
 * 
 * Get insight from a specific agent
 * 
 * Parameters:
 * - name: "budget", "savings", or "risk"
 * 
 * Examples:
 * GET /api/multi-agent/agent/budget
 *   → Returns budget status and analysis
 * 
 * GET /api/multi-agent/agent/savings
 *   → Returns savings score and opportunities
 * 
 * GET /api/multi-agent/agent/risk
 *   → Returns risk check and alerts
 */
router.get('/agent/:name', auth, async (req, res) => {
  try {
    const { name } = req.params;

    const coordinator = new MultiAgentCoordinator(req.userId);
    const insight = await coordinator.getAgentInsight(name);

    if (insight.error) {
      return res.status(400).json({
        success: false,
        error: insight.error
      });
    }

    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/multi-agent/status
 * 
 * Get real-time status of all agents
 * 
 * Shows:
 * - Each agent's name and specialty
 * - Recent thinking logs
 * - Coordination messages
 * - System status
 * 
 * Useful for:
 * - Debugging
 * - Understanding what agents are thinking
 * - Monitoring multi-agent system
 */
router.get('/status', auth, (req, res) => {
  try {
    const coordinator = new MultiAgentCoordinator(req.userId);
    const status = coordinator.getAgentStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/multi-agent/health
 * 
 * Health check for all agents
 * 
 * Returns:
 * - Overall system status
 * - Individual agent status
 * - Timestamp
 * 
 * Status codes:
 * - healthy: All agents working
 * - degraded: Some agents have issues
 * - error: System error
 */
router.get('/health', auth, async (req, res) => {
  try {
    const coordinator = new MultiAgentCoordinator(req.userId);
    const health = await coordinator.healthCheck();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/multi-agent/info
 * 
 * Get information about the multi-agent system
 * 
 * Returns:
 * - Number of agents
 * - Each agent's specialty
 * - How multi-agent system works
 * - Example queries
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      system: 'Multi-Agent Financial Advisor',
      totalAgents: 3,
      agents: [
        {
          id: 1,
          name: '💰 Budget Advisor',
          specialty: 'Budget planning and management',
          responsibilities: [
            'Set appropriate budgets',
            'Track budget vs actual',
            'Warn about overruns',
            'Recommend adjustments'
          ],
          tools: ['budgetCalculation', 'historicalAnalysis', 'comparisonAnalysis'],
          personality: 'Practical, numbers-focused'
        },
        {
          id: 2,
          name: '🏦 Savings Optimizer',
          specialty: 'Finding savings opportunities',
          responsibilities: [
            'Identify spending inefficiencies',
            'Find cost-cutting opportunities',
            'Calculate savings potential',
            'Provide actionable tips'
          ],
          tools: ['costAnalysis', 'benchmarkComparison', 'opportunityIdentification'],
          personality: 'Aggressive, optimization-driven'
        },
        {
          id: 3,
          name: '🚨 Risk Monitor',
          specialty: 'Anomaly detection and risk management',
          responsibilities: [
            'Detect unusual spending',
            'Identify potential fraud',
            'Flag behavioral changes',
            'Generate alerts'
          ],
          tools: ['anomalyDetection', 'patternAnalysis', 'alertGeneration'],
          personality: 'Cautious, protective'
        }
      ],
      howItWorks: [
        '1. User sends request to coordinator',
        '2. Coordinator deploys all 3 agents in parallel',
        '3. Agents analyze independently using their tools',
        '4. All agents complete and return results',
        '5. Coordinator collects all findings',
        '6. AI synthesizes results into unified advice',
        '7. Coordinator prioritizes recommendations',
        '8. User receives comprehensive multi-agent response'
      ],
      exampleQueries: [
        'What\'s my complete financial health?',
        'How should I manage my budget?',
        'Where can I save money?',
        'Are there any spending risks?',
        'Should I be concerned about anomalies?'
      ],
      benefits: [
        'Multiple expert perspectives',
        'Parallel analysis (fast)',
        'Comprehensive coverage',
        'Balanced recommendations',
        'Cross-validation of findings',
        'Transparent agent reasoning'
      ]
    }
  });
});

/**
 * POST /api/multi-agent/test
 * 
 * Test the multi-agent system
 * 
 * Runs a quick health check and returns sample analysis
 */
router.post('/test', auth, async (req, res) => {
  try {
    const coordinator = new MultiAgentCoordinator(req.userId);
    
    console.log('\n🧪 Testing Multi-Agent System');
    const health = await coordinator.healthCheck();

    if (health.status === 'error') {
      return res.status(500).json({
        success: false,
        message: 'Multi-agent test failed',
        health
      });
    }

    res.json({
      success: true,
      message: 'Multi-agent system is working correctly',
      health,
      nextStep: 'POST /api/multi-agent/analyze to run full analysis'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
