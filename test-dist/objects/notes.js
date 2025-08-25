/**
 * Notes operations for Attio API
 *
 * Notes are first-class resources under /v2/notes (NOT /objects/notes/records)
 * They link to records via parent_object + parent_record_id
 */
import { getAttioClient } from '../api/attio-client.js';
import { UniversalValidationError, ErrorType, } from '../handlers/tool-configs/universal/schemas.js';
import { createRecordNotFoundError } from '../utils/validation/uuid-validation.js';
import { debug } from '../utils/logger.js';
/**
 * Create a note linked to a record
 */
export async function createNote(body) {
    debug('notes', 'Creating note', {
        parent_object: body.parent_object,
        parent_record_id: body.parent_record_id,
        hasContent: !!body.content,
        format: body.format || 'plaintext',
    });
    // Validate required fields
    if (!body.content || !body.content.trim()) {
        throw new UniversalValidationError('Content is required and cannot be empty', ErrorType.USER_ERROR, { field: 'content' });
    }
    if (!body.parent_object) {
        throw new UniversalValidationError('parent_object is required (companies or people)', ErrorType.USER_ERROR, { field: 'parent_object' });
    }
    if (!body.parent_record_id) {
        throw new UniversalValidationError('parent_record_id is required', ErrorType.USER_ERROR, { field: 'parent_record_id' });
    }
    const api = getAttioClient();
    try {
        const response = await api.post('/notes', { data: body });
        return response.data;
    }
    catch (error) {
        debug('notes', 'Create note failed', { error: error.message });
        // Map HTTP errors to universal validation errors
        if (error.response?.status === 422) {
            throw new UniversalValidationError(`Validation failed: ${error.response?.data?.message || 'Invalid note data'}`, ErrorType.USER_ERROR, { field: 'content' });
        }
        if (error.response?.status === 404) {
            throw createRecordNotFoundError(body.parent_record_id, body.parent_object);
        }
        throw error;
    }
}
/**
 * List notes with optional filtering
 */
export async function listNotes(query = {}) {
    debug('notes', 'Listing notes', query);
    const api = getAttioClient();
    try {
        const response = await api.get('/notes', { params: query });
        return response.data;
    }
    catch (error) {
        debug('notes', 'List notes failed', { error: error.message });
        throw error;
    }
}
/**
 * Get a specific note by ID
 */
export async function getNote(noteId) {
    debug('notes', 'Getting note', { noteId });
    if (!noteId) {
        throw new UniversalValidationError('Note ID is required', ErrorType.USER_ERROR, { field: 'note_id' });
    }
    const api = getAttioClient();
    try {
        const response = await api.get(`/notes/${noteId}`);
        return response.data;
    }
    catch (error) {
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
export async function deleteNote(noteId) {
    debug('notes', 'Deleting note', { noteId });
    if (!noteId) {
        throw new UniversalValidationError('Note ID is required', ErrorType.USER_ERROR, { field: 'note_id' });
    }
    const api = getAttioClient();
    try {
        await api.delete(`/notes/${noteId}`);
        return { success: true };
    }
    catch (error) {
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
export function normalizeNoteResponse(note) {
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
