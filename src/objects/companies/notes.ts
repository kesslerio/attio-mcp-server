/**
 * Note operations for companies
 */
import { getAttioClient } from '../../api/attio-client.js';
import {
  createObjectNote,
  getObjectNotes,
} from '../../api/operations/index.js';
import { type AttioNote, ResourceType } from '../../types/attio.js';

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
  limit = 10,
  offset = 0
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
        console.log(
          `[getCompanyNotes] Extracted company ID ${companyId} from URI ${companyIdOrUri}`
        );
      }
    } else {
      // Direct ID was provided
      companyId = companyIdOrUri;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[getCompanyNotes] Using direct company ID: ${companyId}`);
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
        console.log(
          `[getCompanyNotes] Unified operation failed: ${
            error.message || 'Unknown error'
          }`,
          {
            method: 'getObjectNotes',
            companyId,
            limit,
            offset,
          }
        );
      }

      // Fallback implementation with better error handling
      try {
        const api = getAttioClient();
        const path = `/notes?limit=${limit}&offset=${offset}&parent_object=companies&parent_record_id=${companyId}`;

        if (process.env.NODE_ENV === 'development') {
          console.log(`[getCompanyNotes] Trying direct API call: ${path}`);
        }

        const response = await api.get(path);
        return response?.data?.data || [];
      } catch (directError: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[getCompanyNotes] All attempts failed:', {
            companyId,
            originalUri: companyIdOrUri,
            errors: {
              unified: error.message || 'Unknown error',
              direct: directError.message || 'Unknown error',
            },
          });
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
  } catch (error) {
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
        console.log(
          `[createCompanyNote] Extracted company ID ${companyId} from URI ${companyIdOrUri}`
        );
      }
    } else {
      // Direct ID was provided
      companyId = companyIdOrUri;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[createCompanyNote] Using direct company ID: ${companyId}`
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
        console.log(
          `[createCompanyNote] Unified operation failed: ${
            error.message || 'Unknown error'
          }`,
          {
            method: 'createObjectNote',
            companyId,
          }
        );
      }

      // Fallback implementation with better error handling
      try {
        const api = getAttioClient();
        const path = 'notes';

        if (process.env.NODE_ENV === 'development') {
          console.log(`[createCompanyNote] Trying direct API call: ${path}`);
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
          console.error('[createCompanyNote] All attempts failed:', {
            companyId,
            originalUri: companyIdOrUri,
            errors: {
              unified: error.message || 'Unknown error',
              direct: directError.message || 'Unknown error',
            },
          });
        }

        throw new Error(
          `Could not create note for company ${companyIdOrUri}: ${
            directError.message || 'Unknown error'
          }`
        );
      }
    }
  } catch (error) {
    // Catch any errors in the URI parsing logic
    if (error instanceof Error && error.message.includes('match')) {
      throw new Error(
        `Cannot parse company identifier: ${companyIdOrUri}. Use either a direct ID or URI format 'attio://companies/{id}'`
      );
    }
    throw error;
  }
}
