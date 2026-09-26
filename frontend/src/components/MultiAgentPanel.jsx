import React, { useState, useEffect } from 'react';
import { multiAgentAPI } from '../api';
import './MultiAgentPanel.css';

const AGENT_META = {
  budget: { icon: '💰', name: 'Budget Advisor', tag: 'Budget Management' },
  savings: { icon: '🏦', name: 'Savings Optimizer', tag: 'Cost Savings' },
  risk: { icon: '🚨', name: 'Risk Monitor', tag: 'Risk Detection' }
};

/**
 * Try to extract a JSON object from an OpenAI text response
 * (the model is asked to reply with JSON but may add prose around it)
 */
const parseJson = (str) => {
  if (!str || typeof str !== 'string') return null;
  try {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    // Not valid JSON — fall through
  }
  return null;
};

/** Case-insensitive key lookup with several common variants */
const pick = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return null;
  const lower = Object.keys(obj).reduce((acc, k) => {
    acc[k.toLowerCase()] = obj[k];
    return acc;
  }, {});
  for (const key of keys) {
    if (lower[key.toLowerCase()] !== undefined) return lower[key.toLowerCase()];
  }
  return null;
};

const asArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val];
  return Object.values(val);
};

const priorityLabel = (item) => {
  if (typeof item === 'string') return item;
  return item?.title || item?.action || item?.description || item?.message || JSON.stringify(item);
};

