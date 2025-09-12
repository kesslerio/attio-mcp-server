/**
 * Universal MCP tool configurations - Main module
 *
 * This module implements the universal tool consolidation strategy from Issue #352
 * to reduce tool count from 70 to ~30 tools while maintaining full functionality.
 *
 * Universal tools use parameter-based routing with resource_type discrimination
 * to provide consolidated operations across companies, people, records, and tasks.
 */

import {
  coreOperationsToolConfigs,
  coreOperationsToolDefinitions,
} from './core-operations.js';

import {
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
} from './operations/index.js';

import {
  batchSearchConfig,
  batchSearchToolDefinition,
} from './batch-search.js';

/**
 * Simple no-auth health-check tool to support unauthenticated capability scanning
 * This tool intentionally performs no Attio API calls and always succeeds.
 */
export const healthCheckToolDefinition = {
  name: 'aaa-health-check',
  description: 'Returns server status without requiring any credentials.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: true,
  },
};

/**
 * Backwards-compatible health-check alias for Smithery deployment validation
 * This ensures both 'health-check' and 'aaa-health-check' work identically.
 */
export const healthCheckAliasToolDefinition = {
  name: 'health-check',
  description: 'Returns server status without requiring any credentials.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: true,
  },
};

export const healthCheckConfig = {
  name: 'aaa-health-check',
  handler: async (params: { [key: string]: unknown }) => {
    const payload = {
      ok: true,
      name: 'attio-mcp',
      echo:
        typeof params?.echo === 'string' ? (params.echo as string) : undefined,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      needs_api_key: true,
    } as const;

    // Return MCP-shaped response so dispatching skips extra formatting
    return {
      content: [
        {
          type: 'json',
          data: payload,
        },
      ],
      isError: false,
    };
  },
  formatResult: (res: Record<string, unknown>): string => {
    const content = res?.content as Array<Record<string, unknown>> | undefined;
    const data = (content?.[0]?.data ?? res) as Record<string, unknown>;
    const parts: string[] = ['✅ Server healthy'];
    if (data?.echo) parts.push(`echo: ${String(data.echo)}`);
    if (data?.environment) parts.push(`env: ${String(data.environment)}`);
    return parts.join(' | ');
  },
};

/**
 * Backwards-compatible health-check config alias for Smithery deployment
 * Uses the same handler as aaa-health-check but with the legacy name.
 */
export const healthCheckAliasConfig = {
  name: 'health-check',
  handler: healthCheckConfig.handler,
  formatResult: healthCheckConfig.formatResult,
};

// Re-export individual tool config objects for testing
export {
  coreOperationsToolConfigs,
  coreOperationsToolDefinitions,
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
};

// Re-export types for external use
export * from './types.js';
export * from './schemas.js';
export * from './shared-handlers.js';

/**
 * All universal tool configurations
 * These replace 40+ resource-specific tools with 14 universal operations
 */
export const universalToolConfigs = {
  // Ensure health-check is listed first alphabetically for best-guess scanners
  'aaa-health-check': healthCheckConfig,
  // Backwards-compatible alias for Smithery deployment validation
  'health-check': healthCheckAliasConfig,
  ...coreOperationsToolConfigs,
  ...advancedOperationsToolConfigs,
  'batch-search': batchSearchConfig,
};

/**
 * All universal tool definitions for MCP protocol
 */
export const universalToolDefinitions = {
  // Ensure health-check is listed first alphabetically for best-guess scanners
  'aaa-health-check': healthCheckToolDefinition,
  // Backwards-compatible alias for Smithery deployment validation
  'health-check': healthCheckAliasToolDefinition,
  ...coreOperationsToolDefinitions,
  ...advancedOperationsToolDefinitions,
  'batch-search': batchSearchToolDefinition,
};

/**
 * Core universal operations (8 tools)
 * These consolidate the majority of CRUD and basic search operations
 */
export const coreUniversalTools = [
  'search-records',
  'get-record-details',
  'create-record',
  'update-record',
  'delete-record',
  'get-attributes',
  'discover-attributes',
  'get-detailed-info',
];

/**
 * Advanced universal operations (6 tools)
 * These provide sophisticated search and batch capabilities
 */
export const advancedUniversalTools = [
  'advanced-search',
  'search-by-relationship',
  'search-by-content',
  'search-by-timeframe',
  'batch-operations',
  'batch-search',
];

