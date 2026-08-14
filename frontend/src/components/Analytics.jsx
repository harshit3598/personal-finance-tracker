import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { analyticsAPI } from '../api';
import './Analytics.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function Analytics({ expenses }) {
  const [categoryBreakdown, setCategoryBreakdown] = useState({});
  const [savingsInsights, setSavingsInsights] = useState(null);
  const [monthRange, setMonthRange] = useState('3');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [monthRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [breakdown, insights] = await Promise.all([
        analyticsAPI.getCategoryBreakdown(monthRange),
        analyticsAPI.getSavingsInsights(monthRange)
      ]);
      setCategoryBreakdown(breakdown.data);
      setSavingsInsights(insights.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare pie chart data
  const pieData = {
    labels: Object.keys(categoryBreakdown),
    datasets: [{
      data: Object.values(categoryBreakdown),
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40',
        '#FF6384',
        '#C9CBCF',
      ],
      borderColor: '#fff',
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
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value}`
        }
      }
    },
    plugins: {
      legend: {
        display: true,
      }
    }
  };

  return (
    <div className="analytics-container">
      <h2>💡 Financial Analytics & Insights</h2>

      <div className="time-selector">
        <label>View data for past:</label>
        <select value={monthRange} onChange={(e) => setMonthRange(e.target.value)}>
          <option value="1">1 Month</option>
          <option value="3">3 Months</option>
          <option value="6">6 Months</option>
          <option value="12">12 Months</option>
        </select>
      </div>

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

      {savingsInsights && (
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
                  <span className="category-amount">${cat.amount.toFixed(2)}</span>
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
