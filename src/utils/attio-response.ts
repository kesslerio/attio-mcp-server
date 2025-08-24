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
  return (envelope?.data ?? envelope) as T;
}

/**
 * Normalize Attio note to consistent structure
 * Provides compatibility with record-style tests via record_id alias
 */
export function normalizeNote(note: any) {
  if (!note) return null;

  const id = note?.id ?? {};

  const normalized = {
    // Provide both flat ID and record-compatible structure
    id: {
      note_id: id?.note_id ?? id,
      workspace_id: id?.workspace_id,
      record_id: id?.note_id ?? id, // ← Alias for test compatibility
    },
    parent_object: note?.parent_object,
    parent_record_id: note?.parent_record_id,
    title: note?.title,
    content_markdown: note?.content_markdown,
    content_plaintext: note?.content_plaintext,
    content: note?.content_markdown || note?.content_plaintext, // Fallback for tests
    created_at: note?.created_at,
    updated_at: note?.updated_at,
    tags: note?.tags || [],
    meeting_id: note?.meeting_id,
    format: note?.format || 'markdown',
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
  const attioFormat = format === 'markdown' ? 'markdown' : 'plaintext';

  // Preserve content as-is - tests expect HTML content to be unchanged
  const processedContent = content || '';

  return {
    format: attioFormat,
    content: processedContent,
  };
}
