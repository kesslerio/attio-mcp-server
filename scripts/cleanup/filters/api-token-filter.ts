/**
 * API token-based filtering for cleanup operations
 */
import { AttioRecord, FilterResult } from '../core/types.js';
import { isCreatedByApiToken, extractRecordName } from '../core/utils.js';
import { ResourceType } from '../core/types.js';
import { logInfo } from '../core/utils.js';

/**
 * Filter records by API token
 */
export function filterByApiToken(
  records: AttioRecord[], 
  apiToken: string,
  resourceType: ResourceType
): FilterResult {
  const matched: AttioRecord[] = [];
  const excluded: AttioRecord[] = [];
  const reasons: string[] = [];

  for (const record of records) {
    if (isCreatedByApiToken(record, apiToken, resourceType)) {
      matched.push(record);
    } else {
      excluded.push(record);
      
      const name = extractRecordName(record, resourceType);
      
      // Extract created_by info based on resource type
      let createdBy = 'unknown';
      let createdById = 'unknown';
      
      if (resourceType === 'tasks') {
        createdBy = record.created_by_actor?.type || 'unknown';
        createdById = record.created_by_actor?.id || 'unknown';
      } else {
        // Companies, people, etc.
        const createdByData = record.values?.created_by?.[0];
        createdBy = createdByData?.referenced_actor_type || 'unknown';
        createdById = createdByData?.referenced_actor_id || 'unknown';
      }
      
      reasons.push(
        `${name}: Created by ${createdBy} (${createdById.substring(0, 8)}...), not target API token`
      );
    }
  }

  logInfo(`API token filter results for ${resourceType}`, {
    total: records.length,
    matched: matched.length,
    excluded: excluded.length
  });

  return { matched, excluded, reasons };
}

/**
 * Validate API token format
 */
export function validateApiToken(apiToken: string): { valid: boolean; reason?: string } {
  if (!apiToken) {
    return { valid: false, reason: 'API token is required' };
  }

  if (typeof apiToken !== 'string') {
    return { valid: false, reason: 'API token must be a string' };
  }

  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(apiToken)) {
    return { valid: false, reason: 'API token must be a valid UUID format' };
  }

  return { valid: true };
}

/**
 * Get API token with validation
 */
export function getValidatedApiToken(providedToken?: string): string {
  // Use provided token or fall back to environment
  const apiToken = providedToken || process.env.WORKSPACE_API_UUID;
  
  if (!apiToken) {
    throw new Error(
      'API token is required. Provide --api-token flag or set WORKSPACE_API_UUID environment variable.'
    );
  }

  const validation = validateApiToken(apiToken);
  if (!validation.valid) {
    throw new Error(`Invalid API token: ${validation.reason}`);
  }

  return apiToken;
}