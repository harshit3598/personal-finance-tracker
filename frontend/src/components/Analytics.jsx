import React, { useState, useEffect, useCallback } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { analyticsAPI, getErrorMessage } from '../api';
import './Analytics.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#64748b'];

function Analytics({ expenses, theme }) {
  const isDark = theme === 'dark' || theme === 'black';
  const tickColor = isDark ? '#94a3b8' : '#666';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(0, 0, 0, 0.08)';
  const sliceBorder = isDark ? '#1e293b' : '#fff';
  const [categoryBreakdown, setCategoryBreakdown] = useState({});
  const [savingsInsights, setSavingsInsights] = useState(null);
  const [monthRange, setMonthRange] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [breakdown, insights] = await Promise.all([
        analyticsAPI.getCategoryBreakdown(monthRange),
        analyticsAPI.getSavingsInsights(monthRange)
      ]);
      setCategoryBreakdown(breakdown.data || {});
      setSavingsInsights(insights.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load analytics'));
    } finally {
      setLoading(false);
    }
  }, [monthRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Prepare pie chart data
  const pieData = {
    labels: Object.keys(categoryBreakdown),
    datasets: [{
      data: Object.values(categoryBreakdown),
      backgroundColor: CHART_COLORS,
      borderColor: sliceBorder,
      borderWidth: 2,
    }]
  };

  // Prepare bar chart data
  const barData = {
    labels: Object.keys(categoryBreakdown),
    datasets: [{
      label: 'Spending by Category',
      data: Object.values(categoryBreakdown),
      backgroundColor: '#667eea',
      borderColor: '#667eea',
      borderWidth: 1,
      borderRadius: 5,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: tickColor }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        ticks: { color: tickColor },
        grid: { color: gridColor }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: tickColor,
          callback: (value) => `$${value}`
        },
        grid: { color: gridColor }
      }
    },
    plugins: {
      legend: {
        display: true,
        labels: { color: tickColor }
      }
    }
  };

  return (
    <div className="analytics-container">
      <h2>💡 Financial Analytics & Insights</h2>

      <div className="time-selector">
        <label htmlFor="analytics-range">View data for past:</label>
        <select id="analytics-range" value={monthRange} onChange={(e) => setMonthRange(e.target.value)}>
          <option value="1">1 Month</option>
          <option value="3">3 Months</option>
          <option value="6">6 Months</option>
          <option value="12">12 Months</option>
        </select>
        <button onClick={loadAnalytics} className="ghost-btn btn-sm" disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-panel" role="alert">
          <p>⚠️ {error}</p>
          <button onClick={loadAnalytics} className="primary-btn">Try Again</button>
        </div>
      )}

      {loading && !savingsInsights && (
        <div className="loading-panel" role="status">
          <div className="spinner" />
          <p>Crunching your numbers…</p>
        </div>
      )}

      <div className="analytics-grid">
        <div className="chart-container">
          <h3>Spending by Category (Pie Chart)</h3>
          {Object.keys(categoryBreakdown).length > 0 ? (
            <Pie data={pieData} options={chartOptions} />
          ) : (
            <p className="no-data">No data available</p>
          )}
        </div>

        <div className="chart-container">
          <h3>Spending by Category (Bar Chart)</h3>
          {Object.keys(categoryBreakdown).length > 0 ? (
            <Bar data={barData} options={barOptions} />
          ) : (
            <p className="no-data">No data available</p>
          )}
        </div>
      </div>

      {savingsInsights && !loading && (
        <div className="insights-section">
          <h3>🎯 Savings Opportunities & Insights</h3>

          <div className="insights-summary">
            <div className="insight-card">
              <h4>Average Monthly Spending</h4>
              <p className="insight-value">${savingsInsights.avgMonthly?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="insight-card">
              <h4>Total Spent ({monthRange}M)</h4>
              <p className="insight-value">${savingsInsights.totalSpent?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          <div className="insights-list">
            {savingsInsights.insights?.map((insight, idx) => (
              <div key={idx} className={`insight-item insight-${insight.type}`}>
                <div className="insight-icon">
                  {insight.type === 'warning' && '⚠️'}
                  {insight.type === 'opportunity' && '💡'}
                  {insight.type === 'info' && 'ℹ️'}
                </div>
                <div className="insight-content">
                  <p className="insight-message">{insight.message}</p>
                  {insight.spent && (
                    <p className="insight-details">
                      Spent: ${insight.spent.toFixed(2)} / Budget: ${insight.limit?.toFixed(2)}
                    </p>
                  )}
                  {insight.amount && (
                    <p className="insight-details">
                      Potential savings: ${insight.amount}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="top-categories">
            <h4>Top Spending Categories</h4>
            <ul>
              {savingsInsights.topCategories?.map((cat, idx) => (
                <li key={idx}>
                  <span className="category-name">{cat.category}</span>
                  <span className="category-amount">${Number(cat.amount).toFixed(2)}</span>
                  <span className="category-percent">({cat.percentage}%)</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="recommendations">
            <h4>💰 Money-Saving Tips</h4>
            <ul>
              <li>Track your spending in the top categories more closely</li>
              <li>Set realistic budgets and try to reduce overspending by 10% each month</li>
              <li>Look for patterns in your spending to identify areas for improvement</li>
              <li>Consider switching to cheaper alternatives for regularly purchased items</li>
              <li>Use cashback or rewards programs for frequent purchases</li>
              <li>Review subscriptions and cancel unused services</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
