/**
 * ListConfigurationValidator — shared validation logic consumed by both
 * dedicated list tools and the universal create/update strategies.
 *
 * Provides:
 * - validateParentObject: auto-resolve valid parent objects from workspace
 * - detectImmutableFields: reject attempts to update immutable fields
 * - validateAccessControls: client-side shape/invariant checks for access fields
 * - normalizeWorkspaceAccess: map the string 'null' sentinel to JSON null
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
 * Valid workspace_access enum values (Attio list access API).
 */
const VALID_WORKSPACE_ACCESS_LEVELS = [
  'full-access',
  'read-and-write',
  'read-only',
  'null',
];

/**
 * Valid workspace_member_access level enum values (Attio list access API).
 */
const VALID_MEMBER_ACCESS_LEVELS = [
  'full-access',
  'read-and-write',
  'read-only',
];

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
   * Normalize the private-list 'null' sentinel before the payload reaches
   * Attio (Issue #1148, R2). The MCP string-only enum can express JSON null
   * only as the literal string 'null'; the API requires real null.
   * Mutates `attributes.workspace_access` in place when it equals 'null'.
   */
  static normalizeWorkspaceAccess(attributes: Record<string, unknown>): void {
    if (attributes && attributes.workspace_access === 'null') {
      attributes.workspace_access = null;
    }
  }

  /**
   * Validate access-control fields for list create/update (Issue #1148).
   * Checks deterministic rules only: access-level enum values, member-entry
   * shape, and the create-time full-access invariant. Stateless — never reads
   * the list's current access state.
   *
   * @throws UniversalValidationError if an access-control rule is violated
   */
  static validateAccessControls(
    attributes: Record<string, unknown>,
    options: { enforceFullAccessInvariant?: boolean } = {}
  ): void {
    if (!attributes || typeof attributes !== 'object') return;

    const workspaceAccess = attributes.workspace_access;
    const memberAccess = attributes.workspace_member_access;

    // Validate workspace_access enum value
    if (
      workspaceAccess !== undefined &&
      workspaceAccess !== null &&
      !VALID_WORKSPACE_ACCESS_LEVELS.includes(workspaceAccess as string)
    ) {
      throw new UniversalValidationError(
        `Invalid workspace_access value "${String(workspaceAccess)}".`,
        ErrorType.USER_ERROR,
        {
          suggestion:
            'Valid values: full-access, read-and-write, read-only, or null (private list).',
          field: 'workspace_access',
        }
      );
    }

    // Validate workspace_member_access shape
    if (memberAccess !== undefined) {
      if (!Array.isArray(memberAccess)) {
        throw new UniversalValidationError(
          'workspace_member_access must be an array of member access entries.',
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Provide an array of { workspace_member_id, level } objects.',
            field: 'workspace_member_access',
          }
        );
      }
      for (const entry of memberAccess as Array<Record<string, unknown>>) {
        if (
          !entry ||
          typeof entry !== 'object' ||
          typeof entry.workspace_member_id !== 'string' ||
          !VALID_MEMBER_ACCESS_LEVELS.includes(String(entry.level))
        ) {
          throw new UniversalValidationError(
            'Invalid workspace_member_access entry. Each entry must have a workspace_member_id and a valid level.',
            ErrorType.USER_ERROR,
            {
              suggestion:
                'Each entry must be { workspace_member_id: string, level: full-access | read-and-write | read-only }.',
              field: 'workspace_member_access',
            }
          );
        }
      }
    }

    // Enforce the create-time full-access invariant (create only)
    if (options.enforceFullAccessInvariant) {
      const hasWorkspaceFullAccess = workspaceAccess === 'full-access';
      const hasMemberFullAccess = Array.isArray(memberAccess)
        ? (memberAccess as Array<Record<string, unknown>>).some(
            (entry) => entry.level === 'full-access'
          )
        : false;

      if (!hasWorkspaceFullAccess && !hasMemberFullAccess) {
        throw new UniversalValidationError(
          'A new list must have workspace_access set to full-access or at least one workspace_member_access entry with level full-access.',
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Set workspace_access to "full-access", or add a workspace_member_access entry with level "full-access".',
            field: 'workspace_access',
          }
        );
      }
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

    // Client-side input rejections (including validateAccessControls) are
    // deterministic: classify as UNSUPPORTED_INPUT with actionable guidance
    // instead of falling through to the retry-inviting API_FAILURE default.
    if (error instanceof UniversalValidationError) {
      return {
        category: ListErrorCategory.UNSUPPORTED_INPUT,
        message: error.suggestion ? `${message} ${error.suggestion}` : message,
        suggested_next_step:
          'Check your input parameters against the list schema. Use get-list-details to inspect valid attributes.',
      };
    }

    if (status === 403) {
      const code = extractErrorCode(error);
      if (code === 'billing_error') {
        return {
          category: ListErrorCategory.PLAN_GATING,
          message,
          suggested_next_step:
            'Your workspace plan does not support the requested list access configuration. Upgrade the plan, contact sales, or use a supported access configuration (e.g., workspace_access set to full-access).',
        };
      }
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

/**
 * Extract the Attio structured error code from an error body.
 * Attio 403 responses carry a `code` field (e.g., `billing_error`,
 * `insufficient_scopes`) that distinguishes plan/billing gating from
 * permission failures. Returns undefined when no code is present.
 */
function extractErrorCode(error: unknown): string | undefined {
  if (!error) return undefined;
  // AttioApiError subclasses may carry the code in their body/details
  if (error instanceof AttioApiError) {
    const details = (error as unknown as { details?: { code?: string } })
      .details;
    if (details?.code) return details.code;
  }
  if (typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { code?: string } } })
      .response;
    const data = resp?.data;
    if (typeof data === 'object' && data !== null && 'code' in data) {
      const code = data.code;
      if (typeof code === 'string') return code;
    }
  }
  return undefined;
}
