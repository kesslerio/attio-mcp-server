/**
 * Extract text content from Claude Code Action execution files
 *
 * Handles both JSON array format (pretty-printed) and NDJSON fallback.
 * Prevents duplicate text when both streaming deltas and final messages are present.
 */

/**
 * Extract all text from a Claude session log
 * @param {string} raw - Raw file content (with BOM already stripped)
 * @returns {string[]} - Array of text chunks
 */
function extractAllTextFromSession(raw) {
  const chunks = [];
  const state = { sawStream: false };
  let sessionLog;

  try {
    sessionLog = JSON.parse(raw);
  } catch {
    // NDJSON fallback
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        extractTextFromEntry(parsed, chunks, state);
      } catch {}
    }
    return chunks;
  }

  if (Array.isArray(sessionLog)) {
    for (const entry of sessionLog) {
      extractTextFromEntry(entry, chunks, state);
    }
  }
  return chunks;
}

/**
 * Extract text from a single session entry (non-lossy)
 * @param {object} entry - Session log entry
 * @param {string[]} out - Output array for text chunks
 * @param {object} state - State object to track streaming
 */
function extractTextFromEntry(entry, out, state = { sawStream: false }) {
  // Streaming deltas
  if (entry?.type === 'content_block_delta' && entry?.delta?.text) {
    state.sawStream = true;
    out.push(entry.delta.text);
  }
  if (entry?.delta?.text) {
    state.sawStream = true;
    out.push(entry.delta.text);
  }

  // Simple text fields (rare but cheap)
  if (typeof entry?.text === 'string') out.push(entry.text);

  // Content arrays: handle both message.content and direct content
  const content = entry?.message?.content ?? entry?.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'text' && typeof block.text === 'string') {
        // If we already saw streaming text, skip the top-level text block
        // to avoid duplicating the final message. Tool results still included below.
        if (!state.sawStream) out.push(block.text);
      } else if (
        block?.type === 'tool_result' &&
        Array.isArray(block?.content)
      ) {
        for (const inner of block.content) {
          if (inner?.type === 'text' && typeof inner.text === 'string') {
            out.push(inner.text);
          }
        }
      }
    }
  }
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
