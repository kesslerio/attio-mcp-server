/**
 * Utilities for handling Attio API responses
 *
 * Handles both Axios (res.data) and fetch/mock response formats
 */

/**
 * Safely unwrap Attio API response envelope
 * Handles both Axios responses and direct API responses
 */
export function unwrapAttio<T>(res: any): T {
  const envelope = res?.data ?? res;
  // If the envelope clearly looks like an error, just return it as-is and let the caller detect it
  if (envelope?.error && !envelope?.data) return envelope as T;
  return (envelope?.data ?? envelope) as T;
}

/**
 * Normalize Attio note to consistent structure
 * Provides compatibility with record-style tests via record_id alias
 */
export function normalizeNote(note: any) {
  // Ensure we always have a base object to work with
  const source = note || {};
  const idObj = source.id || {};

  // Simplify ID extraction
  const rawId =
    source.note_id ||
    source.record_id ||
    idObj.note_id ||
    idObj.record_id ||
    idObj.id ||
    (typeof source.id === 'string' ? source.id : null);

  const normalized = {
    id: {
      note_id: rawId,
      workspace_id: source.workspace_id || idObj.workspace_id || null,
      record_id: rawId, // alias for tests
    },
    parent_object: source.parent_object || null,
    parent_record_id: source.parent_record_id || null,
    title: source.title || null,
    content_markdown: source.content_markdown || null,
    content_plaintext: source.content_plaintext || null,
    content: source.content_markdown || source.content_plaintext || '',
    created_at: source.created_at || null,
    updated_at: source.updated_at || null,
    tags: Array.isArray(source.tags) ? source.tags : [],
    meeting_id: source.meeting_id || null,
    format: source.format || 'markdown',
  };

  return normalized;
}

/**
 * Normalize array of notes
 */
export function normalizeNotes(notes: any[]): any[] {
  if (!Array.isArray(notes)) return [];
  return notes.map(normalizeNote).filter(Boolean);
}

/**
 * Coerce format to Attio-accepted values and preserve content
 */
export function coerceNoteFormat(
  format?: string,
  content?: string
): { format: 'markdown' | 'plaintext'; content: string } {
  // Convert html to markdown to preserve HTML tags, otherwise default to markdown or plaintext
  const attioFormat =
    format === 'html' || format === 'markdown' ? 'markdown' : 'plaintext';

  // Preserve content as-is - tests expect HTML content to be unchanged
  const processedContent = content || '';

  return {
    format: attioFormat,
    content: processedContent,
  };
}
