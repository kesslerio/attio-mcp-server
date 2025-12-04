/**
 * Extract text content from Claude Code Action execution files
 *
 * Handles both JSON array format (pretty-printed) and NDJSON fallback.
 * Extracts ONLY the final assistant response, not intermediate tool-call chatter.
 *
 * Strategy:
 * 1. Try to find last assistant message WITHOUT tool_use blocks (final response)
 * 2. Fall back to last assistant message WITH text (even if has tool_use)
 * 3. Fall back to streaming deltas if no complete messages found
 *
 * @module extract-text
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
 * Extract all text from a Claude session log.
 *
 * Priority:
 * 1. Last assistant message without tool_use (final response)
 * 2. Last assistant message with text (even with tool_use)
 * 3. Streaming deltas (content_block_delta) as fallback
 *
 * @param {string} raw - Raw file content (with BOM already stripped)
 * @returns {string[]} - Array with 0 or 1 text chunks (single final response by design)
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
  if (result) return [result];

  // Fallback: If no complete assistant messages, try streaming deltas
  // This handles edge cases where --output-format stream-json only has deltas
  const streamingText = extractStreamingDeltas(entries);
  return streamingText ? [streamingText] : [];
}

/**
 * Extract text from streaming delta events (fallback for stream-json output)
 * @param {object[]} entries - Session log entries
 * @returns {string|null} - Concatenated streaming text or null
 */
function extractStreamingDeltas(entries) {
  const deltaTexts = [];

  for (const entry of entries) {
    // Handle content_block_delta events from streaming output
    if (
      entry?.type === 'content_block_delta' &&
      entry?.delta?.type === 'text_delta'
    ) {
      if (typeof entry.delta.text === 'string') {
        deltaTexts.push(entry.delta.text);
      }
    }
  }

  return deltaTexts.length > 0 ? deltaTexts.join('') : null;
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

module.exports = {
  extractAllTextFromSession,
  dedupeAdjacent,
  extractStreamingDeltas,
};
