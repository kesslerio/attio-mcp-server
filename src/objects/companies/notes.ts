/**
 * Note operations for companies
 */
import { getLazyAttioClient } from '../../api/lazy-client.js';
import {
  getObjectNotes,
  createObjectNote,
} from '../../api/operations/index.js';
import { ResourceType, AttioNote } from '../../types/attio.js';

/**
 * Gets notes for a specific company
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param limit - Maximum number of notes to fetch (default: 10)
 * @param offset - Number of notes to skip (default: 0)
 * @returns Array of notes
 */
export async function getCompanyNotes(
  companyIdOrUri: string,
  limit: number = 10,
  offset: number = 0
): Promise<AttioNote[]> {
  let companyId: string;

  try {
    // Determine if the input is a URI or a direct ID
    const isUri = companyIdOrUri.startsWith('attio://');

    if (isUri) {
      try {
        // Try to parse the URI formally
        const [resourceType, id] =
          companyIdOrUri.match(/^attio:\/\/([^/]+)\/(.+)$/)?.slice(1) || [];

        if (resourceType !== ResourceType.COMPANIES) {
          throw new Error(
            `Invalid resource type in URI: Expected 'companies', got '${resourceType}'`
          );
        }

        companyId = id;
      } catch (parseError) {
        // Fallback to simple string splitting if formal parsing fails
        const parts = companyIdOrUri.split('/');
        companyId = parts[parts.length - 1];
      }

      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../../utils/logger.js');
        createScopedLogger('companies.notes', 'getCompanyNotes').debug(
          'Extracted company ID from URI',
          { companyId, companyIdOrUri }
        );
      }
    } else {
      // Direct ID was provided
      companyId = companyIdOrUri;

      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../../utils/logger.js');
        createScopedLogger('companies.notes', 'getCompanyNotes').debug(
          'Using direct company ID',
          { companyId }
        );
      }
    }

    // Validate that we have a non-empty ID
    if (!companyId || companyId.trim() === '') {
      throw new Error(`Invalid company ID: ${companyIdOrUri}`);
    }

    // Use the unified operation if available, with fallback to direct implementation
    try {
      return await getObjectNotes(
        ResourceType.COMPANIES,
        companyId,
        limit,
        offset
      );
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../../utils/logger.js');
        createScopedLogger('companies.notes', 'getCompanyNotes').error(
          'Unified operation failed',
          error
        );
      }

      // Fallback implementation with better error handling
      try {
        const api = getLazyAttioClient();
        const path = `/notes?limit=${limit}&offset=${offset}&parent_object=companies&parent_record_id=${companyId}`;

        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('companies.notes', 'getCompanyNotes').warn(
            'Trying direct API call',
            { path }
          );
        }

        const response = await api.get(path);
        return response?.data?.data || [];
      } catch (directError: any) {
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('companies.notes', 'getCompanyNotes').error(
            'All attempts failed',
            new Error('All attempts failed'),
            {
              companyId,
              originalUri: companyIdOrUri,
              errors: {
                unified: error.message || 'Unknown error',
                direct: directError.message || 'Unknown error',
              },
            }
          );
        }

        // Return empty array instead of throwing error when no notes are found
        if (directError.response?.status === 404) {
          return [];
        }

        throw new Error(
          `Could not retrieve notes for company ${companyIdOrUri}: ${
            directError.message || 'Unknown error'
          }`
        );
      }
    }
  } catch (error: unknown) {
    // Catch any errors in the URI parsing logic
    if (error instanceof Error && error.message.includes('match')) {
      throw new Error(
        `Cannot parse company identifier: ${companyIdOrUri}. Use either a direct ID or URI format 'attio://companies/{id}'`
      );
    }
    throw error;
  }
}

/**
 * Creates a note for a specific company
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param title - The title of the note (will be prefixed with "[AI]")
 * @param content - The text content of the note
 * @returns The created note object
 * @throws Error if company ID cannot be parsed or note creation fails
 * @example
 * ```typescript
 * const note = await createCompanyNote("comp_123", "Meeting Notes",
 *   "Discussed Q4 strategy with the team...");
 * ```
 */
export async function createCompanyNote(
  companyIdOrUri: string,
  title: string,
  content: string
): Promise<AttioNote> {
  let companyId: string;

  try {
    // Determine if the input is a URI or a direct ID
    const isUri = companyIdOrUri.startsWith('attio://');

    if (isUri) {
      try {
        // Try to parse the URI formally
        const [resourceType, id] =
          companyIdOrUri.match(/^attio:\/\/([^/]+)\/(.+)$/)?.slice(1) || [];

        if (resourceType !== ResourceType.COMPANIES) {
          throw new Error(
            `Invalid resource type in URI: Expected 'companies', got '${resourceType}'`
          );
        }

        companyId = id;
      } catch (parseError) {
        // Fallback to simple string splitting if formal parsing fails
        const parts = companyIdOrUri.split('/');
        companyId = parts[parts.length - 1];
      }

      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../../utils/logger.js');
        createScopedLogger('companies.notes', 'createCompanyNote').debug(
          'Extracted company ID from URI',
          { companyId, companyIdOrUri }
        );
      }
    } else {
      // Direct ID was provided
      companyId = companyIdOrUri;

      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../../utils/logger.js');
        createScopedLogger('companies.notes', 'createCompanyNote').debug(
          'Using direct company ID',
          { companyId }
        );
      }
    }

    // Validate that we have a non-empty ID
    if (!companyId || companyId.trim() === '') {
      throw new Error(`Invalid company ID: ${companyIdOrUri}`);
    }

    // Use the unified operation if available, with fallback to direct implementation
    try {
      return await createObjectNote(
        ResourceType.COMPANIES,
        companyId,
        title,
        content
      );
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../../utils/logger.js');
        createScopedLogger('companies.notes', 'createCompanyNote').error(
          'Unified operation failed',
          error
        );
      }

      // Fallback implementation with better error handling
      try {
        const api = getLazyAttioClient();
        const path = 'notes';

        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('companies.notes', 'createCompanyNote').warn(
            'Trying direct API call',
            { path }
          );
        }

        const response = await api.post(path, {
          data: {
            format: 'plaintext',
            parent_object: 'companies',
            parent_record_id: companyId,
            title: `[AI] ${title}`,
            content,
          },
        });
        return response.data;
      } catch (directError: any) {
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('companies.notes', 'createCompanyNote').error(
            'All attempts failed',
            new Error('All attempts failed'),
            {
              companyId,
              originalUri: companyIdOrUri,
              errors: {
                unified: error.message || 'Unknown error',
                direct: directError.message || 'Unknown error',
              },
            }
          );
        }

        throw new Error(
          `Could not create note for company ${companyIdOrUri}: ${
            directError.message || 'Unknown error'
          }`
        );
      }
    }
  } catch (error: unknown) {
    // Catch any errors in the URI parsing logic
    if (error instanceof Error && error.message.includes('match')) {
      throw new Error(
        `Cannot parse company identifier: ${companyIdOrUri}. Use either a direct ID or URI format 'attio://companies/{id}'`
      );
    }
    throw error;
  }
}
