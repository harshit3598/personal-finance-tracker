/**
 * RISK AGENT
 * ==========
 * Specialization: Anomaly detection and risk identification
 * 
 * This agent focuses on:
 * - Detecting unusual spending patterns
 * - Identifying potential fraud
 * - Flagging behavioral changes
 * - Alert user to risks
 * 
 * AGENT CHARACTERISTICS:
 * Name: "Risk Monitor"
 * Personality: Cautious, analytical, protective
 * Tools: anomalyDetection, patternAnalysis, alertGeneration
 */

const Expense = require('../models/Expense');

class RiskAgent {
  constructor(userId) {
    this.userId = userId;
    this.name = '🚨 Risk Monitor';
    this.specialty = 'Anomaly Detection & Risk Management';
    this.thinking = [];
  }

  /**
   * AGENT THINKING PROCESS
   * Log every risk analysis
   */
  think(message) {
    this.thinking.push({
      timestamp: new Date().toISOString(),
      thought: message
    });
    console.log(`[${this.name}] ${message}`);
  }

  /**
   * PRIMARY METHOD: COMPREHENSIVE RISK ANALYSIS
   * 
   * Algorithm:
   * 1. Analyze historical patterns
   * 2. Compare current spending
   * 3. Detect outliers (statistical anomalies)
   * 4. Flag behavioral changes
   * 5. Generate risk alerts
   */
  async detectRisks() {
    this.think('Starting comprehensive risk analysis...');

    try {
      // Get last 6 months for pattern analysis
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);

      const allExpenses = await Expense.find({
        userId: this.userId,
        date: { $gte: startDate }
      }).sort({ date: -1 });

      this.think(`Analyzed ${allExpenses.length} transactions from 6 months`);

      // Get current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthExpenses = allExpenses.filter(e => e.date >= startOfMonth);

      this.think(`Current month has ${currentMonthExpenses.length} transactions`);

      // Detect anomalies
      const anomalies = this.detectAnomalies(allExpenses, currentMonthExpenses);
      this.think(`Found ${anomalies.length} anomalies`);

      // Behavioral changes
      const behavioralChanges = this.detectBehavioralChanges(allExpenses);
      this.think(`Detected ${behavioralChanges.length} behavioral changes`);

      // Generate alerts
      const alerts = this.generateAlerts(anomalies, behavioralChanges);
      this.think(`Generated ${alerts.length} alerts`);

      return {
        agent: this.name,
        specialty: this.specialty,
        riskLevel: this.calculateRiskLevel(anomalies, behavioralChanges),
        anomalies,
        behavioralChanges,
        alerts,
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
   * DETECT ANOMALIES
   * Statistical method: find outliers using z-score
   * Z-score > 2 = outlier (2 standard deviations from mean)
   */
  detectAnomalies(allExpenses, currentMonthExpenses) {
    this.think('Running anomaly detection (statistical analysis)...');

    const anomalies = [];
    const categories = {};

    // Group historical by category
    allExpenses.forEach(exp => {
      if (!categories[exp.category]) {
        categories[exp.category] = [];
      }
      categories[exp.category].push(exp.amount);
    });

    // Analyze each category
    Object.keys(categories).forEach(category => {
      const amounts = categories[category];
      
      // Calculate mean and std dev
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      // Check current month transactions
      const currentCatExpenses = currentMonthExpenses.filter(e => e.category === category);
      currentCatExpenses.forEach(exp => {
        const zScore = (exp.amount - mean) / (stdDev || 1);

        if (Math.abs(zScore) > 2) {
          anomalies.push({
            category,
            description: exp.description,
            amount: exp.amount.toFixed(2),
            expectedRange: `$${Math.max(0, mean - 2 * stdDev).toFixed(2)} - $${(mean + 2 * stdDev).toFixed(2)}`,
            zScore: zScore.toFixed(2),
            severity: Math.abs(zScore) > 3 ? 'High' : 'Medium',
            date: exp.date
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * DETECT BEHAVIORAL CHANGES
   * Compare spending patterns month-to-month
   */
  detectBehavioralChanges(allExpenses) {
    this.think('Analyzing behavioral changes...');

    const changes = [];

    // Get last 3 months
    const now = new Date();
    const months = [];
    for (let i = 0; i < 3; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthExpenses = allExpenses.filter(e => e.date >= start && e.date < end);
      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      months.push({
        month: i === 0 ? 'Current' : `${i} month(s) ago`,
        total: total.toFixed(2),
        count: monthExpenses.length
      });
    }

    // Compare current to average of previous 2 months
    if (months.length === 3) {
      const previousAvg = (parseFloat(months[1].total) + parseFloat(months[2].total)) / 2;
      const current = parseFloat(months[0].total);
      const change = ((current - previousAvg) / previousAvg) * 100;

      if (Math.abs(change) > 20) {
        changes.push({
          type: change > 0 ? 'Increase' : 'Decrease',
          percentage: Math.abs(change).toFixed(1),
          previousAverage: previousAvg.toFixed(2),
          current: current.toFixed(2),
          severity: Math.abs(change) > 50 ? 'High' : 'Medium',
          insight: change > 0 
            ? `Spending increased by ${Math.abs(change).toFixed(1)}% compared to average` 
            : `Spending decreased by ${Math.abs(change).toFixed(1)}%`
        });
      }
    }

    return changes;
  }

  /**
   * GENERATE ALERTS
   * Convert risks into actionable alerts
   */
  generateAlerts(anomalies, changes) {
    this.think('Generating risk alerts...');

    const alerts = [];

    // High-value anomalies
    anomalies.forEach(anom => {
      if (anom.severity === 'High') {
        alerts.push({
          level: 'High',
          title: `Unusual ${anom.category} spending`,
          message: `Transaction of $${anom.amount} is unusual (expected: ${anom.expectedRange})`,
          action: 'Review this transaction - could be fraud'
        });
      }
    });

    // Behavioral changes
    changes.forEach(change => {
      alerts.push({
        level: change.severity,
        title: `Spending ${change.type}`,
        message: `Your spending ${change.type.toLowerCase()}ed by ${change.percentage}% this month`,
        action: `Current: $${change.current} vs Average: $${change.previousAverage}`
      });
    });

    return alerts;
  }

  /**
   * CALCULATE OVERALL RISK LEVEL
   * Aggregate all risks into single score
   */
  calculateRiskLevel(anomalies, changes) {
    this.think('Calculating overall risk level...');

    let riskScore = 0;

    // High anomalies: 30 points each
    const highAnomalies = anomalies.filter(a => a.severity === 'High').length;
    riskScore += highAnomalies * 30;

    // Medium anomalies: 10 points each
    const mediumAnomalies = anomalies.filter(a => a.severity === 'Medium').length;
    riskScore += mediumAnomalies * 10;

    // Behavioral changes: 20 points each
    const highChanges = changes.filter(c => c.severity === 'High').length;
    riskScore += highChanges * 20;

    riskScore = Math.min(100, riskScore); // Cap at 100

    const level = riskScore >= 80 ? 'Critical' : riskScore >= 50 ? 'High' : riskScore >= 20 ? 'Medium' : 'Low';

    return {
      score: riskScore,
      level,
      status: riskScore > 20 ? '⚠️ Needs Attention' : '✅ Normal'
    };
  }

  /**
   * QUICK RISK CHECK
   * Fast check of today's transactions
   */
  async quickRiskCheck() {
    this.think('Quick risk check on today\'s transactions...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayExpenses = await Expense.find({
        userId: this.userId,
        date: { $gte: today }
      });

      this.think(`Today: ${todayExpenses.length} transactions`);

      let risk = false;
      const alerts = [];

      // Check for unusually high amount
      todayExpenses.forEach(exp => {
        if (exp.amount > 200) {
          risk = true;
          alerts.push({
            type: 'High Amount',
            description: `${exp.description} ($${exp.amount})`,
            message: 'Large transaction detected'
          });
        }
      });

      return {
        agent: this.name,
        hasRisk: risk,
        alerts,
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

module.exports = RiskAgent;
