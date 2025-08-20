/**
 * Note operations for Deals
 */
import {
  getObjectNotes,
  createObjectNote,
} from '../../api/operations/index.js';
import { ResourceType, AttioNote } from '../../types/attio.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import { isValidId } from '../../utils/validation.js';

/**
 * Gets notes for a specific deal
 *
 * @param dealId - ID of the deal
 * @param limit - Maximum number of notes to return (default: 10)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of notes
 */
export async function getDealNotes(
  dealId: string,
  limit: number = 10,
  offset: number = 0
): Promise<AttioNote[]> {
  try {
    if (!isValidId(dealId)) {
      throw new FilterValidationError(`Invalid deal ID: ${dealId}`);
    }

    return await getObjectNotes(ResourceType.DEALS, dealId, limit, offset);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Note retrieval validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to get deal notes: ${errorMessage}`);
  }
}

/**
 * Creates a note for a deal
 *
 * @param dealId - ID of the deal
 * @param title - Title of the note
 * @param content - Content of the note
 * @returns Created note
 */
export async function createDealNote(
  dealId: string,
  title: string,
  content: string
): Promise<AttioNote> {
  try {
    if (!isValidId(dealId)) {
      throw new FilterValidationError(`Invalid deal ID: ${dealId}`);
    }

    if (!title || title.trim().length === 0) {
      throw new FilterValidationError('Note title cannot be empty');
    }

    if (!content || content.trim().length === 0) {
      throw new FilterValidationError('Note content cannot be empty');
    }

    return await createObjectNote(ResourceType.DEALS, dealId, title, content);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Note creation validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to create deal note: ${errorMessage}`);
  }
}
