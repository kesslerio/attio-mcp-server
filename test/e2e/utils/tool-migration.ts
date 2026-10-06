/**
 * Legacy-to-Universal Tool Migration Helper
 *
 * Provides automatic mapping from legacy tool names and parameters
 * to the new universal tool architecture. This enables existing E2E tests
 * to work without modification while using the correct universal tools.
 *
 * Features:
 * - Automatic tool name mapping (create-task → records_create)
 * - Parameter structure transformation
 * - Resource type inference and injection
 * - Response format normalization
 * - Backward compatibility for existing test logic
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type {
  ToolParameters,
  ApiResponse,
  ParameterTransformFn,
  ResponseTransformFn,
} from '../types/index.js';

export interface ToolMappingRule {
  legacyToolName: string;
  universalToolName: string;
  resourceType: string;
  parameterTransform: ParameterTransformFn;
  responseTransform?: ResponseTransformFn;
  description?: string;
}

/**
 * Comprehensive mapping from legacy tools to universal tools
 */
export const TOOL_MAPPING_RULES: ToolMappingRule[] = [
  // Task Management Tools
  {
    legacyToolName: 'create-task',
    universalToolName: 'records_create',
    resourceType: 'tasks',
    parameterTransform: (params: ToolParameters) => ({
      resource_type: 'tasks',
      record_data: params,
    }),
    description: 'Legacy create-task → universal records_create',
  },
  {
    legacyToolName: 'list-tasks',
    universalToolName: 'records_search',
    resourceType: 'tasks',
    parameterTransform: (params: ToolParameters) => ({
      resource_type: 'tasks',
      query: params.query || '',
      limit: params.limit || 50,
      filters: params.filters || {},
    }),
    description: 'Legacy list-tasks → universal records_search',
  },
  {
    legacyToolName: 'get-task-details',
    universalToolName: 'records_get_details',
    resourceType: 'tasks',
    parameterTransform: (params: any) => ({
      resource_type: 'tasks',
      record_id: params.taskId || params.task_id || params.record_id, // Handle both camelCase and snake_case
    }),
    description: 'Legacy get-task-details → universal records_get_details',
  },
  {
    legacyToolName: 'update-task',
    universalToolName: 'records_update',
    resourceType: 'tasks',
    parameterTransform: (params: any) => {
      const { task_id, taskId, record_id, ...recordData } = params;
      return {
        resource_type: 'tasks',
        record_id: taskId || task_id || record_id, // Handle both camelCase and snake_case
        record_data: recordData,
      };
    },
    description: 'Legacy update-task → universal records_update',
  },
  {
    legacyToolName: 'delete-task',
    universalToolName: 'records_delete',
    resourceType: 'tasks',
    parameterTransform: (params: any) => ({
      resource_type: 'tasks',
      record_id: params.taskId || params.task_id || params.record_id, // Handle both camelCase and snake_case
    }),
    description: 'Legacy delete-task → universal records_delete',
  },

  // Company Management Tools
  {
    legacyToolName: 'create-company',
    universalToolName: 'records_create',
    resourceType: 'companies',
    parameterTransform: (params: any) => ({
      resource_type: 'companies',
      record_data: params,
    }),
    description: 'Legacy create-company → universal records_create',
  },
  {
    legacyToolName: 'search-companies',
    universalToolName: 'records_search',
    resourceType: 'companies',
    parameterTransform: (params: any) => ({
      resource_type: 'companies',
      query: params.query || '',
      limit: params.limit || 50,
      filters: params.filters || {},
    }),
    description: 'Legacy search-companies → universal records_search',
  },
  {
    legacyToolName: 'get-company-details',
    universalToolName: 'records_get_details',
    resourceType: 'companies',
    parameterTransform: (params: any) => ({
      resource_type: 'companies',
      record_id: params.company_id || params.record_id,
    }),
    description: 'Legacy get-company-details → universal records_get_details',
  },
  {
    legacyToolName: 'update-company',
    universalToolName: 'records_update',
    resourceType: 'companies',
    parameterTransform: (params: any) => {
      const { company_id, record_id, ...recordData } = params;
      return {
        resource_type: 'companies',
        record_id: company_id || record_id,
        record_data: recordData,
      };
    },
    description: 'Legacy update-company → universal records_update',
  },

  // People Management Tools
  {
    legacyToolName: 'create-person',
    universalToolName: 'records_create',
    resourceType: 'people',
    parameterTransform: (params: any) => ({
      resource_type: 'people',
      record_data: params,
    }),
    description: 'Legacy create-person → universal records_create',
  },
  {
    legacyToolName: 'search-people',
    universalToolName: 'records_search',
    resourceType: 'people',
    parameterTransform: (params: any) => ({
      resource_type: 'people',
      query: params.query || '',
      limit: params.limit || 50,
      filters: params.filters || {},
    }),
    description: 'Legacy search-people → universal records_search',
  },
  {
    legacyToolName: 'get-person-details',
    universalToolName: 'records_get_details',
    resourceType: 'people',
    parameterTransform: (params: any) => ({
      resource_type: 'people',
      record_id: params.person_id || params.record_id,
    }),
    description: 'Legacy get-person-details → universal records_get_details',
  },

  // Notes Management Tools - Use dedicated note APIs
  {
    legacyToolName: 'get-company-notes',
    universalToolName: 'notes_list',
    resourceType: 'companies',
    parameterTransform: (params: any) => ({
      resource_type: 'companies',
      record_id: params.company_id || params.companyId,
      limit: params.limit || 50,
      offset: params.offset || 0,
    }),
    description: 'Legacy get-company-notes → universal notes_list',
  },
  {
    legacyToolName: 'get-person-notes',
    universalToolName: 'notes_list',
    resourceType: 'people',
    parameterTransform: (params: any) => ({
      resource_type: 'people',
      record_id: params.person_id || params.personId,
      limit: params.limit || 50,
      offset: params.offset || 0,
    }),
    description: 'Legacy get-person-notes → universal notes_list',
  },
  {
    legacyToolName: 'create-company-note',
    universalToolName: 'notes_create',
    resourceType: 'companies',
    parameterTransform: (params: any) => {
      return {
        resource_type: 'companies',
        record_id: params.companyId || params.company_id,
        title: params.title,
        content: params.content,
        format: params.format || 'markdown',
      };
    },
    description: 'Legacy create-company-note → universal notes_create',
  },
  {
    legacyToolName: 'create-person-note',
    universalToolName: 'notes_create',
    resourceType: 'people',
    parameterTransform: (params: any) => {
      return {
        resource_type: 'people',
        record_id: params.personId || params.person_id,
        title: params.title,
        content: params.content,
        format: params.format || 'markdown',
      };
    },
    description: 'Legacy create-person-note → universal notes_create',
  },

  // List Management Tools
  {
    legacyToolName: 'get-lists',
    universalToolName: 'records_search',
    resourceType: 'lists', // Lists are handled as lists resource type
    parameterTransform: (params: any) => ({
      resource_type: 'lists', // Lists use lists resource type
      query: params.query || '',
      limit: params.limit || 50,
      filters: params.filters || {},
    }),
    description: 'Legacy get-lists → universal records_search',
  },
  {
    legacyToolName: 'create-list',
    universalToolName: 'records_create',
    resourceType: 'records', // Lists are handled as records
    parameterTransform: (params: any) => ({
      resource_type: 'records', // Lists are records
      record_data: params,
    }),
    description: 'Legacy create-list → universal records_create',
  },
  {
    legacyToolName: 'get-list-details',
    universalToolName: 'records_get_details',
    resourceType: 'lists', // Lists resource type
    parameterTransform: (params: any) => ({
      resource_type: 'lists', // Lists resource type
      record_id: params.listId || params.list_id || params.record_id,
    }),
    description: 'Legacy get-list-details → universal records_get_details',
  },
  {
    legacyToolName: 'get-list-entries',
    universalToolName: 'records_search_by_relationship',
    resourceType: 'records', // Lists are handled as records
    parameterTransform: (params: any) => ({
      relationship_type: 'list_entries',
      source_id: params.list_id,
      target_resource_type: 'records',
      limit: params.limit || 50,
    }),
    description:
      'Legacy get-list-entries → universal records_search_by_relationship',
  },
  {
    legacyToolName: 'add-record-to-list',
    universalToolName: 'records_update',
    resourceType: 'records', // Lists are handled as records
    parameterTransform: (params: any) => ({
      resource_type: 'records', // Lists are records
      record_id: params.list_id,
      record_data: {
        add_entries: [
          {
            record_id: params.record_id,
            record_type: params.record_type || 'companies',
          },
        ],
      },
    }),
    description: 'Legacy add-record-to-list → universal records_update',
  },
  {
    legacyToolName: 'remove-record-from-list',
    universalToolName: 'records_update',
    resourceType: 'records', // Lists are handled as records
    parameterTransform: (params: any) => ({
      resource_type: 'records', // Lists are records
      record_id: params.list_id,
      record_data: {
        remove_entries: [
          {
            record_id: params.record_id,
          },
        ],
      },
    }),
    description: 'Legacy remove-record-from-list → universal records_update',
  },
  {
    legacyToolName: 'update-list-entry',
    universalToolName: 'records_update',
    resourceType: 'records',
    parameterTransform: (params: any) => {
      const { entry_id, record_id, list_id, ...updateData } = params;
      return {
        resource_type: 'records',
        record_id: entry_id || record_id,
        record_data: updateData,
      };
    },
    description: 'Legacy update-list-entry → universal records_update',
  },
  {
    legacyToolName: 'filter-list-entries',
    universalToolName: 'records_search_advanced',
    resourceType: 'records',
    parameterTransform: (params: any) => ({
      resource_type: 'records',
      filters: {
        list_membership: params.listId || params.list_id,
        ...params.filters,
      },
      limit: params.limit || 50,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
    }),
    description:
      'Legacy filter-list-entries → universal records_search_advanced',
  },
  {
    legacyToolName: 'advanced-filter-list-entries',
    universalToolName: 'records_search_advanced',
    resourceType: 'records',
    parameterTransform: (params: any) => ({
      resource_type: 'records',
      filters: {
        list_membership: params.listId || params.list_id,
        ...params.advanced_filters,
      },
      query: params.query || '',
      limit: params.limit || 50,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
    }),
    description:
      'Legacy advanced-filter-list-entries → universal records_search_advanced',
  },
  {
    legacyToolName: 'filter-list-entries-by-parent',
    universalToolName: 'records_search',
    resourceType: 'records',
    parameterTransform: (params: any) => ({
      resource_type: 'records',
      filters: {
        list_membership: params.listId || params.list_id,
        parent_record_type: params.parent_record_type,
        parent_record_id: params.parent_record_id,
        ...params.filters,
      },
      limit: params.limit || 50,
      offset: params.offset || 0,
    }),
    description:
      'Legacy filter-list-entries-by-parent → universal records_search',
  },
  {
    legacyToolName: 'filter-list-entries-by-parent-id',
    universalToolName: 'records_search',
    resourceType: 'records',
    parameterTransform: (params: any) => ({
      resource_type: 'records',
      filters: {
        list_membership: params.listId || params.list_id,
        parent_record_id: params.parent_id || params.parent_record_id,
        ...params.filters,
      },
      limit: params.limit || 50,
      offset: params.offset || 0,
    }),
    description:
      'Legacy filter-list-entries-by-parent-id → universal records_search',
  },

  // Record linking tools
  {
    legacyToolName: 'link-record-to-task',
    universalToolName: 'records_update',
    resourceType: 'tasks',
    parameterTransform: (params: any) => ({
      resource_type: 'tasks',
      record_id: params.taskId || params.task_id,
      record_data: {
        linked_records: [
          {
            record_type: params.record_type || 'companies', // Default to companies if not specified
            record_id: params.recordId || params.record_id,
          },
        ],
      },
    }),
    description: 'Legacy link-record-to-task → universal records_update',
  },
];

