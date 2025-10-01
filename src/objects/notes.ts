/**
 * Notes operations for Attio API
 *
 * Notes are first-class resources under /v2/notes (NOT /objects/notes/records)
 * They link to records via parent_object + parent_record_id
 */

import { getLazyAttioClient } from '../api/lazy-client.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../handlers/tool-configs/universal/schemas.js';
import type { AttioNote } from '../types/attio.js';
import { createRecordNotFoundError } from '../utils/validation/uuid-validation.js';
import { debug } from '../utils/logger.js';
import {
  getErrorStatus,
  getErrorMessage,
  HttpErrorLike,
} from '../types/error-interfaces.js';

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

  const api = getLazyAttioClient();

  try {
    const response = await api.post('/notes', { data: body });
    const data = response?.data as { data: AttioNote } | undefined;
    if (!data) {
      throw new UniversalValidationError(
        'Note creation returned empty response',
        ErrorType.SYSTEM_ERROR
      );
    }
    return data;
  } catch (error: unknown) {
    debug('notes', 'Create note failed', {
      error: getErrorMessage(error) || 'Unknown error',
    });

    // Map HTTP errors to universal validation errors
    if (getErrorStatus(error) === 422) {
      throw new UniversalValidationError(
        `Validation failed: ${
          (typeof error === 'object' && error !== null
            ? (error as HttpErrorLike).response?.data?.message
            : undefined) || 'Invalid note data'
        }`,
        ErrorType.USER_ERROR,
        { field: 'content' }
      );
    }

    if (getErrorStatus(error) === 404) {
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

  const api = getLazyAttioClient();

  try {
    // Always use the official /notes endpoint with query params.
    // Some environments may not support record-scoped endpoints like
    // /objects/{object}/records/{record}/notes, which can 404.
    // The /notes endpoint accepts filters (parent_object, parent_record_id)
    // and returns an empty array when no notes exist.
    const response = await api.get('/notes', { params: query });
    const res = (response?.data as {
      data?: AttioNote[];
      meta?: { next_cursor?: string };
    }) ?? { data: [] };
    const items = Array.isArray(res.data) ? res.data : [];
    return { data: items, meta: res.meta };
  } catch (error: unknown) {
    debug('notes', 'List notes failed', {
      error: getErrorMessage(error) || 'Unknown error',
    });
    // Prefer returning an empty list on benign 404s for list operations
    const status = getErrorStatus(error);
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

  const api = getLazyAttioClient();

  try {
    const response = await api.get(`/notes/${noteId}`);
    const data = response?.data as { data: AttioNote } | undefined;
    if (!data) {
      throw new UniversalValidationError(
        'Note lookup returned empty response',
        ErrorType.SYSTEM_ERROR
      );
    }
    return data;
  } catch (error: unknown) {
    debug('notes', 'Get note failed', {
      error: getErrorMessage(error) || 'Unknown error',
    });

    if (getErrorStatus(error) === 404) {
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

  const api = getLazyAttioClient();

  try {
    await api.delete(`/notes/${noteId}`);
    return { success: true };
  } catch (error: unknown) {
    debug('notes', 'Delete note failed', {
      error: getErrorMessage(error) || 'Unknown error',
    });

    if (getErrorStatus(error) === 404) {
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
  const noteRecord = note as Record<string, unknown>;
  const meetingIdField =
    'meeting_id' in noteRecord ? noteRecord.meeting_id : undefined;
  const tagsField = 'tags' in noteRecord ? noteRecord.tags : undefined;
  const tags = Array.isArray(tagsField)
    ? (tagsField as unknown[]).filter(
        (tag): tag is string => typeof tag === 'string'
      )
    : [];

  const idObject =
    typeof note.id === 'object' && note.id !== null ? note.id : undefined;
  const derivedRecordId =
    (typeof note.id === 'string' ? note.id : undefined) ??
    note.record_id ??
    note.note_id ??
    idObject?.record_id ??
    idObject?.note_id ??
    idObject?.id ??
    'unknown';

  const title = note.title ?? null;
  const contentMarkdown = note.content_markdown ?? note.content ?? null;
  const contentPlaintext = note.content_plaintext ?? note.content ?? null;
  const parentObject = note.parent_object ?? 'notes';
  const parentRecordId = note.parent_record_id ?? derivedRecordId;
  const createdAt = note.created_at ?? note.timestamp ?? '';

  return {
    id: { record_id: derivedRecordId },
    resource_type: 'notes',
    values: {
      title: title ?? undefined,
      content_markdown: contentMarkdown ?? undefined,
      content_plaintext: contentPlaintext ?? undefined,
      parent_object: parentObject,
      parent_record_id: parentRecordId,
      created_at: createdAt,
      meeting_id:
        typeof meetingIdField === 'string' || meetingIdField === null
          ? meetingIdField
          : null,
      tags,
    },
    raw: note,
  };
}
