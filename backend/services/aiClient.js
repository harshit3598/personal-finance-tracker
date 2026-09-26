/**
 * Shared AI client
 *
 * All AI calls in the app go through this one client, so switching providers
 * is a single-file change. Currently wired to Groq's free OpenAI-compatible
 * endpoint (https://api.groq.com/openai/v1) with Llama 3.3 70B.
 *
 * Override via env vars if you ever switch providers:
 *   OPENAI_BASE_URL  - e.g. https://api.openai.com/v1 or https://api.mistral.ai/v1
 *   AI_MODEL         - e.g. gpt-3.5-turbo, open-mistral-nemo, gemini-2.0-flash
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1'
});

const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b';

module.exports = { openai, AI_MODEL };
