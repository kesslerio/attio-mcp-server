/**
 * ListConfigurationValidator — shared validation logic consumed by both
 * dedicated list tools and the universal create/update strategies.
 *
 * Provides:
 * - validateParentObject: auto-resolve valid parent objects from workspace
 * - detectImmutableFields: reject attempts to update immutable fields
 * - expandTemplate: delegate to list-templates.ts
 * - normalizeResponse: extract consistent agent-friendly shape
 * - categorizeError: map Attio API errors to actionable categories
 */
import { getLazyAttioClient } from '@/api/lazy-client.js';
import { createScopedLogger } from '@/utils/logger.js';
import {
  UniversalValidationError,
  ErrorType,
} from '@/handlers/tool-configs/universal/errors/validation-errors.js';
import { AttioApiError } from '@/errors/api-errors.js';
import { expandTemplate } from './list-templates.js';
import {
  IMMUTABLE_LIST_FIELDS,
  normalizeListResponse,
  ListErrorCategory,
} from './types.js';
import type { NormalizedListResponse, CategorizedListError } from './types.js';
import type { AttioList } from '@/types/attio.js';

const log = createScopedLogger('services.lists', 'ListConfigurationValidator');

/**
 * In-memory cache for workspace object slugs.
 * Short-lived (TTL ~60s) to avoid redundant API calls per request
 * while still picking up newly created custom objects.
 */
