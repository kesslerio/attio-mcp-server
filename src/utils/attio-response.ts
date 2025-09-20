/**
 * Utilities for handling Attio API responses
 *
 * Handles both Axios (res.data) and fetch/mock response formats
 */

/**
 * Interface for API response envelope
 */
interface ApiResponseEnvelope {
  data?: unknown;
  error?: unknown;
}

/**
 * Interface for raw note data from API
 */
interface RawNoteData {
  id?:
    | {
        note_id?: string;
        record_id?: string;
        workspace_id?: string;
        id?: string;
      }
    | string;
  note_id?: string;
  record_id?: string;
  workspace_id?: string;
  parent_object?: string;
  parent_record_id?: string;
  title?: string;
  content_markdown?: string;
  content_plaintext?: string;
  created_at?: string;
  updated_at?: string;
  tags?: unknown[];
  meeting_id?: string;
  format?: string;
}

/**
 * Interface for normalized note structure
 */
export interface NormalizedNote extends Record<string, unknown> {
  id: {
    note_id: string | null;
    workspace_id: string | null;
    record_id: string | null;
  };
  parent_object: string | null;
  parent_record_id: string | null;
  title: string | null;
  content_markdown: string | null;
  content_plaintext: string | null;
  content: string;
  created_at: string | null;
  updated_at: string | null;
  tags: unknown[];
  meeting_id: string | null;
  format: string;
}

/**
 * Safely unwrap Attio API response envelope
 * Handles both Axios responses and direct API responses
 */
export function unwrapAttio<T>(res: unknown): T {
  const responseEnvelope = res as ApiResponseEnvelope;
  const envelope = responseEnvelope?.data ?? res;
  const envelopeObj = envelope as ApiResponseEnvelope;
  // If the envelope clearly looks like an error, just return it as-is and let the caller detect it
  if (envelopeObj?.error && !envelopeObj?.data) return envelope as T;
  return (envelopeObj?.data ?? envelope) as T;
}

/**
 * Normalize Attio note to consistent structure
 * Provides compatibility with record-style tests via record_id alias
 */
export function normalizeNote(note: RawNoteData): NormalizedNote {
  // Ensure we always have a base object to work with
  const source = note || {};
  const idObj = source.id || {};

  // Simplify ID extraction
  const rawId =
    source.note_id ||
    source.record_id ||
    (typeof idObj === 'object' && idObj !== null ? idObj.note_id : null) ||
    (typeof idObj === 'object' && idObj !== null ? idObj.record_id : null) ||
    (typeof idObj === 'object' && idObj !== null ? idObj.id : null) ||
    (typeof source.id === 'string' ? source.id : null);

  const normalized = {
    id: {
      note_id: rawId,
      workspace_id:
        source.workspace_id ||
        (typeof idObj === 'object' && idObj !== null
          ? idObj.workspace_id
          : null) ||
        null,
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
export function normalizeNotes(notes: RawNoteData[]): NormalizedNote[] {
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
