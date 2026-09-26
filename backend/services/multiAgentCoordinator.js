/**
 * MULTI-AGENT COORDINATOR
 * =======================
 *
 * Orchestrates the Budget, Savings, and Risk agents:
 * runs them in parallel, synthesizes their findings with AI,
 * and prioritizes recommendations.
 */

// Shared AI client (Groq free tier, OpenAI-compatible)
const { openai, AI_MODEL } = require('./aiClient');
const { parseJsonFromLLM } = require('./llmJson');
const BudgetAgent = require('../agents/budgetAgent');
const SavingsAgent = require('../agents/savingsAgent');
const RiskAgent = require('../agents/riskAgent');

const VALID_AGENTS = ['budget', 'savings', 'risk'];

class MultiAgentCoordinator {
  constructor(userId) {
    this.userId = userId;
    this.agents = {
      budget: new BudgetAgent(userId),
      savings: new SavingsAgent(userId),
      risk: new RiskAgent(userId),
    };
    this.coordination = [];
  }

  /**
   * LOG COORDINATION STEPS
   * Track how coordinator orchestrates agents
   */
  log(message) {
    this.coordination.push({
      timestamp: new Date().toISOString(),
      message,
    });
    console.log(`[Coordinator] ${message}`);
  }

  /**
   * MAIN METHOD: RUN ALL AGENTS
   */
  async runAllAgents() {
    this.log('🤖 Starting Multi-Agent Analysis');
    this.log('Deploying 3 specialized agents: Budget, Savings, Risk');

    try {
      // STEP 1: RUN AGENTS IN PARALLEL
      this.log('Phase 1: Agents analyze independently (parallel execution)...');

      const [budgetResults, savingsResults, riskResults] = await Promise.all([
        this.agents.budget.analyzeBudgets(),
        this.agents.savings.findSavingsOpportunities(),
        this.agents.risk.detectRisks(),
      ]);

      this.log('✅ All agents completed their analysis');

      // STEP 2: VALIDATE RESULTS
      const anyError = [budgetResults, savingsResults, riskResults].some((r) => r.error);
      if (anyError) {
        this.log('⚠️ Some agents encountered errors — continuing with partial data');
      }

      // STEP 3: SYNTHESIZE RESULTS
      this.log('Phase 2: Coordinator synthesizing findings...');
      const synthesis = await this.synthesizeFindings(budgetResults, savingsResults, riskResults);

      // STEP 4: PRIORITIZE ACTIONS (from parsed synthesis + raw agent data)
      this.log('Phase 3: Prioritizing recommendations...');
      const prioritized = this.prioritizeActions(synthesis, {
        risk: riskResults,
        savings: savingsResults,
      });

      this.log('🎯 Multi-agent analysis complete');

      return {
        status: 'success',
        agentResults: {
          budget: budgetResults,
          savings: savingsResults,
          risk: riskResults,
        },
        synthesis,
        prioritized,
        coordination: this.coordination,
      };
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);
      return {
        status: 'error',
        error: error.message,
        coordination: this.coordination,
      };
    }
  }

  /**
   * SYNTHESIZE FINDINGS
   *
   * Combine results from all 3 agents into a coherent picture.
   * Returns { agentFindings, summary, priorities, quickWins, watchOuts, healthScore, error? }
   * Structured fields fall back to locally computed values if the AI call fails,
   * so the panel always has usable content.
   */
  async synthesizeFindings(budgetRes, savingsRes, riskRes) {
    this.log('Synthesizing findings from all agents...');

    const context = {
      budget: budgetRes.categoryStats || {},
      savings: {
        opportunities: savingsRes.opportunities || [],
        totalPotential: savingsRes.totalPotentialSavings || 0,
      },
      risk: {
        riskLevel: riskRes.riskLevel || {},
        anomalies: riskRes.anomalies || [],
        alerts: riskRes.alerts || [],
      },
    };

    const result = {
      agentFindings: context,
      summary: '',
      priorities: [],
      quickWins: [],
      watchOuts: [],
      healthScore: null,
      timestamp: new Date().toISOString(),
    };

    // Locally-computed fallback content (always available, no AI needed)
    const riskLevel = riskRes.riskLevel || {};
    const totalSavings = savingsRes.totalPotentialSavings || '0.00';
    result.watchOuts = (riskRes.alerts || []).slice(0, 5).map((a) => `${a.title}: ${a.message}`);
    result.quickWins = (savingsRes.opportunities || [])
      .filter((o) => o.difficulty === 'Easy')
      .slice(0, 3)
      .map((o) => `Reduce ${o.category} spending (~$${o.potentialSavings}/mo opportunity)`);
    result.healthScore = this.computeHealthScore(riskLevel, savingsRes, budgetRes);

    try {
      const prompt = `You are a financial advisor coordinating 3 specialist agents:
1. Budget Agent - manages budgets and spending limits
2. Savings Agent - finds opportunities to save
3. Risk Agent - detects anomalies and risks

Here's their analysis:

BUDGET AGENT REPORT:
${JSON.stringify(context.budget, null, 2)}

SAVINGS AGENT REPORT:
Total Savings Potential: $${context.savings.totalPotential}
Opportunities: ${JSON.stringify(context.savings.opportunities, null, 2)}

RISK AGENT REPORT:
Risk Level: ${riskLevel.level || 'Low'} (${riskLevel.score ?? 0}/100)
Anomalies: ${context.risk.anomalies.length} detected
Alerts: ${context.risk.alerts.length} active

Respond ONLY with valid JSON in exactly this shape:
{
  "executive_summary": "2-3 sentence overview",
  "priorities": [ { "level": "critical|high|medium|low", "title": "...", "action": "..." } ],
  "quick_wins": ["..."],
  "watch_outs": ["..."],
  "health_score": 0-100
}`;

      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a master financial advisor synthesizing reports from 3 specialist agents. Respond ONLY with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      });

      const content = response.choices[0]?.message?.content || '';
      const parsed = parseJsonFromLLM(content);

      if (parsed) {
        result.summary = typeof parsed.executive_summary === 'string' ? parsed.executive_summary : '';
        if (Array.isArray(parsed.priorities)) {
          result.priorities = parsed.priorities
            .filter((p) => p && typeof p === 'object')
            .map((p) => ({
              level: String(p.level || 'medium').toLowerCase(),
              title: String(p.title || p.action || 'Recommended action'),
              action: String(p.action || ''),
            }));
        }
        if (Array.isArray(parsed.quick_wins)) {
          result.quickWins = parsed.quick_wins.map((q) => (typeof q === 'string' ? q : JSON.stringify(q)));
        }
        if (Array.isArray(parsed.watch_outs)) {
          result.watchOuts = parsed.watch_outs.map((w) => (typeof w === 'string' ? w : JSON.stringify(w)));
        }
        const hs = Number(parsed.health_score);
        if (isFinite(hs)) result.healthScore = Math.max(0, Math.min(100, Math.round(hs)));
        this.log('AI synthesis completed');
      } else {
        this.log('AI synthesis returned unparseable content — using local fallback');
        result.summary = this.buildFallbackSummary(context, riskLevel, totalSavings);
      }
    } catch (error) {
      this.log(`AI synthesis failed: ${error.message} — using local fallback`);
      result.synthesisError = error.message;
      result.summary = this.buildFallbackSummary(context, riskLevel, totalSavings);
    }

    return result;
  }

  buildFallbackSummary(context, riskLevel, totalSavings) {
    const parts = [];
    const cats = Object.entries(context.budget).filter(([, s]) => s && s.transactionCount > 0);
    if (cats.length > 0) {
      parts.push(
        `You have activity in ${cats.length} categories over the last 3 months, with roughly $${cats
          .reduce((sum, [, s]) => sum + parseFloat(s.monthlyAverage || 0), 0)
          .toFixed(0)} average monthly spending.`
      );
    }
    if (parseFloat(totalSavings) > 0) {
      parts.push(`There is about $${totalSavings}/month in potential savings across your spending.`);
    }
    parts.push(`Current risk level: ${riskLevel.level || 'Low'} (${riskLevel.score ?? 0}/100).`);
    return parts.join(' ');
  }

  computeHealthScore(riskLevel, savingsRes, budgetRes) {
    // Start from 100, deduct for risk and over-benchmark spending
    let score = 100;
    const riskScore = riskLevel.score ?? 0;
    score -= riskScore * 0.5;

    const opps = savingsRes.opportunities || [];
    score -= Math.min(20, opps.length * 4);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * PRIORITIZE ACTIONS
   *
   * Merges AI priorities with deterministic local findings so the
   * priority board is never empty. Priority order: critical > high > medium > low.
   */
  prioritizeActions(synthesis, { risk, savings }) {
    this.log('Prioritizing actions...');

    const actions = { critical: [], high: [], medium: [], low: [] };
    const clamp = (lvl) => (['critical', 'high', 'medium', 'low'].includes(lvl) ? lvl : 'medium');

    // 1. AI-generated priorities
    (synthesis.priorities || []).forEach((p) => {
      actions[clamp(p.level)].push({
        title: p.title,
        action: p.action,
        source: 'ai',
      });
    });

    // 2. Deterministic: high-risk alerts are always at least "high" priority
    (risk?.alerts || []).forEach((alert) => {
      const lvl = alert.level === 'High' ? 'high' : 'medium';
      actions[lvl].push({ title: alert.title, action: alert.action || alert.message, source: 'risk' });
    });

    // 3. Deterministic: big savings opportunities
    (savings?.opportunities || []).slice(0, 3).forEach((opp) => {
      actions.medium.push({
        title: `Reduce ${opp.category} spending`,
        action: `Currently $${opp.currentSpending}/mo vs $${opp.benchmark}/mo benchmark — save up to $${opp.potentialSavings}/mo (${opp.difficulty})`,
        source: 'savings',
      });
    });

    // Deduplicate by title within each bucket
    Object.keys(actions).forEach((k) => {
      const seen = new Set();
      actions[k] = actions[k].filter((a) => {
        const key = a.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    this.log(
      `Prioritized: ${actions.critical.length} critical, ${actions.high.length} high, ${actions.medium.length} medium`
    );
    return actions;
  }

  /**
   * GET AGENT INSIGHTS
   * Get specific insight from one agent
   */
  async getAgentInsight(agentName) {
    const key = String(agentName || '').toLowerCase();
    this.log(`Getting insight from ${key} agent...`);

    const agent = this.agents[key];
    if (!agent || !VALID_AGENTS.includes(key)) {
      return { error: `Agent "${agentName}" not found. Valid agents: ${VALID_AGENTS.join(', ')}` };
    }

    try {
      let insight;
      if (key === 'budget') insight = await agent.checkBudgetStatus();
      else if (key === 'savings') insight = await agent.calculateSavingsScore();
      else insight = await agent.quickRiskCheck();

      return { agent: key, insight, thinking: agent.thinking };
    } catch (error) {
      return { agent: key, error: error.message, thinking: agent.thinking };
    }
  }

  /**
   * HEALTH CHECK
   * Check if all agents can run without errors
   */
  async healthCheck() {
    this.log('Running health check on all agents...');

    try {
      const checks = await Promise.all([
        this.agents.budget.analyzeBudgets(),
        this.agents.savings.findSavingsOpportunities(),
        this.agents.risk.detectRisks(),
      ]);

      const allHealthy = checks.every((check) => !check.error);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        agents: {
          budget: checks[0].error ? 'error' : 'ok',
          savings: checks[1].error ? 'error' : 'ok',
          risk: checks[2].error ? 'error' : 'ok',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * GET AGENT STATUS
   * Show what each agent is doing
   */
  getAgentStatus() {
    return {
      coordinator: 'active',
      agents: {
        budget: {
          name: this.agents.budget.name,
          specialty: this.agents.budget.specialty,
          status: 'ready',
          thinking: this.agents.budget.thinking.slice(-3),
        },
        savings: {
          name: this.agents.savings.name,
          specialty: this.agents.savings.specialty,
          status: 'ready',
          thinking: this.agents.savings.thinking.slice(-3),
        },
        risk: {
          name: this.agents.risk.name,
          specialty: this.agents.risk.specialty,
          status: 'ready',
          thinking: this.agents.risk.thinking.slice(-3),
        },
      },
      coordinationLog: this.coordination.slice(-5),
    };
  }
}

module.exports = MultiAgentCoordinator;
