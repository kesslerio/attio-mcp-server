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
    throw new Error(`
🚨 CRITICAL: API token is required for safe cleanup operations.

The cleanup script requires an API token to ensure only data created by your 
MCP server is deleted. Without this, the script could delete legitimate business data.

Solutions:
1. Set WORKSPACE_API_UUID environment variable in your .env file
2. Use --api-token flag: npm run cleanup:test-data -- --api-token=YOUR_TOKEN

⚠️  For safety, this script will NOT proceed without proper API token validation.
`);
  }

  const validation = validateApiToken(apiToken);
  if (!validation.valid) {
    throw new Error(`
🚨 INVALID API TOKEN: ${validation.reason}

Expected: A valid Attio API token (UUID format)
Received: ${apiToken.substring(0, 8)}... (${apiToken.length} characters)

Please verify your API token in the Attio dashboard and ensure:
- It's a valid UUID format (8-4-4-4-12 hexadecimal)
- It corresponds to your MCP server's API key
- It has appropriate permissions for your workspace
`);
  }

  return apiToken;
}