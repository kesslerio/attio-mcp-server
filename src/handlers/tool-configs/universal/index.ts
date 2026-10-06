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
} from './core/index.js';

import {
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
} from './operations/index.js';

import {
  batchSearchConfig,
  batchSearchToolDefinition,
} from './batch-search.js';
import { openAiToolConfigs, openAiToolDefinitions } from '../openai/index.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import {
  healthDataSchema,
  healthResultContract,
} from '@/handlers/tools/result-schemas.js';
import {
  smitheryDiagnosticsToolDefinition,
  smitheryDiagnosticsConfig,
} from './smithery-diagnostics.js';

/**
 * Simple no-auth health-check tool to support unauthenticated capability scanning
 * This tool intentionally performs no Attio API calls and always succeeds.
 */
export const healthCheckToolDefinition = {
  name: 'aaa-health-check',
  description: formatToolDescription({
    capability:
      'Run a lightweight health probe that echoes deployment metadata.',
    boundaries: 'query Attio APIs, mutate data, or require credentials.',
    constraints:
      'Accepts optional echo text; returns JSON payload as text for MCP clients.',
    recoveryHint:
      'If unavailable, review Smithery sandbox logs or restart the server process.',
  }),
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: true,
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export const healthCheckConfig = {
  name: 'aaa-health-check',
  ...healthResultContract,
  structuredOutput: (payload: unknown): Record<string, unknown> => ({
    data: healthDataSchema.parse(payload),
  }),
  handler: async (params: { [key: string]: unknown }) => {
    const payload = {
      ok: true,
      name: 'attio-mcp',
      ...(typeof params?.echo === 'string' ? { echo: params.echo } : {}),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      needs_api_key: true,
    } as const;

    // The adapter owns the envelope; the handler returns the domain payload.
    return payload;
  },
  formatResult: (res: Record<string, unknown>): string => {
    const parts: string[] = ['✅ Server healthy'];
    if (res?.echo) parts.push(`echo: ${String(res.echo)}`);
    if (res?.environment) parts.push(`env: ${String(res.environment)}`);
    return parts.join(' | ');
  },
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
 * These expose the universal tool group plus focused scoped write tools.
 */
export const universalToolConfigs = {
  // Ensure health-check is listed first alphabetically for best-guess scanners
  'aaa-health-check': healthCheckConfig,
  diagnostics_get: smitheryDiagnosticsConfig,
  ...coreOperationsToolConfigs,
  ...advancedOperationsToolConfigs,
  records_batch_search: batchSearchConfig,
  ...openAiToolConfigs,
};

/**
 * All universal tool definitions for MCP protocol
 */
export const universalToolDefinitions = {
  // Ensure health-check is listed first alphabetically for best-guess scanners
  'aaa-health-check': healthCheckToolDefinition,
  diagnostics_get: smitheryDiagnosticsToolDefinition,
  ...coreOperationsToolDefinitions,
  ...advancedOperationsToolDefinitions,
  records_batch_search: batchSearchToolDefinition,
  ...openAiToolDefinitions,
};

/**
 * Core universal operations (15 tools)
 * These consolidate the majority of CRUD and basic search operations
 */
export const coreUniversalTools = [
  'records_search',
  'records_get_details',
  'companies_create',
  'companies_update',
  'deals_create',
  'deals_update',
  'records_create',
  'records_update',
  'records_upsert',
  'records_delete',
  'records_get_attributes',
  'records_discover_attributes',
  'records_get_info',
  'records_get_interactions',
  'records_merge',
];

/**
 * Advanced universal operations (6 tools)
 * These provide sophisticated search and batch capabilities
 */
export const advancedUniversalTools = [
  'records_search_advanced',
  'records_search_by_relationship',
  'records_search_by_content',
  'records_search_by_timeframe',
  'records_batch',
  'records_batch_search',
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
  'search-companies': 'records_search',
  'get-company-details': 'records_get_details',
  'create-company': 'records_create',
  'update-company': 'records_update',
  'delete-company': 'records_delete',
  'get-company-attributes': 'records_get_attributes',
  'discover-company-attributes': 'records_discover_attributes',
  'get-company-basic-info': 'records_get_info',
  'get-company-contact-info': 'records_get_info',
  'get-company-business-info': 'records_get_info',
  'get-company-social-info': 'records_get_info',
  'advanced-search-companies': 'records_search_advanced',
  'search-companies-by-notes': 'records_search_by_content',
  'search-companies-by-people': 'records_search_by_relationship',

  // People tools → Universal equivalents
  'search-people': 'records_search',
  'get-person-details': 'records_get_details',
  'create-person': 'records_create',
  'advanced-search-people': 'records_search_advanced',
  'search-people-by-company': 'records_search_by_relationship',
  'search-people-by-activity': 'records_search_by_content',
  'search-people-by-notes': 'records_search_by_content',
  'search-people-by-creation-date': 'records_search_by_timeframe',
  'search-people-by-modification-date': 'records_search_by_timeframe',
  'search-people-by-last-interaction': 'records_search_by_timeframe',

  // Record tools → Universal equivalents
  'create-record': 'records_create', // Already universal
  'get-record': 'records_get_details',
  'update-record': 'records_update', // Already universal
  'delete-record': 'records_delete', // Already universal
  'list-records': 'records_search',
  'batch-create-records': 'records_batch',
  'batch-update-records': 'records_batch',

  // Task tools → Universal equivalents
  'create-task': 'records_create',
  'update-task': 'records_update',
  'delete-task': 'records_delete',
  'list-tasks': 'records_search',

  // Batch tools → Universal equivalent
  'batch-create-companies': 'records_batch',
  'batch-update-companies': 'records_batch',
  'batch-delete-companies': 'records_batch',
  'batch-search-companies': 'records_batch_search',
  'batch-get-company-details': 'records_batch',
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

  // Add specific parameters based on the canonical universal tool name.
  switch (universalTool) {
    case 'records_get_info': {
      const infoType = infoTypeMappings[deprecatedToolName];
      if (infoType) {
        baseParams.info_type = infoType;
      }
      break;
    }

    case 'records_search_by_content': {
      const contentType = contentTypeMappings[deprecatedToolName];
      if (contentType) {
        baseParams.content_type = contentType;
      }
      break;
    }

    case 'records_search_by_timeframe': {
      const timeframeType = timeframeTypeMappings[deprecatedToolName];
      if (timeframeType) {
        baseParams.timeframe_type = timeframeType;
      }
      break;
    }

    case 'records_search_by_relationship': {
      const relationshipType = relationshipTypeMappings[deprecatedToolName];
      if (relationshipType) {
        baseParams.relationship_type = relationshipType;
      }
      break;
    }

    case 'records_batch':
    case 'records_batch_search': {
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
export async function logConsolidationStats(): Promise<void> {
  const stats = getConsolidationStats();
  const { createScopedLogger } = await import('../../../utils/logger.js');
  const log = createScopedLogger('universal.tools', 'consolidation');
  log.info('Universal tool consolidation', { summary: stats.summary });
  log.info('Tool count reduction', {
    reductionCount: stats.reductionCount,
    reductionPercentage: stats.reductionPercentage,
  });
}
