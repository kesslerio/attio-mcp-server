import { warn } from '@/utils/logger.js';

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

const TOOL_ALIAS_REGISTRY: Record<string, ToolAliasDefinition> = Object.freeze({
  // Universal search/metadata tools - dual aliases (old noun_verb snake + old kebab)
  records_search: {
    target: 'search_records',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'search-records': {
    target: 'search_records',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_get_details: {
    target: 'get_record_details',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'get-record-details': {
    target: 'get_record_details',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_get_attributes: {
    target: 'get_record_attributes',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'get-attributes': {
    target: 'get_record_attributes',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_discover_attributes: {
    target: 'discover_record_attributes',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'discover-attributes': {
    target: 'discover_record_attributes',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_get_attribute_options: {
    target: 'get_record_attribute_options',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_get_info: {
    target: 'get_record_info',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'get-detailed-info': {
    target: 'get_record_info',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_search_advanced: {
    target: 'search_records_advanced',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'advanced-search': {
    target: 'search_records_advanced',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_search_by_relationship: {
    target: 'search_records_by_relationship',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'search-by-relationship': {
    target: 'search_records_by_relationship',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_search_by_content: {
    target: 'search_records_by_content',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'search-by-content': {
    target: 'search_records_by_content',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_search_by_timeframe: {
    target: 'search_records_by_timeframe',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'search-by-timeframe': {
    target: 'search_records_by_timeframe',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_batch: {
    target: 'batch_records',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'batch-operations': {
    target: 'batch_records',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  records_search_batch: {
    target: 'batch_search_records',
    reason: 'MCP compliance: verb-first snake_case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'batch-search': {
    target: 'batch_search_records',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  // CRUD tools - kebab to snake_case
  'create-record': {
    target: 'create_record',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'update-record': {
    target: 'update_record',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'delete-record': {
    target: 'delete_record',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  // Note tools - kebab to snake_case
  'create-note': {
    target: 'create_note',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
  'list-notes': {
    target: 'list_notes',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },

  // Debug tool - kebab to snake_case
  'smithery-debug-config': {
    target: 'smithery_debug_config',
    reason: 'MCP compliance: snake_case over kebab-case (#1039)',
    since: SINCE_MCP_COMPLIANCE,
    removal: 'v2.0.0',
  },
});

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
