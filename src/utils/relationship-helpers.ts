/**
 * Utility functions for relationship management
 */

/**
 * Extracts a single record ID from a team member (string or object)
 * @param item - Team member that can be string or object
 * @returns Normalized string ID or empty string if invalid
 */
export function extractSingleRecordId(item: TeamMember): string {
  if (typeof item === 'string') {
    return item;
  }

  if (typeof item === 'object' && item !== null) {
    return item.target_record_id || item.record_id || String(item);
  }

  return String(item);
}

/**
 * Type representing a team member that can be either a string ID or an object with target_record_id
 */
export type TeamMember =
  | string
  | { target_record_id?: string; record_id?: string; [key: string]: unknown };

/**
 * Extracts normalized record IDs from team member objects or strings
 * Handles various formats returned by the Attio API
 *
 * @param items - Array of team members (strings or objects)
 * @returns Array of normalized string IDs, filtered to remove empty values
 */
export function extractRecordIds(items: Array<TeamMember>): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item: TeamMember) => {
      if (typeof item === 'string') {
        return item;
      }

      // Handle object cases - try multiple possible ID fields
      if (typeof item === 'object' && item !== null) {
        return item.target_record_id || item.record_id || String(item);
      }

      return String(item);
    })
    .filter(Boolean); // Remove empty/falsy values
}

/**
 * Interface representing the state of a bidirectional relationship
 */
export interface RelationshipState {
  isInTeam: boolean;
  isCompanySet: boolean;
  currentTeamSize: number;
  needsRepair: boolean;
}

/**
 * Analyzes the current state of a company-person relationship
 *
 * @param teamIds - Array of person IDs in the company's team
 * @param personCompany - Company ID set on the person (can be string, object, or null)
 * @param targetPersonId - The person ID we're checking
 * @param targetCompanyId - The company ID we're checking
 * @returns Object describing the relationship state
 */
export function analyzeRelationshipState(
  teamIds: string[],
  personCompany:
    | string
    | { target_record_id?: string; record_id?: string }
    | null,
  targetPersonId: string,
  targetCompanyId: string
): RelationshipState {
  const isInTeam = teamIds.includes(targetPersonId);

  // Normalize person's company field
  let personCompanyId: string | null = null;
  if (typeof personCompany === 'string') {
    personCompanyId = personCompany;
  } else if (personCompany && typeof personCompany === 'object') {
    personCompanyId =
      personCompany.target_record_id || personCompany.record_id || null;
  }

  const isCompanySet = personCompanyId === targetCompanyId;
  const needsRepair = isInTeam !== isCompanySet;

  return {
    isInTeam,
    isCompanySet,
    currentTeamSize: teamIds.length,
    needsRepair,
  };
}

/**
 * Executes bidirectional update operations with retry logic and partial failure handling
 * @param operations - Array of async operations to execute
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Results of all operations
 */
export async function executeWithRetry<T>(
  operations: Array<() => Promise<T>>,
  maxRetries: number = 2
): Promise<T[]> {
  const results: T[] = [];
  const errors: Error[] = [];

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    let lastError: Error | null = null;
    let success = false;

    // Retry logic for each operation
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        results[i] = result;
        success = true;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 100)
          );
        }
      }
    }

    if (!success && lastError) {
      errors.push(lastError);
    }
  }

  // If any operations failed, throw detailed error
  if (errors.length > 0) {
    const failedCount = errors.length;
    const successCount = operations.length - failedCount;

    throw new Error(
      `Bidirectional update partially failed: ${successCount}/${operations.length} operations succeeded. ` +
        `Failures: ${errors.map((e) => e.message).join(', ')}`
    );
  }

  return results;
}