function MultiAgentPanel() {
  const [info, setInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [showThinking, setShowThinking] = useState({});
  const [showCoordination, setShowCoordination] = useState(false);

  // Load system info on mount
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await multiAgentAPI.getInfo();
        setInfo(response.data.data);
      } catch (err) {
        console.error('Failed to load multi-agent info:', err);
      }
    };
    fetchInfo();
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await multiAgentAPI.analyze();
      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError(response.data.error || 'Multi-agent analysis failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to reach multi-agent system');
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = (key) => {
    setExpandedAgent(expandedAgent === key ? null : key);
  };

  const toggleThinking = (key) => {
    setShowThinking((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---------------- Synthesis rendering ---------------- */

  const renderSynthesis = () => {
    const synthesis = result?.synthesis;
    if (!synthesis) return null;

    // Backend now always returns a structured synthesis object:
    // { summary, priorities, quickWins, watchOuts, healthScore, synthesisError? }
    const summary = synthesis.summary || '';
    const priorities = asArray(synthesis.priorities);
    const quickWins = asArray(synthesis.quickWins);
    const watchOuts = asArray(synthesis.watchOuts);
    const healthScore = synthesis.healthScore;

    if (!summary && priorities.length === 0 && quickWins.length === 0 && watchOuts.length === 0 && healthScore == null) {
      // AI step failed entirely — per-agent reports below are still complete
      return (
        <div className="syn-card syn-summary syn-error">
          <h4>🧠 AI Synthesis</h4>
          <p className="syn-error-msg">
            ⚠️ The AI synthesis step failed{synthesis.synthesisError ? ` (${synthesis.synthesisError})` : ''}.
            The individual agent reports below are still complete — the statistical analysis ran successfully.
          </p>
        </div>
      );
    }

    return (
      <div className="synthesis-grid">
        {summary && (
          <div className="syn-card syn-summary">
            <h4>📋 Executive Summary</h4>
            <p>{summary}</p>
          </div>
        )}
        {healthScore !== null && healthScore !== undefined && (
          <div className="syn-card syn-score">
            <h4>📈 Financial Health Score</h4>
            <div className="health-score">
              <span className="score-value">{healthScore}</span>
              <span className="score-max">/100</span>
            </div>
          </div>
        )}
        {priorities.length > 0 && (
          <div className="syn-card">
            <h4>🎯 Top Priorities</h4>
            <ul className="syn-list">
              {priorities.map((p, i) => (
                <li key={i}>
                  {priorityLabel(p)}
                  {p?.action && p.action !== p.title && <div className="alert-action">→ {p.action}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {quickWins.length > 0 && (
          <div className="syn-card">
            <h4>⚡ Quick Wins</h4>
            <ul className="syn-list">
              {quickWins.map((q, i) => (
                <li key={i}>{priorityLabel(q)}</li>
              ))}
            </ul>
          </div>
        )}
        {watchOuts.length > 0 && (
          <div className="syn-card">
            <h4>⚠️ Watch-Outs</h4>
            <ul className="syn-list">
              {watchOuts.map((w, i) => (
                <li key={i}>{priorityLabel(w)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  /* ---------------- Per-agent rendering ---------------- */

  const renderBudget = (data) => {
    const stats = data.categoryStats || {};
    const rows = Object.entries(stats);
    if (rows.length === 0) return <p className="empty-note">No budget data available.</p>;
    return (
      <table className="agent-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Transactions</th>
            <th>Total Spent</th>
            <th>Monthly Avg</th>
            <th>Recommended Budget</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([cat, s]) => (
            <tr key={cat}>
              <td>{cat}</td>
              <td>{s.transactionCount}</td>
              <td>${s.totalSpent}</td>
              <td>${s.monthlyAverage}</td>
              <td>${s.recommendedBudget}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderSavings = (data) => {
    const opportunities = data.opportunities || [];
    if (opportunities.length === 0) {
      return <p className="empty-note">No savings opportunities found — spending is within benchmarks.</p>;
    }
    return (
      <div>
        <div className="savings-total">
          💰 Total potential savings: <strong>${data.totalPotentialSavings || '0.00'}/month</strong>
        </div>
        <div className="opportunity-list">
          {opportunities.map((opp, i) => (
            <div key={i} className={`opportunity-item diff-${(opp.difficulty || 'Medium').toLowerCase()}`}>
              <div className="opp-main">
                <span className="opp-category">{opp.category}</span>
                <span className="opp-savings">−${opp.potentialSavings}/mo</span>
              </div>
              <div className="opp-detail">
                Spending ${opp.currentSpending}/mo vs benchmark ${opp.benchmark}/mo · Difficulty: {opp.difficulty}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRisk = (data) => {
    const riskLevel = data.riskLevel || {};
    const alerts = data.alerts || [];
    const anomalies = data.anomalies || [];
    const changes = data.behavioralChanges || [];

    const levelClass = (riskLevel.level || 'Low').toLowerCase();
    return (
      <div>
        <div className="risk-summary">
          <div className={`risk-badge risk-${levelClass}`}>
            {riskLevel.level || 'Low'} risk · {riskLevel.score ?? 0}/100
          </div>
          {riskLevel.status && <span className="risk-status">{riskLevel.status}</span>}
        </div>
        <div className="risk-counts">
          <span className="count-chip">{anomalies.length} anomalies</span>
          <span className="count-chip">{changes.length} behavioral changes</span>
          <span className="count-chip">{alerts.length} alerts</span>
        </div>
        {alerts.length > 0 && (
          <ul className="syn-list">
            {alerts.map((a, i) => (
              <li key={i}>
                <strong>[{a.level}] {a.title}</strong> — {a.message}
                {a.action && <div className="alert-action">→ {a.action}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderAgentBody = (key) => {
    const data = result?.agentResults?.[key];
    if (!data) return null;
    if (data.error) return <p className="empty-note">⚠️ {data.error}</p>;
    if (key === 'budget') return renderBudget(data);
    if (key === 'savings') return renderSavings(data);
    if (key === 'risk') return renderRisk(data);
    return null;
  };

  const renderAgentCard = (key) => {
    const meta = AGENT_META[key];
    const data = result?.agentResults?.[key];
    const isOpen = expandedAgent === key;
    const thinking = data?.thinking || [];
    return (
      <div className={`agent-card ${isOpen ? 'open' : ''}`}>
        <button className="agent-card-header" onClick={() => toggleAgent(key)}>
          <span className="agent-icon">{meta.icon}</span>
          <span className="agent-title">
            <strong>{meta.name}</strong>
            <small>{meta.tag}</small>
          </span>
          <span className="agent-status">{data?.error ? '⚠️ error' : '✅ done'}</span>
          <span className="agent-chevron">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <div className="agent-card-body">
            {renderAgentBody(key)}
            {thinking.length > 0 && (
              <div className="thinking-section">
                <button className="thinking-toggle" onClick={() => toggleThinking(key)}>
                  🤔 {showThinking[key] ? 'Hide' : 'Show'} agent thinking ({thinking.length} steps)
                </button>
                {showThinking[key] && (
                  <ul className="thinking-log">
                    {thinking.map((t, i) => (
                      <li key={i}>
                        <span className="thinking-time">{new Date(t.timestamp).toLocaleTimeString()}</span>
                        {t.thought}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ---------------- Prioritized actions ---------------- */

  const renderPrioritized = () => {
    const prioritized = result?.prioritized;
    if (!prioritized) return null;
    const groups = [
      { key: 'critical', label: '🔴 Critical', items: prioritized.critical || [] },
      { key: 'high', label: '🟠 High', items: prioritized.high || [] },
      { key: 'medium', label: '🟡 Medium', items: prioritized.medium || [] },
      { key: 'low', label: '🟢 Low', items: prioritized.low || [] }
    ];
    const hasAny = groups.some((g) => g.items.length > 0);
    if (!hasAny) return null;
    return (
      <div className="prioritized-section">
        <h3>📌 Prioritized Actions</h3>
        <div className="priority-grid">
          {groups.map((g) => (
            <div key={g.key} className={`priority-column priority-${g.key}`}>
              <h4>{g.label}</h4>
              {g.items.length === 0 ? (
                <p className="empty-note">None</p>
              ) : (
                <ul className="syn-list">
                  {g.items.map((item, i) => (
                    <li key={i}>{priorityLabel(item)}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ---------------- Coordination log ---------------- */

  const renderCoordination = () => {
    const log = result?.coordination || [];
    if (log.length === 0) return null;
    return (
      <div className="coordination-section">
        <button className="coordination-toggle" onClick={() => setShowCoordination(!showCoordination)}>
          🧩 {showCoordination ? 'Hide' : 'Show'} coordinator activity ({log.length} steps)
        </button>
        {showCoordination && (
          <ul className="coordination-log">
            {log.map((step, i) => (
              <li key={i}>
                <span className="coord-time">{new Date(step.timestamp).toLocaleTimeString()}</span>
                {step.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  /* ---------------- Main render ---------------- */

  return (
    <div className="multi-agent-panel">
      <div className="ma-header">
        <div>
          <h2>🕸️ Multi-Agent Financial Analysis</h2>
          <p>
            {info?.totalAgents
              ? `${info.totalAgents} specialized agents analyze your finances in parallel, then a coordinator synthesizes their findings.`
              : 'Three specialized agents analyze your finances in parallel, then a coordinator synthesizes their findings.'}
          </p>
        </div>
        <button className="ma-run-btn" onClick={runAnalysis} disabled={loading}>
          {loading ? '🤖 Deploying agents...' : '🚀 Run Full Analysis'}
        </button>
      </div>

      {info?.agents && (
        <div className="agent-roster">
          {info.agents.map((agent) => (
            <div key={agent.id} className="roster-card">
              <strong>{agent.name}</strong>
              <span>{agent.specialty}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="ma-error">⚠️ {error}</div>}

      {loading && (
        <div className="ma-loading">
          <div className="ma-loading-header">Deploying 3 agents in parallel...</div>
          <div className="loading-agents">
            {Object.values(AGENT_META).map((meta) => (
              <div key={meta.name} className="loading-agent">
                <span className="loading-agent-icon">{meta.icon}</span>
                <span>{meta.name}</span>
                <span className="loading-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="ma-results">
          <div className="results-section">
            <h3>🧠 Coordinated Synthesis</h3>
            {renderSynthesis()}
          </div>

          {renderPrioritized()}

          <div className="results-section">
            <h3>👥 Individual Agent Reports</h3>
            <div className="agent-cards">
              {renderAgentCard('budget')}
              {renderAgentCard('savings')}
              {renderAgentCard('risk')}
            </div>
          </div>

          {renderCoordination()}
        </div>
      )}
    </div>
  );
}

export default MultiAgentPanel;
