/**
 * Note operations for People
 */
import {
  createObjectNote,
  getObjectNotes,
} from '../../api/operations/index.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import { type AttioNote, ResourceType } from '../../types/attio.js';
import { isValidId } from '../../utils/validation.js';

/**
 * Gets notes for a specific person
 *
 * @param personId - ID of the person
 * @param limit - Maximum number of notes to return (default: 10)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of notes
 */
export async function getPersonNotes(
  personId: string,
  limit = 10,
  offset = 0
): Promise<AttioNote[]> {
  try {
    if (!isValidId(personId)) {
      throw new FilterValidationError(`Invalid person ID: ${personId}`);
    }

    return await getObjectNotes(ResourceType.PEOPLE, personId, limit, offset);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Note retrieval validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to get person notes: ${errorMessage}`);
  }
}

/**
 * Creates a note for a person
 *
 * @param personId - ID of the person
 * @param title - Title of the note
 * @param content - Content of the note
 * @returns Created note
 */
export async function createPersonNote(
  personId: string,
  title: string,
  content: string
): Promise<AttioNote> {
  try {
    if (!isValidId(personId)) {
      throw new FilterValidationError(`Invalid person ID: ${personId}`);
    }

    if (!title || title.trim().length === 0) {
      throw new FilterValidationError('Note title cannot be empty');
    }

    if (!content || content.trim().length === 0) {
      throw new FilterValidationError('Note content cannot be empty');
    }

    return await createObjectNote(
      ResourceType.PEOPLE,
      personId,
      title,
      content
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Note creation validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to create person note: ${errorMessage}`);
  }
}