/**
 * All universal tool names
 */
export const allUniversalTools = [
  ...coreUniversalTools,
  ...advancedUniversalTools,
];

/**
 * Tools that will be deprecated and replaced by universal operations
 *
 * These mappings help with migration and alias creation
 */
export const deprecatedToolMappings: Record<string, string> = {
  // Company tools → Universal equivalents
  'search-companies': 'search-records',
  'get-company-details': 'get-record-details',
  'create-company': 'create-record',
  'update-company': 'update-record',
  'delete-company': 'delete-record',
  'get-company-attributes': 'get-attributes',
  'discover-company-attributes': 'discover-attributes',
  'get-company-basic-info': 'get-detailed-info',
  'get-company-contact-info': 'get-detailed-info',
  'get-company-business-info': 'get-detailed-info',
  'get-company-social-info': 'get-detailed-info',
  'advanced-search-companies': 'advanced-search',
  'search-companies-by-notes': 'search-by-content',
  'search-companies-by-people': 'search-by-relationship',

  // People tools → Universal equivalents
  'search-people': 'search-records',
  'get-person-details': 'get-record-details',
  'create-person': 'create-record',
  'advanced-search-people': 'advanced-search',
  'search-people-by-company': 'search-by-relationship',
  'search-people-by-activity': 'search-by-content',
  'search-people-by-notes': 'search-by-content',
  'search-people-by-creation-date': 'search-by-timeframe',
  'search-people-by-modification-date': 'search-by-timeframe',
  'search-people-by-last-interaction': 'search-by-timeframe',

  // Record tools → Universal equivalents
  'create-record': 'create-record', // Already universal
  'get-record': 'get-record-details',
  'update-record': 'update-record', // Already universal
  'delete-record': 'delete-record', // Already universal
  'list-records': 'search-records',
  'batch-create-records': 'batch-operations',
  'batch-update-records': 'batch-operations',

  // Task tools → Universal equivalents
  'create-task': 'create-record',
  'update-task': 'update-record',
  'delete-task': 'delete-record',
  'list-tasks': 'search-records',

  // Batch tools → Universal equivalent
  'batch-create-companies': 'batch-operations',
  'batch-update-companies': 'batch-operations',
  'batch-delete-companies': 'batch-operations',
  'batch-search-companies': 'batch-operations',
  'batch-get-company-details': 'batch-operations',
};

/**
 * Resource type mappings for deprecated tools
 * Used to automatically set resource_type when migrating from old tools
 */
export const resourceTypeMappings: Record<string, string> = {
  // Company tools
  'search-companies': 'companies',
  'get-company-details': 'companies',
  'create-company': 'companies',
  'update-company': 'companies',
  'delete-company': 'companies',
  'get-company-attributes': 'companies',
  'discover-company-attributes': 'companies',
  'get-company-basic-info': 'companies',
  'get-company-contact-info': 'companies',
  'get-company-business-info': 'companies',
  'get-company-social-info': 'companies',
  'advanced-search-companies': 'companies',
  'search-companies-by-notes': 'companies',
  'search-companies-by-people': 'companies',
  'batch-create-companies': 'companies',
  'batch-update-companies': 'companies',
  'batch-delete-companies': 'companies',
  'batch-search-companies': 'companies',
  'batch-get-company-details': 'companies',

  // People tools
  'search-people': 'people',
  'get-person-details': 'people',
  'create-person': 'people',
  'advanced-search-people': 'people',
  'search-people-by-company': 'people',
  'search-people-by-activity': 'people',
  'search-people-by-notes': 'people',
  'search-people-by-creation-date': 'people',
  'search-people-by-modification-date': 'people',
  'search-people-by-last-interaction': 'people',

  // Record tools
  'create-record': 'records',
  'get-record': 'records',
  'update-record': 'records',
  'delete-record': 'records',
  'list-records': 'records',
  'batch-create-records': 'records',
  'batch-update-records': 'records',

  // Task tools
  'create-task': 'tasks',
  'update-task': 'tasks',
  'delete-task': 'tasks',
  'list-tasks': 'tasks',
};

/**
 * Info type mappings for get-detailed-info universal tool
 */
export const infoTypeMappings: Record<string, string> = {
  'get-company-basic-info': 'basic',
  'get-company-contact-info': 'contact',
  'get-company-business-info': 'business',
  'get-company-social-info': 'social',
};

