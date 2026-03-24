/**
 * Type-safe tool name constants.
 *
 * This module provides centralized tool name constants with TypeScript type safety.
 * Use these constants instead of string literals to:
 * - Prevent typos in tool names
 * - Enable autocomplete/IntelliSense
 * - Easier refactoring across codebase
 * - Type-safe tool name references
 *
 * @example
 * ```typescript
 * import { TOOL_NAMES } from '@/constants/tool-names.js';
 *
 * const toolName = TOOL_NAMES.SEARCH_RECORDS; // Type-safe, autocompletes
 * ```
 *
 * @see Issue #1041 for refactoring context
 */

/**
 * All canonical MCP-compliant tool names (snake_case, verb-first).
 *
 * NOTE: Excludes special tools that use kebab-case by design:
 * - aaa-health-check (health monitoring)
 * - openai-search, openai-fetch (OpenAI integration)
 *
 * These special tools are not included because they intentionally use
 * kebab-case naming for specific integration purposes.
 */
export const TOOL_NAMES = {
  // Core search/metadata tools
  SEARCH_RECORDS: 'search_records',
  GET_RECORD_DETAILS: 'get_record_details',
  GET_RECORD_ATTRIBUTES: 'get_record_attributes',
  DISCOVER_RECORD_ATTRIBUTES: 'discover_record_attributes',
  GET_RECORD_ATTRIBUTE_OPTIONS: 'get_record_attribute_options',
  GET_RECORD_INFO: 'get_record_info',
  GET_RECORD_INTERACTIONS: 'get_record_interactions',

  // Advanced search tools
  SEARCH_RECORDS_ADVANCED: 'search_records_advanced',
  SEARCH_RECORDS_BY_RELATIONSHIP: 'search_records_by_relationship',
  SEARCH_RECORDS_BY_CONTENT: 'search_records_by_content',
  SEARCH_RECORDS_BY_TIMEFRAME: 'search_records_by_timeframe',

  // Batch tools
  BATCH_RECORDS: 'batch_records',
  BATCH_SEARCH_RECORDS: 'batch_search_records',

  // CRUD tools
  CREATE_RECORD: 'create_record',
  UPDATE_RECORD: 'update_record',
  DELETE_RECORD: 'delete_record',

  // Note tools
  CREATE_NOTE: 'create_note',
  LIST_NOTES: 'list_notes',

  // Debug tools
  SMITHERY_DEBUG_CONFIG: 'smithery_debug_config',
} as const;

/**
 * Union type of all valid tool names.
 *
 * @example
 * ```typescript
 * function processTool(name: ToolName) {
 *   // name is guaranteed to be one of the valid tool names
 * }
 * ```
 */
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

/**
 * Type guard to check if a string is a valid tool name.
 *
 * @param name - The string to check
 * @returns True if the string is a valid tool name
 *
 * @example
 * ```typescript
 * if (isToolName(userInput)) {
 *   // userInput is now typed as ToolName
 *   processTool(userInput);
 * }
 * ```
 */
export function isToolName(name: string): name is ToolName {
  return Object.values(TOOL_NAMES).includes(name as ToolName);
}

/**
 * Array of all canonical tool names (for iteration).
 */
export const ALL_TOOL_NAMES = Object.values(TOOL_NAMES);

/**
 * Total count of canonical tools in the system.
 */
export const TOOL_COUNT = ALL_TOOL_NAMES.length;