/**
 * Find mapping rule for a legacy tool
 */
export function findMappingRule(
  legacyToolName: string
): ToolMappingRule | undefined {
  return TOOL_MAPPING_RULES.find(
    (rule) => rule.legacyToolName === legacyToolName
  );
}

/**
 * Transform legacy tool call to universal tool call
 */
export function transformToolCall(
  legacyToolName: string,
  legacyParams: any
): { toolName: string; params: any; resourceType: string } | null {
  const rule = findMappingRule(legacyToolName);

  if (!rule) {
    // Tool name might already be universal, return as-is
    return null;
  }

  const transformedParams = rule.parameterTransform(legacyParams);

  return {
    toolName: rule.universalToolName,
    params: transformedParams,
    resourceType: rule.resourceType,
  };
}

/**
 * Transform response if needed (currently most responses don't need transformation)
 */
export function transformResponse(
  originalToolName: string,
  response: any
): any {
  const rule = findMappingRule(originalToolName);

  if (rule && rule.responseTransform) {
    return rule.responseTransform(response);
  }

  return response;
}

/**
 * Check if a tool name is a legacy tool that needs migration
 */
export function isLegacyTool(toolName: string): boolean {
  return TOOL_MAPPING_RULES.some((rule) => rule.legacyToolName === toolName);
}

