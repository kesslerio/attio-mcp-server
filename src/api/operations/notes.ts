/**
 * Note operations for Attio objects
 * Handles note creation and retrieval
 */

import { getLazyAttioClient } from '@/api/lazy-client.js';
import {
  AttioNote,
  ResourceType,
  AttioListResponse,
  AttioSingleResponse,
} from '@/types/attio.js';
import { callWithRetry, RetryConfig } from '@/api/operations/retry.js';

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
export async function getObjectNotes(
  objectType: ResourceType,
  recordId: string,
  limit: number = 10,
  offset: number = 0,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioNote[]> {
  const api = getLazyAttioClient();
  const path = `/notes?limit=${limit}&offset=${offset}&parent_object=${objectType}&parent_record_id=${recordId}`;

  return callWithRetry(async () => {
    const response = await api.get<AttioListResponse<AttioNote>>(path);
    return response?.data?.data || [];
  }, retryConfig);
}

/**
 * Generic function to create a note for any object type
 *
 * @param objectType - The type of parent object (people or companies)
 * @param recordId - ID of the parent record
 * @param noteTitle - Title of the note
 * @param noteText - Content of the note
 * @param format - Content format ('plaintext' | 'markdown'), defaults to 'plaintext'
 * @param retryConfig - Optional retry configuration
 * @returns Created note
 */
export async function createObjectNote(
  objectType: ResourceType,
  recordId: string,
  noteTitle: string,
  noteText: string,
  format: 'plaintext' | 'markdown' = 'plaintext',
  retryConfig?: Partial<RetryConfig>
): Promise<AttioNote> {
  const api = getLazyAttioClient();
  const path = '/notes';

  return callWithRetry(async () => {
    const response = await api.post<AttioSingleResponse<AttioNote>>(path, {
      data: {
        format,
        parent_object: objectType,
        parent_record_id: recordId,
        title: `[AI] ${noteTitle}`,
        content: noteText,
      },
    });
    return (response?.data?.data || response?.data) as AttioNote;
  }, retryConfig);
}
