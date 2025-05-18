/**
 * Note operations for Attio objects
 * Handles note creation and retrieval
 */
import { getAttioClient } from '../attio-client.js';
import { callWithRetry } from './retry.js';
/**
 * Generic function to get notes for a specific record
 *
 * @param objectType - The type of parent object (people or companies)
 * @param recordId - ID of the parent record
 * @param limit - Maximum number of notes to return
 * @param offset - Number of notes to skip
 * @param retryConfig - Optional retry configuration
 * @returns Array of notes
 */
export async function getObjectNotes(objectType, recordId, limit = 10, offset = 0, retryConfig) {
    const api = getAttioClient();
    const path = `/notes?limit=${limit}&offset=${offset}&parent_object=${objectType}&parent_record_id=${recordId}`;
    return callWithRetry(async () => {
        try {
            const response = await api.get(path);
            return response.data.data || [];
        }
        catch (error) {
            // Let upstream handlers create specific, rich error objects.
            throw error;
        }
    }, retryConfig);
}
/**
 * Generic function to create a note for any object type
 *
 * @param objectType - The type of parent object (people or companies)
 * @param recordId - ID of the parent record
 * @param noteTitle - Title of the note
 * @param noteText - Content of the note
 * @param retryConfig - Optional retry configuration
 * @returns Created note
 */
export async function createObjectNote(objectType, recordId, noteTitle, noteText, retryConfig) {
    const api = getAttioClient();
    const path = "/notes";
    return callWithRetry(async () => {
        try {
            const response = await api.post(path, {
                data: {
                    format: "plaintext",
                    parent_object: objectType,
                    parent_record_id: recordId,
                    title: `[AI] ${noteTitle}`,
                    content: noteText
                },
            });
            return response.data.data || response.data;
        }
        catch (error) {
            // Let upstream handlers create specific, rich error objects.
            throw error;
        }
    }, retryConfig);
}
//# sourceMappingURL=notes.js.map