/**
 * Content type mappings for search-by-content universal tool
 */
export const contentTypeMappings: Record<string, string> = {
  'search-companies-by-notes': 'notes',
  'search-people-by-notes': 'notes',
  'search-people-by-activity': 'activity',
};

/**
 * Timeframe type mappings for search-by-timeframe universal tool
 */
export const timeframeTypeMappings: Record<string, string> = {
  'search-people-by-creation-date': 'created',
  'search-people-by-modification-date': 'modified',
  'search-people-by-last-interaction': 'last_interaction',
};

/**
 * Relationship type mappings for search-by-relationship universal tool
 */
export const relationshipTypeMappings: Record<string, string> = {
  'search-companies-by-people': 'people_to_company',
  'search-people-by-company': 'company_to_people',
};

/**
 * Batch operation type mappings for batch-operations universal tool
 */
export const batchOperationTypeMappings: Record<string, string> = {
  'batch-create-companies': 'create',
  'batch-update-companies': 'update',
  'batch-delete-companies': 'delete',
  'batch-search-companies': 'search',
  'batch-get-company-details': 'get',
  'batch-create-records': 'create',
  'batch-update-records': 'update',
};

/**
 * Get the count of tools that will be consolidated
 */
export function getConsolidationStats() {
  const deprecatedCount = Object.keys(deprecatedToolMappings).length;
  const universalCount = allUniversalTools.length;
  const reductionCount = deprecatedCount - universalCount;
  const reductionPercentage = Math.round(
    (reductionCount / deprecatedCount) * 100
  );

  return {
    deprecatedCount,
    universalCount,
    reductionCount,
    reductionPercentage,
    summary: `${deprecatedCount} → ${universalCount} tools (${reductionPercentage}% reduction)`,
  };
}

/**
 * Utility to check if a tool name is a universal tool
 */
export function isUniversalTool(toolName: string): boolean {
  return allUniversalTools.includes(toolName);
}

/**
 * Utility to check if a tool name is deprecated and should be migrated
 */
export function isDeprecatedTool(toolName: string): boolean {
  return toolName in deprecatedToolMappings;
}

/**
 * Get the universal tool equivalent for a deprecated tool
 */
export function getUniversalEquivalent(
  deprecatedToolName: string
): string | undefined {
  return deprecatedToolMappings[deprecatedToolName];
}

/**
 * Get migration parameters for converting a deprecated tool call to universal
 */
export function getMigrationParams(
  deprecatedToolName: string,
  originalParams: Record<string, unknown>
): Record<string, unknown> {
  const universalTool = getUniversalEquivalent(deprecatedToolName);
  const resourceType = resourceTypeMappings[deprecatedToolName];

  if (!universalTool || !resourceType) {
    throw new Error(
      `No migration path found for deprecated tool: ${deprecatedToolName}`
    );
  }

  // Base parameters for all universal tools - use Record to allow dynamic property assignment
  const baseParams: Record<string, unknown> = {
    resource_type: resourceType,
    ...originalParams,
  };

  // Add specific parameters based on the universal tool type
  switch (universalTool) {
    case 'get-detailed-info': {
      const infoType = infoTypeMappings[deprecatedToolName];
      if (infoType) {
        baseParams.info_type = infoType;
      }
      break;
    }

    case 'search-by-content': {
      const contentType = contentTypeMappings[deprecatedToolName];
      if (contentType) {
        baseParams.content_type = contentType;
      }
      break;
    }

    case 'search-by-timeframe': {
      const timeframeType = timeframeTypeMappings[deprecatedToolName];
      if (timeframeType) {
        baseParams.timeframe_type = timeframeType;
      }
      break;
    }

    case 'search-by-relationship': {
      const relationshipType = relationshipTypeMappings[deprecatedToolName];
      if (relationshipType) {
        baseParams.relationship_type = relationshipType;
      }
      break;
    }

    case 'batch-operations': {
      const operationType = batchOperationTypeMappings[deprecatedToolName];
      if (operationType) {
        baseParams.operation_type = operationType;
      }
      break;
    }
  }

  return baseParams;
}

/**
 * Log consolidation statistics
 */
export function logConsolidationStats(): void {
  const stats = getConsolidationStats();
  console.error(`Universal tool consolidation: ${stats.summary}`);
  console.error(
    `Reduced tool count by ${stats.reductionCount} tools (${stats.reductionPercentage}% reduction)`
  );
}
