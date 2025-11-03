/**
 * Workspace Member Resolver Service
 *
 * Automatically resolves email addresses and names to workspace member UUIDs
 * for actor-reference attribute filtering (owner, assignee, created_by, modified_by).
 *
 * This service enables natural filtering syntax:
 * - Before: User must manually look up UUID for "martin@shapescale.com"
 * - After: Auto-resolves email → UUID transparently
 *
 * Part of PR #904 Phase 2: Actor-Reference Auto-Resolution
 */

import { searchWorkspaceMembers } from '../objects/workspace-members.js';
import {
  FilterValidationError,
  FilterErrorCategory,
} from '../errors/api-errors.js';
import { createScopedLogger } from '../utils/logger.js';
import { EMAIL_PATTERN } from '../utils/filters/reference-attribute-helper.js';

const logger = createScopedLogger('workspace-member-resolver');

/**
 * Cache for resolved workspace member UUIDs
 * Key: email address or full name
 * Value: workspace member UUID
 *
 * Scoped per-request to prevent stale data while reducing duplicate API calls
 */
export type WorkspaceMemberCache = Map<string, string>;

/**
 * Resolve an email address or name to a workspace member UUID
 *
 * @param emailOrName - Email address or full name to resolve
 * @param cache - Optional per-request cache to avoid duplicate lookups
 * @returns Workspace member UUID
 * @throws FilterValidationError if member not found or ambiguous matches
 *
 * @example
 * // Resolve email to UUID
 * const uuid = await resolveWorkspaceMemberUUID('martin@shapescale.com');
 * // Returns: 'd28a35f1-5788-49f9-a320-6c8c353147d8'
 *
 * @example
 * // With caching
 * const cache = new Map();
 * const uuid1 = await resolveWorkspaceMemberUUID('martin@shapescale.com', cache);
 * const uuid2 = await resolveWorkspaceMemberUUID('martin@shapescale.com', cache);
 * // Second call uses cache, no API request
 */
export async function resolveWorkspaceMemberUUID(
  emailOrName: string,
  cache?: WorkspaceMemberCache
): Promise<string> {
  // Normalize input for cache key consistency
  const normalizedKey = emailOrName.trim().toLowerCase();

  // Check cache first
  if (cache?.has(normalizedKey)) {
    const cachedUUID = cache.get(normalizedKey)!;
    logger.debug('Cache hit for workspace member resolution', {
      input: emailOrName,
      uuid: cachedUUID,
    });
    return cachedUUID;
  }

  // Search workspace members API
  logger.debug('Resolving workspace member', { input: emailOrName });

  let members;
  try {
    members = await searchWorkspaceMembers(emailOrName);
  } catch (error) {
    logger.error('Failed to search workspace members', {
      input: emailOrName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new FilterValidationError(
      `Failed to resolve workspace member "${emailOrName}": ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      FilterErrorCategory.VALUE
    );
  }

  // Post-filter for exact email matches
  // Attio's search API does fuzzy matching, so we need to filter for exact email matches
  if (EMAIL_PATTERN.test(emailOrName)) {
    const normalizedEmail = emailOrName.toLowerCase().trim();
    const exactMatches = members.filter(
      (m) => m.email_address?.toLowerCase() === normalizedEmail
    );

    if (exactMatches.length > 0) {
      logger.debug('Filtered to exact email matches', {
        input: emailOrName,
        totalResults: members.length,
        exactMatches: exactMatches.length,
      });
      members = exactMatches;
    }
  }

  // Handle resolution results
  if (members.length === 0) {
    // No matches found
    throw new FilterValidationError(
      `Workspace member not found: "${emailOrName}". ` +
        `Please verify the email address or name, or use the workspace member UUID directly.`,
      FilterErrorCategory.VALUE
    );
  } else if (members.length === 1) {
    // Unique match - success!
    const uuid = members[0].id.workspace_member_id;

    // Cache the result
    if (cache) {
      cache.set(normalizedKey, uuid);
    }

    logger.debug('Resolved workspace member', {
      input: emailOrName,
      uuid,
      memberName:
        `${members[0].first_name || ''} ${members[0].last_name || ''}`.trim(),
      memberEmail: members[0].email_address,
    });

    return uuid;
  } else {
    // Multiple matches - ambiguous
    const memberSummaries = members
      .slice(0, 5) // Show max 5 matches
      .map((m) => {
        const name = `${m.first_name || ''} ${m.last_name || ''}`.trim();
        return `  - ${name} (${m.email_address})`;
      })
      .join('\n');

    throw new FilterValidationError(
      `Ambiguous workspace member: "${emailOrName}" matches ${members.length} members:\n${memberSummaries}${
        members.length > 5 ? '\n  ... and more' : ''
      }\n\nPlease use a more specific email address or the workspace member UUID directly.`,
      FilterErrorCategory.VALUE
    );
  }
}

/**
 * Create a new per-request cache for workspace member resolution
 *
 * This should be created once per filter transformation request and passed
 * through the call stack to avoid duplicate API calls for the same email/name.
 *
 * @returns New empty cache map
 *
 * @example
 * const cache = createWorkspaceMemberCache();
 * const filters = await transformFiltersToApiFormat(input, true, false, 'deals', cache);
 */
export function createWorkspaceMemberCache(): WorkspaceMemberCache {
  return new Map<string, string>();
}
