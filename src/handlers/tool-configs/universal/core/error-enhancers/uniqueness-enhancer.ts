/**
 * Uniqueness Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 * Issue #990 - Enhanced uniqueness constraint violation handling
 *
 * Detects uniqueness/duplicate errors and attempts to find the
 * conflicting record to provide actionable guidance.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';
import { getSingularResourceType } from '@/handlers/tool-configs/universal/shared-handlers.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { sanitizedLog } from '@/handlers/tool-configs/universal/core/pii-sanitizer.js';
import { createScopedLogger } from '@/utils/logger.js';

const logger = createScopedLogger('uniqueness-enhancer');

/**
 * Configuration for unique field searchers per resource type
 */
interface UniqueFieldSearcher {
  fields: string[];
  search: (
    value: string
  ) => Promise<Array<{ id?: { record_id?: string }; values?: unknown }>>;
}

/**
 * Searches for conflicting record when uniqueness constraint violation occurs
 */
async function enhanceUniquenessErrorWithSearch(
  resourceType: string,
  recordData: Record<string, unknown>
): Promise<string | null> {
  const UNIQUE_FIELD_SEARCHERS: Record<string, UniqueFieldSearcher> = {
    companies: {
      fields: ['domains', 'domain'],
      search: async (value: string) => {
        const { searchCompaniesByDomain } =
          await import('@/objects/companies/search.js');
        return searchCompaniesByDomain(value);
      },
    },
    people: {
      fields: ['email_addresses', 'email', 'emails'],
      search: async (value: string) => {
        const { searchPeopleByEmail } =
          await import('@/objects/people/search.js');
        return searchPeopleByEmail(value);
      },
    },
  };

  const searcher = UNIQUE_FIELD_SEARCHERS[resourceType.toLowerCase()];
  if (!searcher) return null;

  // Find which unique field has a value in recordData
  for (const field of searcher.fields) {
    let searchValue = recordData[field];

    // Handle array format (e.g., domains: ["example.com"])
    if (Array.isArray(searchValue) && searchValue.length > 0) {
      searchValue = searchValue[0];
    }

    // Handle object format for emails (e.g., email_addresses: [{email_address: "..."}])
    if (
      searchValue &&
      typeof searchValue === 'object' &&
      !Array.isArray(searchValue)
    ) {
      const obj = searchValue as Record<string, unknown>;
      searchValue = obj.email_address || obj.email || obj.value;
    }

    if (searchValue && typeof searchValue === 'string') {
      try {
        const existing = await searcher.search(searchValue);
        if (existing && existing.length > 0) {
          const recordId = existing[0]?.id?.record_id;
          if (recordId) {
            return formatUniquenessErrorMessage(
              resourceType,
              field,
              searchValue,
              recordId
            );
          }
        }
      } catch (err) {
        // Search failed, log and continue to fallback
        sanitizedLog(logger, 'debug', 'Uniqueness search failed', {
          resourceType,
          field,
          error: String(err),
        });
      }
    }
  }

  return null;
}

/**
 * Formats actionable error message for uniqueness constraint violations
 */
function formatUniquenessErrorMessage(
  resourceType: string,
  field: string,
  value: string,
  recordId: string
): string {
  const singular = getSingularResourceType(
    resourceType as UniversalResourceType
  );

  return (
    `Uniqueness conflict on "${field}": value "${value}" already exists on ${singular} record.\n\n` +
    `EXISTING RECORD ID: ${recordId}\n\n` +
    `OPTIONS:\n` +
    `1. Update existing: update-record(resource_type="${resourceType}", record_id="${recordId}", record_data={...})\n` +
    `2. View existing: records_get_details(resource_type="${resourceType}", record_id="${recordId}")\n` +
    `3. Use a different ${field} value`
  );
}

/**
 * Uniqueness Enhancer
 * Detects duplicate/uniqueness constraint violations and finds the conflicting record
 */
export const uniquenessEnhancer: ErrorEnhancer = {
  name: 'uniqueness',
  errorName: 'duplicate_error',

  matches: (error: unknown, _context: CrudErrorContext): boolean => {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      msg.includes('duplicate') ||
      msg.toLowerCase().includes('uniqueness constraint')
    );
  },

  enhance: async (
    _error: unknown,
    context: CrudErrorContext
  ): Promise<string | null> => {
    const { resourceType, recordData } = context;

    if (!recordData) return null;

    // Try to find and identify the conflicting record
    const enhancedMessage = await enhanceUniquenessErrorWithSearch(
      resourceType,
      recordData
    );

    if (enhancedMessage) {
      return enhancedMessage;
    }

    // Fallback message if we couldn't find the specific record
    return 'A record with similar data already exists. Check unique fields like domains or email_addresses.';
  },
};