let cachedObjects: { slugs: string[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * Fetch all available object slugs from the workspace via GET /objects.
 * Uses the lazy Attio client (no explicit API key needed).
 * Results are cached for CACHE_TTL_MS.
 */
async function getWorkspaceObjects(): Promise<string[]> {
  const now = Date.now();
  if (cachedObjects && cachedObjects.expiresAt > now) {
    return cachedObjects.slugs;
  }

  const client = getLazyAttioClient();
  const PAGE_LIMIT = 200;
  const allSlugs: string[] = [];
  let offset = 0;

  try {
    // Paginate to handle workspaces with >200 objects (PR #1196 review)
    let hasMore = true;
    while (hasMore) {
      const response = await client.get('/objects', {
        params: { limit: PAGE_LIMIT, offset },
      });

      const data = response?.data;
      const page = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : data?.objects || [];

      const slugs = page
        .filter((pd: unknown) => pd != null)
        .map((pd: Record<string, unknown>) =>
          String(pd.api_slug || pd.slug || pd.id)
        )
        .filter(Boolean);

      allSlugs.push(...slugs);
      offset += PAGE_LIMIT;

      // If we got fewer than PAGE_LIMIT, we've reached the end
      hasMore = page.length >= PAGE_LIMIT;
    }

    cachedObjects = { slugs: allSlugs, expiresAt: now + CACHE_TTL_MS };
    log.debug('Fetched workspace objects', { count: allSlugs.length });
    return allSlugs;
  } catch (error: unknown) {
    log.warn('Failed to fetch workspace objects', {
      error: error instanceof Error ? error.message : String(error),
    });
    // On failure, return empty — don't block creation, let API reject
    return [];
  }
}

/**
 * Invalidate the workspace objects cache (useful for testing).
 */
export function invalidateObjectCache(): void {
  cachedObjects = null;
}

export class ListConfigurationValidator {
  /**
   * Validate that the given parent_object exists in the workspace.
   * Rejects invalid values with a list of valid options.
   *
   * @throws UniversalValidationError if parent_object is not a valid workspace object
   */
  static async validateParentObject(parentObject: string): Promise<string> {
    if (!parentObject || typeof parentObject !== 'string') {
      throw new UniversalValidationError(
        'parent_object is required and must be a non-empty string',
        ErrorType.USER_ERROR,
        {
          suggestion:
            'Provide a valid object type such as "companies" or "people".',
          field: 'parent_object',
        }
      );
    }

    const workspaceObjects = await getWorkspaceObjects();

    // If we couldn't fetch objects (network error), allow through —
    // the Attio API will reject invalid values
    if (workspaceObjects.length === 0) {
      log.warn('No workspace objects fetched, skipping validation', {
        parentObject,
      });
      return parentObject;
    }

    if (!workspaceObjects.includes(parentObject)) {
      const validOptions = workspaceObjects.join(', ');
      throw new UniversalValidationError(
        `Invalid parent_object "${parentObject}". Must be one of the available workspace objects.`,
        ErrorType.USER_ERROR,
        {
          suggestion: `Valid parent objects: ${validOptions}`,
          field: 'parent_object',
          example: workspaceObjects[0] || 'companies',
        }
      );
    }

    return parentObject;
  }

  /**
   * Detect immutable fields in the given attributes map.
   * Rejects attempts to change fields that cannot be modified after creation.
   *
   * @throws UniversalValidationError if any immutable field is present
   */
  static detectImmutableFields(attributes: Record<string, unknown>): void {
    if (!attributes || typeof attributes !== 'object') return;

    const violations: string[] = [];
    for (const field of IMMUTABLE_LIST_FIELDS) {
      if (field in attributes) {
        violations.push(field);
      }
    }

    if (violations.length > 0) {
      const fieldList = violations.join(', ');
      throw new UniversalValidationError(
        `Cannot update immutable field(s): ${fieldList}. These fields cannot be changed after list creation.`,
        ErrorType.USER_ERROR,
        {
          suggestion:
            'Remove immutable fields from your update request. To use a different parent_object, create a new list instead.',
          field: violations[0],
        }
      );
    }
  }

  /**
   * Expand a template by merging caller overrides onto template defaults.
   * Delegates to list-templates.ts.
   *
   * @throws Error if templateName is not in the catalog
   */
  static expandTemplate(
    templateName: string,
    overrides: Record<string, unknown> = {}
  ): Record<string, unknown> {
    return expandTemplate(templateName, overrides);
  }

  /**
   * Normalize a raw Attio API list response into a consistent
   * agent-friendly shape.
   */
  static normalizeResponse(
    raw: AttioList,
    dryRun?: boolean
  ): NormalizedListResponse {
    return normalizeListResponse(raw, dryRun);
  }

  /**
   * Categorize an Attio API error into an actionable bucket
   * with a suggested next step.
   */
  static categorizeError(error: unknown): CategorizedListError {
    const message = error instanceof Error ? error.message : String(error);
    const status = extractStatus(error);

    if (status === 403) {
      return {
        category: ListErrorCategory.PERMISSION_FAILURE,
        message,
        suggested_next_step:
          'Verify your API token has the required scope for this operation. Check workspace permissions or contact an admin.',
      };
    }

    if (status === 401) {
      return {
        category: ListErrorCategory.TOKEN_SCOPE,
        message,
        suggested_next_step:
          'Your API token may be invalid or expired. Re-authenticate and try again.',
      };
    }

    // Check for unsupported input patterns — prefer HTTP status 400 over string matching
    const httpStatus = extractStatus(error);
    if (
      httpStatus === 400 ||
      message.includes('Cannot find attribute') ||
      message.includes('is required') ||
      message.includes('must be') ||
      message.startsWith('Invalid list attributes') // wrapped 400 from base.ts
    ) {
      return {
        category: ListErrorCategory.UNSUPPORTED_INPUT,
        message,
        suggested_next_step:
          'Check your input parameters against the list schema. Use get-list-details to inspect valid attributes.',
      };
    }

    return {
      category: ListErrorCategory.API_FAILURE,
      message,
      suggested_next_step:
        'An unexpected error occurred. Retry the operation. If the problem persists, check the Attio status page.',
    };
  }
}

/**
 * Extract HTTP status code from an error object.
 */
function extractStatus(error: unknown): number | undefined {
  if (!error) return undefined;
  // Check AttioApiError subclasses first (AuthorizationError, AuthenticationError, etc.)
  if (error instanceof AttioApiError) return error.statusCode;
  if (typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { status?: number } }).response;
    return resp?.status;
  }
  return undefined;
}
