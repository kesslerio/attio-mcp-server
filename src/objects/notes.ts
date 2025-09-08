/**
 * Notes operations for Attio API
 *
 * Notes are first-class resources under /v2/notes (NOT /objects/notes/records)
 * They link to records via parent_object + parent_record_id
 */

import { createRecordNotFoundError } from '../utils/validation/uuid-validation.js';
import { debug } from '../utils/logger.js';
import { getAttioClient } from '../api/attio-client.js';

/**
 * Create note body for Attio API
 */
export interface CreateNoteBody {
  parent_object: string;
  parent_record_id: string;
  title?: string;
  content: string;
  format?: 'markdown' | 'plaintext';
  created_at?: string;
  meeting_id?: string;
}

/**
 * List notes query parameters
 */
export interface ListNotesQuery extends Record<string, unknown> {
  parent_object?: string;
  parent_record_id?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Attio Note response structure
 */
export interface AttioNote {
  id: {
    note_id: string;
  };
  parent_object: string;
  parent_record_id: string;
  title?: string;
  content_markdown?: string;
  content_plaintext?: string;
  format: 'markdown' | 'plaintext';
  created_at: string;
  meeting_id?: string;
  tags: string[];
}

/**
 * Create a note linked to a record
 */
export async function createNote(
  body: CreateNoteBody
): Promise<{ data: AttioNote }> {
  debug('notes', 'Creating note', {
    parent_object: body.parent_object,
    parent_record_id: body.parent_record_id,
    hasContent: !!body.content,
    format: body.format || 'plaintext',
  });

  // Validate required fields
  if (!body.content || !body.content.trim()) {
    throw new UniversalValidationError(
      'Content is required and cannot be empty',
      ErrorType.USER_ERROR,
      { field: 'content' }
    );
  }

  if (
    !body.parent_object ||
    typeof body.parent_object !== 'string' ||
    !body.parent_object.trim()
  ) {
    throw new UniversalValidationError(
      'parent_object is required and must be a valid object slug',
      ErrorType.USER_ERROR,
      { field: 'parent_object' }
    );
  }

  if (!body.parent_record_id) {
    throw new UniversalValidationError(
      'parent_record_id is required',
      ErrorType.USER_ERROR,
      { field: 'parent_record_id' }
    );
  }

  try {
    return response.data;
  } catch (error: unknown) {
    debug('notes', 'Create note failed', { error: error.message });

    // Map HTTP errors to universal validation errors
    if (error.response?.status === 422) {
      throw new UniversalValidationError(
        `Validation failed: ${error.response?.data?.message || 'Invalid note data'}`,
        ErrorType.USER_ERROR,
        { field: 'content' }
      );
    }

    if (error.response?.status === 404) {
      throw createRecordNotFoundError(
        body.parent_record_id,
        body.parent_object
      );
    }

    throw error;
  }
}

/**
 * List notes with optional filtering
 */
export async function listNotes(query: ListNotesQuery = {}): Promise<{
  data: AttioNote[];
  meta?: { next_cursor?: string };
}> {
  debug('notes', 'Listing notes', query);

  try {
    // Always use the official /notes endpoint with query params.
    // Some environments may not support record-scoped endpoints like
    // /objects/{object}/records/{record}/notes, which can 404.
    // The /notes endpoint accepts filters (parent_object, parent_record_id)
    // and returns an empty array when no notes exist.
    // Ensure shape consistency
    if (!Array.isArray(res.data)) {
      return { data: [], meta: undefined };
    }
    return res;
  } catch (error: unknown) {
    debug('notes', 'List notes failed', { error: error.message });
    // Prefer returning an empty list on benign 404s for list operations
    if (status === 404) {
      return { data: [], meta: undefined };
    }
    throw error;
  }
}

/**
 * Get a specific note by ID
 */
export async function getNote(noteId: string): Promise<{ data: AttioNote }> {
  debug('notes', 'Getting note', { noteId });

  if (!noteId) {
    throw new UniversalValidationError(
      'Note ID is required',
      ErrorType.USER_ERROR,
      { field: 'note_id' }
    );
  }

  try {
    return response.data;
  } catch (error: unknown) {
    debug('notes', 'Get note failed', { error: error.message });

    if (error.response?.status === 404) {
      throw createRecordNotFoundError(noteId, 'note');
    }

    throw error;
  }
}

/**
 * Delete a note by ID
 */
export async function deleteNote(
  noteId: string
): Promise<{ success: boolean }> {
  debug('notes', 'Deleting note', { noteId });

  if (!noteId) {
    throw new UniversalValidationError(
      'Note ID is required',
      ErrorType.USER_ERROR,
      { field: 'note_id' }
    );
  }

  try {
    await api.delete(`/notes/${noteId}`);
    return { success: true };
  } catch (error: unknown) {
    debug('notes', 'Delete note failed', { error: error.message });

    if (error.response?.status === 404) {
      throw createRecordNotFoundError(noteId, 'note');
    }

    throw error;
  }
}

/**
 * Normalize note data to universal response format
 */
export function normalizeNoteResponse(note: AttioNote): {
  id: { record_id: string };
  resource_type: 'notes';
  values: {
    title?: string;
    content_markdown?: string;
    content_plaintext?: string;
    parent_object: string;
    parent_record_id: string;
    created_at: string;
    meeting_id?: string | null;
    tags: string[];
  };
  raw: AttioNote;
} {
  return {
    id: { record_id: note.id.note_id },
    resource_type: 'notes',
    values: {
      title: note.title,
      content_markdown: note.content_markdown,
      content_plaintext: note.content_plaintext,
      parent_object: note.parent_object,
      parent_record_id: note.parent_record_id,
      created_at: note.created_at,
      meeting_id: note.meeting_id || null,
      tags: note.tags || [],
    },
    raw: note,
  };
}
