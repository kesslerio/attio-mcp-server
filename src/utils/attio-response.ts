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
  if (!note) {
    // return a minimal shape instead of null to avoid `.id` reads exploding
    return { id: { note_id: null, record_id: null, workspace_id: null } };
  }

  const idObj = note?.id;
  const rawId =
    typeof idObj === 'object'
      ? (idObj?.note_id ?? idObj?.record_id ?? idObj?.id)
      : (idObj ?? note?.note_id ?? note?.record_id ?? note?.id ?? null);

  const normalized = {
    id: {
      note_id: rawId,
      workspace_id:
        (typeof idObj === 'object'
          ? idObj?.workspace_id
          : note?.workspace_id) ?? null,
      record_id: rawId, // alias for tests
    },
    parent_object: note?.parent_object ?? null,
    parent_record_id: note?.parent_record_id ?? null,
    title: note?.title ?? null,
    content_markdown: note?.content_markdown ?? null,
    content_plaintext: note?.content_plaintext ?? null,
    content: note?.content_markdown || note?.content_plaintext || '',
    created_at: note?.created_at ?? null,
    updated_at: note?.updated_at ?? null,
    tags: Array.isArray(note?.tags) ? note.tags : [],
    meeting_id: note?.meeting_id ?? null,
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