/**
 * Get all available legacy tool names (for debugging/documentation)
 */
export function getLegacyToolNames(): string[] {
  return TOOL_MAPPING_RULES.map((rule) => rule.legacyToolName);
}

/**
 * Get all universal tool names being mapped to
 */
export function getUniversalToolNames(): string[] {
  return Array.from(
    new Set(TOOL_MAPPING_RULES.map((rule) => rule.universalToolName))
  );
}

/**
 * Get mapping statistics for debugging
 */
export function getMappingStats(): {
  totalMappings: number;
  universalToolsUsed: number;
  resourceTypesCovered: string[];
  mappingsByUniversalTool: Record<string, number>;
} {
  const universalTools = new Set(
    TOOL_MAPPING_RULES.map((rule) => rule.universalToolName)
  );
  const resourceTypes = new Set(
    TOOL_MAPPING_RULES.map((rule) => rule.resourceType)
  );

  const mappingsByUniversalTool: Record<string, number> = {};
  TOOL_MAPPING_RULES.forEach((rule) => {
    mappingsByUniversalTool[rule.universalToolName] =
      (mappingsByUniversalTool[rule.universalToolName] || 0) + 1;
  });

  return {
    totalMappings: TOOL_MAPPING_RULES.length,
    universalToolsUsed: universalTools.size,
    resourceTypesCovered: Array.from(resourceTypes),
    mappingsByUniversalTool,
  };
}

/**
 * Validate that all required universal tools are available
 * This can be used in test setup to ensure the universal tools are properly configured
 */
export function validateUniversalToolsAvailable(availableTools: string[]): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const requiredUniversalTools = getUniversalToolNames();
  const missing = requiredUniversalTools.filter(
    (tool) => !availableTools.includes(tool)
  );

  const warnings: string[] = [];
  if (missing.length > 0) {
    warnings.push(`Missing universal tools: ${missing.join(', ')}`);
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}
