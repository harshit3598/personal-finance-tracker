/**
 * Shared AI helpers.
 * LLMs frequently wrap JSON in markdown fences or add prose — parse defensively.
 */

/**
 * Extract and parse the first JSON object/array found in an LLM response.
 * Handles: raw JSON, ```json fenced blocks, prose-wrapped JSON.
 * Returns null if nothing parseable is found.
 */
function parseJsonFromLLM(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Try direct parse
  try {
    return JSON.parse(text);
  } catch (_) { /* fall through */ }

  // 2. Try fenced block ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) { /* fall through */ }
  }

  // 3. Try first {...} or [...] block
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (_) { /* fall through */ }
  }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch (_) { /* fall through */ }
  }

  return null;
}

module.exports = { parseJsonFromLLM };
