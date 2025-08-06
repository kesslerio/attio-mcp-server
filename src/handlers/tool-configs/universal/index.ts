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
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
} from './advanced-operations.js';
import {
  coreOperationsToolConfigs,
  coreOperationsToolDefinitions,
} from './core-operations.js';

// Re-export individual tool config objects for testing
export {
  coreOperationsToolConfigs,
  coreOperationsToolDefinitions,
  advancedOperationsToolConfigs,
  advancedOperationsToolDefinitions,
};

export * from './schemas.js';
export * from './shared-handlers.js';
// Re-export types for external use
export * from './types.js';

/**
 * All universal tool configurations
 * These replace 40+ resource-specific tools with 13 universal operations
 */
export const universalToolConfigs = {
  ...coreOperationsToolConfigs,
  ...advancedOperationsToolConfigs,
};

/**
 * All universal tool definitions for MCP protocol
 */
export const universalToolDefinitions = {
  ...coreOperationsToolDefinitions,
  ...advancedOperationsToolDefinitions,
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
 * Advanced universal operations (5 tools)
 * These provide sophisticated search and batch capabilities
 */
export const advancedUniversalTools = [
  'advanced-search',
  'search-by-relationship',
  'search-by-content',
  'search-by-timeframe',
  'batch-operations',
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
  originalParams: any
): any {
  const universalTool = getUniversalEquivalent(deprecatedToolName);
  const resourceType = resourceTypeMappings[deprecatedToolName];

  if (!universalTool || !resourceType) {
    throw new Error(
      `No migration path found for deprecated tool: ${deprecatedToolName}`
    );
  }

  // Base parameters for all universal tools
  const baseParams = {
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
  console.log(`Universal tool consolidation: ${stats.summary}`);
  console.log(
    `Reduced tool count by ${stats.reductionCount} tools (${stats.reductionPercentage}% reduction)`
  );
}
