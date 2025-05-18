/**
 * Note operations for Attio objects
 * Handles note creation and retrieval
 */
import { AttioNote, ResourceType } from '../../types/attio.js';
import { RetryConfig } from './retry.js';
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
export declare function getObjectNotes(objectType: ResourceType, recordId: string, limit?: number, offset?: number, retryConfig?: Partial<RetryConfig>): Promise<AttioNote[]>;
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
export declare function createObjectNote(objectType: ResourceType, recordId: string, noteTitle: string, noteText: string, retryConfig?: Partial<RetryConfig>): Promise<AttioNote>;
//# sourceMappingURL=notes.d.ts.map