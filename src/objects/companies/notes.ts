/**
 * Note operations for companies
 */
import { getLazyAttioClient } from '../../api/lazy-client.js';
import {
  getObjectNotes,
  createObjectNote,
} from '../../api/operations/index.js';
import { ResourceType, AttioNote } from '../../types/attio.js';

interface HttpErrorLike {
  response?: {
    status?: number;
  };
  message?: string;
}

function getStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const candidate = error as HttpErrorLike;
  const status = candidate.response?.status;
  return typeof status === 'number' ? status : undefined;
}

function getMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    return (error as HttpErrorLike).message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return undefined;
}

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
      } catch {
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
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../../utils/logger.js');
        createScopedLogger('companies.notes', 'getCompanyNotes').error(
          'Unified operation failed',
          error instanceof Error ? error : new Error(String(error))
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
        const notes = Array.isArray(response?.data?.data)
          ? (response.data.data as AttioNote[])
          : [];
        return notes;
      } catch (directError: unknown) {
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('companies.notes', 'getCompanyNotes').error(
            'All attempts failed',
            new Error('All attempts failed'),
            {
              companyId,
              originalUri: companyIdOrUri,
              errors: {
                unified: getMessage(error) || 'Unknown error',
                direct: getMessage(directError) || 'Unknown error',
              },
            }
          );
        }

        // Return empty array instead of throwing error when no notes are found
        if (getStatus(directError) === 404) {
          return [];
        }

        throw new Error(
          `Could not retrieve notes for company ${companyIdOrUri}: ${
            getMessage(directError) || 'Unknown error'
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
      } catch {
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
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../../utils/logger.js');
        createScopedLogger('companies.notes', 'createCompanyNote').error(
          'Unified operation failed',
          error instanceof Error ? error : new Error(String(error))
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
        const createdNote = response?.data as AttioNote | undefined;
        if (!createdNote) {
          throw new Error('Note creation returned empty response');
        }
        return createdNote;
      } catch (directError: unknown) {
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('companies.notes', 'createCompanyNote').error(
            'All attempts failed',
            new Error('All attempts failed'),
            {
              companyId,
              originalUri: companyIdOrUri,
              errors: {
                unified: getMessage(error) || 'Unknown error',
                direct: getMessage(directError) || 'Unknown error',
              },
            }
          );
        }

        throw new Error(
          `Could not create note for company ${companyIdOrUri}: ${
            getMessage(directError) || 'Unknown error'
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
