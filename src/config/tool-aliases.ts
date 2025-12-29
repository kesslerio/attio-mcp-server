/**
 * Tool alias registry for backward compatibility.
 *
 * This module provides a data-driven approach to tool aliasing, supporting
 * two alias patterns from the pre-MCP compliance era:
 * 1. Noun-verb snake_case (e.g., records_search → search_records)
 * 2. Kebab-case (e.g., search-records → search_records)
 *
 * @see Issue #1039 for MCP compliance context
 * @see Issue #1040 for dual alias system implementation
 * @see Issue #1041 for refactoring improvements
 */

import { warn } from '@/utils/logger.js';
import { TOOL_NAMES } from '@/constants/tool-names.js';

export interface ToolAliasDefinition {
  /** Canonical tool name to resolve to. */
  target: string;
  /** Optional human readable rationale for telemetry. */
  reason?: string;
  /** ISO string for when the alias was introduced. */
  since?: string;
  /** Optional release identifier for planned removal. */
  removal?: string;
}

const TOOL_ALIAS_FLAG = 'MCP_DISABLE_TOOL_ALIASES';
const SINCE_MCP_COMPLIANCE = '2025-12-16';
const REMOVAL_VERSION = 'v2.0.0';

/**
 * Alias pattern definition for programmatic alias generation.
 */
interface AliasPattern {
  /** Deprecated alias name. */
  alias: string;
  /** Canonical tool name to resolve to. */
  target: string;
  /** Human-readable reason for the alias. */
  reason: string;
}

/**
 * Generates noun-verb to verb-first aliases.
 * Pattern: records_{verb} → {verb}_records
 *
 * Examples:
 * - records_search → search_records
 * - records_batch → batch_records
 * - records_get_details → get_record_details
 */
const NOUN_VERB_ALIASES: AliasPattern[] = [
  {
    alias: 'records_search',
    target: TOOL_NAMES.SEARCH_RECORDS,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_get_details',
    target: TOOL_NAMES.GET_RECORD_DETAILS,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_get_attributes',
    target: TOOL_NAMES.GET_RECORD_ATTRIBUTES,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_discover_attributes',
    target: TOOL_NAMES.DISCOVER_RECORD_ATTRIBUTES,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_get_attribute_options',
    target: TOOL_NAMES.GET_RECORD_ATTRIBUTE_OPTIONS,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_get_info',
    target: TOOL_NAMES.GET_RECORD_INFO,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_search_advanced',
    target: TOOL_NAMES.SEARCH_RECORDS_ADVANCED,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_search_by_relationship',
    target: TOOL_NAMES.SEARCH_RECORDS_BY_RELATIONSHIP,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_search_by_content',
    target: TOOL_NAMES.SEARCH_RECORDS_BY_CONTENT,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_search_by_timeframe',
    target: TOOL_NAMES.SEARCH_RECORDS_BY_TIMEFRAME,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_batch',
    target: TOOL_NAMES.BATCH_RECORDS,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
  {
    alias: 'records_search_batch',
    target: TOOL_NAMES.BATCH_SEARCH_RECORDS,
    reason: 'MCP compliance: verb-first snake_case (#1039)',
  },
];

/**
 * Generates kebab-case to snake_case aliases.
 * Pattern: {name-with-dashes} → {name_with_underscores}
 *
 * Examples:
 * - search-records → search_records
 * - create-record → create_record
 * - get-record-details → get_record_details
 */
const KEBAB_CASE_ALIASES: AliasPattern[] = [
  // Search/metadata tools
  {
    alias: 'search-records',
    target: TOOL_NAMES.SEARCH_RECORDS,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'get-record-details',
    target: TOOL_NAMES.GET_RECORD_DETAILS,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'get-attributes',
    target: TOOL_NAMES.GET_RECORD_ATTRIBUTES,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'discover-attributes',
    target: TOOL_NAMES.DISCOVER_RECORD_ATTRIBUTES,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'get-detailed-info',
    target: TOOL_NAMES.GET_RECORD_INFO,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  // Advanced search tools
  {
    alias: 'advanced-search',
    target: TOOL_NAMES.SEARCH_RECORDS_ADVANCED,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'search-by-relationship',
    target: TOOL_NAMES.SEARCH_RECORDS_BY_RELATIONSHIP,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'search-by-content',
    target: TOOL_NAMES.SEARCH_RECORDS_BY_CONTENT,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'search-by-timeframe',
    target: TOOL_NAMES.SEARCH_RECORDS_BY_TIMEFRAME,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  // Batch tools
  {
    alias: 'batch-operations',
    target: TOOL_NAMES.BATCH_RECORDS,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'batch-search',
    target: TOOL_NAMES.BATCH_SEARCH_RECORDS,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  // CRUD tools
  {
    alias: 'create-record',
    target: TOOL_NAMES.CREATE_RECORD,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'update-record',
    target: TOOL_NAMES.UPDATE_RECORD,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'delete-record',
    target: TOOL_NAMES.DELETE_RECORD,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  // Note tools
  {
    alias: 'create-note',
    target: TOOL_NAMES.CREATE_NOTE,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  {
    alias: 'list-notes',
    target: TOOL_NAMES.LIST_NOTES,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
  // Debug tools
  {
    alias: 'smithery-debug-config',
    target: TOOL_NAMES.SMITHERY_DEBUG_CONFIG,
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
  },
];

/**
 * Generates complete alias registry from pattern definitions.
 *
 * @param patterns - Array of alias patterns to convert to registry
 * @returns Frozen registry object with metadata
 */
function generateAliasRegistry(
  patterns: AliasPattern[]
): Record<string, ToolAliasDefinition> {
  const registry: Record<string, ToolAliasDefinition> = {};

  for (const pattern of patterns) {
    registry[pattern.alias] = {
      target: pattern.target,
      reason: pattern.reason,
      since: SINCE_MCP_COMPLIANCE,
      removal: REMOVAL_VERSION,
    };
  }

  return Object.freeze(registry);
}

/**
 * Complete tool alias registry (29 aliases total).
 */
const TOOL_ALIAS_REGISTRY = generateAliasRegistry([
  ...NOUN_VERB_ALIASES,
  ...KEBAB_CASE_ALIASES,
]);

function aliasesEnabled(): boolean {
  return process.env[TOOL_ALIAS_FLAG] !== 'true';
}

export interface ToolAliasResolution {
  name: string;
  alias?: { alias: string; definition: ToolAliasDefinition };
}

export function resolveToolName(toolName: string): ToolAliasResolution {
  if (!aliasesEnabled()) {
    return { name: toolName };
  }

  const definition = TOOL_ALIAS_REGISTRY[toolName];
  if (!definition) {
    return { name: toolName };
  }

  warn(
    'tools.aliases',
    'Resolved deprecated tool alias',
    {
      alias: toolName,
      target: definition.target,
      reason: definition.reason,
      since: definition.since,
      removal: definition.removal,
    },
    'alias-resolution'
  );

  return { name: definition.target, alias: { alias: toolName, definition } };
}

export function getToolAliasRegistry(): Record<string, ToolAliasDefinition> {
  return TOOL_ALIAS_REGISTRY;
}

export function getToolAliasFlag(): string {
  return TOOL_ALIAS_FLAG;
}
