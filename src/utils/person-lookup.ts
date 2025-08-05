/**
 * Utility functions for looking up people and handling person references
 */

import { CompanyOperationError } from '../errors/company-errors.js';
import { searchPeople } from '../objects/people/search.js';

/**
 * Person ID validation regex
 * Matches person_<alphanumeric> with minimum 10 characters after prefix
 */
export const PERSON_ID_PATTERN = /^person_[a-zA-Z0-9]{10,}$/;

/**
 * Interface for a record reference in Attio API format
 */
export interface RecordReference {
  target_record_id: string;
  target_object: string;
}

/**
 * Finds a person by name or validates a Person Record ID
 *
 * This utility function helps with looking up people for record references.
 * It handles both:
 * 1. Direct Person Record IDs (e.g., "person_01h8g3j5k7m9n1p3r")
 * 2. Person names, which will be searched in Attio
 *
 * @param value - Either a Person Record ID or a person name
 * @param operationContext - Context information for error messages
 * @param recordIdType - Type of record the error is associated with (e.g., "company")
 * @param recordId - ID of the record (e.g., company ID)
 * @returns Formatted record reference for the Attio API
 * @throws CompanyOperationError if person lookup fails or multiple matches found
 */
export async function findPersonReference(
  value: string,
  operationContext: string,
  recordIdType: string,
  recordId: string
): Promise<RecordReference[]> {
  // Check if it's already a valid Person Record ID
  if (PERSON_ID_PATTERN.test(value)) {
    return [{ target_record_id: value, target_object: 'people' }];
  }

  // It's a name, try to find the person by name
  try {
    const people = await searchPeople(value);

    if (people.length === 0) {
      throw new CompanyOperationError(
        operationContext,
        recordId,
        `Person named "${value}" not found. Please provide an exact name or a valid Person Record ID (e.g., person_xxxxxxxxxxxx).`
      );
    }

    if (people.length > 1) {
      const names = people
        .map((p: any) => p.values.name?.[0]?.value || 'Unknown Name')
        .join(', ');
      throw new CompanyOperationError(
        operationContext,
        recordId,
        `Multiple people found for "${value}": [${names}]. Please provide a more specific name or the Person Record ID.`
      );
    }

    const person = people[0];
    const personRecordId = person.id?.record_id;

    if (!personRecordId) {
      throw new CompanyOperationError(
        operationContext,
        recordId,
        `Could not retrieve Record ID for person "${value}".`
      );
    }

    return [{ target_record_id: personRecordId, target_object: 'people' }];
  } catch (searchError) {
    // Pass through CompanyOperationError
    if (searchError instanceof CompanyOperationError) {
      throw searchError;
    }

    // Wrap other errors
    throw new CompanyOperationError(
      operationContext,
      recordId,
      `Failed to search for person "${value}": ${
        searchError instanceof Error ? searchError.message : String(searchError)
      }`
    );
  }
}

/**
 * Clears a person reference by returning an empty array
 *
 * @returns Empty array representing cleared person reference
 */
export function clearPersonReference(): RecordReference[] {
  return [];
}
