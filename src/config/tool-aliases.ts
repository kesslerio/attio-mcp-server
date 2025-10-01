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

const SINCE_PHASE_1 = '2025-09-30';

const TOOL_ALIAS_REGISTRY: Record<string, ToolAliasDefinition> = Object.freeze({
  'search-records': {
    target: 'records_search',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'get-record-details': {
    target: 'records_get_details',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'get-attributes': {
    target: 'records_get_attributes',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'discover-attributes': {
    target: 'records_discover_attributes',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'get-detailed-info': {
    target: 'records_get_info',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'advanced-search': {
    target: 'records_search_advanced',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'search-by-relationship': {
    target: 'records_search_by_relationship',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'search-by-content': {
    target: 'records_search_by_content',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'search-by-timeframe': {
    target: 'records_search_by_timeframe',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'batch-operations': {
    target: 'records_batch',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
  },
  'batch-search': {
    target: 'records_search_batch',
    reason: 'Phase 1 search tool rename (#776)',
    since: SINCE_PHASE_1,
    removal: 'v1.x (TBD)',
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
