/**
 * AI Service for Expense Categorization
 * 
 * This service uses OpenAI's API to intelligently categorize expenses
 * based on description and amount. It acts as an AI Agent that:
 * 1. Analyzes the expense description
 * 2. Understands the spending context
 * 3. Suggests the most likely category
 * 4. Provides confidence scores
 */

// Shared AI client (Groq free tier, OpenAI-compatible)
const { openai, AI_MODEL } = require('./aiClient');
const { parseJsonFromLLM } = require('./llmJson');

// Define available categories
const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Education',
  'Other'
];

/**
 * Categorize an expense using AI
 * @param {string} description - The expense description (e.g., "Starbucks Coffee")
 * @param {number} amount - The amount spent
 * @returns {Promise<{category: string, confidence: number, reasoning: string}>}
 */
async function categorizeExpense(description, amount) {
  try {
    // Create a prompt that tells the AI to categorize the expense
    const systemPrompt = `You are an intelligent expense categorizer. 
Your job is to categorize expenses into one of these categories: ${EXPENSE_CATEGORIES.join(', ')}.

Respond ONLY with valid JSON in this format:
{
  "category": "one of the categories",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}

Be smart about merchant names and spending patterns. For example:
- "Uber" or "Lyft" → Transport
- "Starbucks" or "McDonald's" → Food
- "Netflix" or "MoviePass" → Entertainment
- "Electric bill" or "Water bill" → Utilities
`;

    const userPrompt = `Categorize this expense:
Description: "${description}"
Amount: $${amount}

Return ONLY valid JSON, no other text.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: AI_MODEL, // Llama 3.3 70B on Groq — fast and free
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3, // Lower temperature = more consistent/predictable
      max_tokens: 200
    });

    // Extract the response and parse defensively (LLMs may wrap JSON in fences/prose)
    const content = response.choices[0]?.message?.content?.trim() || '';
    const result = parseJsonFromLLM(content);

    if (!result || !EXPENSE_CATEGORIES.includes(result.category)) {
      throw new Error(`AI returned an invalid category: ${result?.category ?? content.slice(0, 80)}`);
    }

    return {
      category: result.category,
      confidence: result.confidence || 0.8,
      reasoning: result.reasoning || 'Categorized by AI'
    };
  } catch (error) {
    console.error('Error in categorizeExpense:', error.message);
    throw new Error(`Failed to categorize expense: ${error.message}`);
  }
}

/**
 * Get smart suggestions for budget limits based on historical data
 * @param {Array} expenses - Array of user's expenses
 * @returns {Promise<{suggestedBudgets: Object}>}
 */
async function suggestBudgets(expenses) {
  try {
    // Calculate current spending by category
    const categorySpending = {};
    EXPENSE_CATEGORIES.forEach(cat => {
      const amount = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      categorySpending[cat] = amount;
    });

    const prompt = `Based on this spending data, suggest monthly budget limits for each category:
${JSON.stringify(categorySpending, null, 2)}

Return ONLY valid JSON with suggested limits for each category. Be realistic but encourage savings.`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content?.trim() || '';
    const result = parseJsonFromLLM(content);
    if (!result) {
      throw new Error('AI did not return valid JSON');
    }
    // Sanitize: keep only known categories with numeric limits
    const clean = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      const val = Number(result[cat]);
      if (isFinite(val) && val >= 0) clean[cat] = Math.round(val * 100) / 100;
    });
    return clean;
  } catch (error) {
    console.error('Error in suggestBudgets:', error.message);
    throw new Error(`Failed to suggest budgets: ${error.message}`);
  }
}

module.exports = {
  categorizeExpense,
  suggestBudgets,
  EXPENSE_CATEGORIES
};
