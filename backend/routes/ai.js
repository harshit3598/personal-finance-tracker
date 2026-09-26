/**
 * AI Agent Routes
 * 
 * These endpoints expose AI capabilities to the frontend:
 * - POST /api/ai/categorize - Categorize an expense
 * - POST /api/ai/suggest-category - Get multiple category suggestions
 * - GET /api/ai/categories - List all available categories
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { categorizeExpense, EXPENSE_CATEGORIES } = require('../services/aiService');

/**
 * Endpoint: POST /api/ai/categorize
 * Categorizes a single expense using AI
 * 
 * Request body:
 * {
 *   "description": "Starbucks Coffee",
 *   "amount": 5.50
 * }
 * 
 * Response:
 * {
 *   "category": "Food",
 *   "confidence": 0.95,
 *   "reasoning": "Starbucks is a coffee shop..."
 * }
 */
router.post('/categorize', auth, async (req, res) => {
  try {
    const { description, amount } = req.body;

    // Validate input
    if (!description || description.trim() === '') {
      return res.status(400).json({ 
        error: 'Description is required' 
      });
    }

    const amountNum = Number(amount);
    if (!isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        error: 'Valid amount is required' 
      });
    }

    // Call the AI service
    const result = await categorizeExpense(description.trim(), amountNum);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Categorization error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to categorize expense' 
    });
  }
});

/**
 * Endpoint: GET /api/ai/categories
 * Returns list of available expense categories
 * 
 * Response:
 * {
 *   "categories": ["Food", "Transport", "Entertainment", ...]
 * }
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: EXPENSE_CATEGORIES
  });
});

/**
 * Endpoint: POST /api/ai/test
 * Test endpoint to verify AI service is working
 * Used for debugging and testing
 */
router.post('/test', auth, async (req, res) => {
  try {
    // Test with a simple categorization
    const result = await categorizeExpense('Test Expense', 10);
    
    res.json({
      success: true,
      message: 'AI Service is working correctly',
      testResult: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'AI Service test failed',
      error: error.message
    });
  }
});

module.exports = router;
