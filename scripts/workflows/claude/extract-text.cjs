/**
 * Extract text content from Claude Code Action execution files
 *
 * Handles both JSON array format (pretty-printed) and NDJSON fallback.
 * Extracts ONLY the final assistant response, not intermediate tool-call chatter.
 */

/**
 * Check if a message contains tool_use blocks
 * @param {object} entry - Session log entry
 * @returns {boolean}
 */
function hasToolUse(entry) {
  const content = entry?.message?.content ?? entry?.content;
  if (!Array.isArray(content)) return false;
  return content.some((block) => block?.type === 'tool_use');
}

/**
 * Extract text content from a message's content array
 * @param {object} entry - Session log entry
 * @returns {string|null}
 */
function extractTextContent(entry) {
  const content = entry?.message?.content ?? entry?.content;
  if (!Array.isArray(content)) {
    if (typeof entry?.text === 'string') return entry.text;
    return null;
  }

  const textBlocks = content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text);

  return textBlocks.length > 0 ? textBlocks.join('\n') : null;
}

/**
 * Check if entry is an assistant message
 * @param {object} entry - Session log entry
 * @returns {boolean}
 */
function isAssistantMessage(entry) {
  // Check for message wrapper or direct role
  const role = entry?.message?.role ?? entry?.role;
  return role === 'assistant';
}

/**
 * Extract all text from a Claude session log
 * Priority: Last assistant message without tool_use > Last assistant message with text
 * @param {string} raw - Raw file content (with BOM already stripped)
 * @returns {string[]} - Array of text chunks
 */
function extractAllTextFromSession(raw) {
  let sessionLog;
  const entries = [];

  try {
    sessionLog = JSON.parse(raw);
  } catch {
    // NDJSON fallback
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed));
      } catch {}
    }
  }

  if (sessionLog && Array.isArray(sessionLog)) {
    entries.push(...sessionLog);
  }

  // Strategy: Find the last assistant message that is a "final" response
  // A final response is one that has text content and no tool_use blocks
  // If none found, fall back to the last assistant message with any text

  let lastFinalResponse = null;
  let lastAnyResponse = null;

  for (const entry of entries) {
    if (!isAssistantMessage(entry)) continue;

    const text = extractTextContent(entry);
    if (!text) continue;

    lastAnyResponse = text;

    // If this message has no tool_use, it's a final response candidate
    if (!hasToolUse(entry)) {
      lastFinalResponse = text;
    }
  }

  // Prefer the last final response (no tool_use), otherwise use last any response
  const result = lastFinalResponse || lastAnyResponse;
  return result ? [result] : [];
}

/**
 * Remove adjacent duplicate chunks
 * @param {string[]} arr - Array of text chunks
 * @returns {string[]} - Deduplicated array
 */
function dedupeAdjacent(arr) {
  const out = [];
  for (const s of arr) {
    if (!out.length || out[out.length - 1] !== s) out.push(s);
  }
  return out;
}

module.exports = { extractAllTextFromSession, dedupeAdjacent };
