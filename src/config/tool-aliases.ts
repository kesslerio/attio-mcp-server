/**
 * Call-only v2 migration aliases.
 *
 * The map lives in `@/constants/tool-names.js`. This module resolves a prior
 * default-catalog name to that canonical name and nothing else.
 *
 * Contract:
 * - Aliases are accepted through v2.x and removable in v3.0.0.
 * - `MCP_DISABLE_TOOL_ALIASES=true` makes previous names fail.
 * - Resolution renames only. It does not invent resource_type or rewrite payloads.
 * - Alias names are not tools/list entries.
 * - Mode checks run on the resolved canonical name, so an alias cannot reach
 *   a tool the allowlist hides.
 * - Removed pre-v2 names are absent here and do not resolve.
 */

import { warn } from '@/utils/logger.js';
import {
  assertToolNameMigrationIntegrity,
  migrationAliasMap,
  type ToolNameMigrationEntry,
} from '@/constants/tool-names.js';

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
const SINCE_V2_MIGRATION = '2026-10-05';
const REMOVAL_VERSION = 'v3.0.0';
const ALIAS_REASON =
  'v2 resource-first name; call-only migration alias for the prior default catalog';

assertToolNameMigrationIntegrity();

function buildAliasRegistry(): Record<string, ToolAliasDefinition> {
  const registry: Record<string, ToolAliasDefinition> = {};
  for (const [alias, target] of migrationAliasMap()) {
    registry[alias] = {
      target,
      reason: ALIAS_REASON,
      since: SINCE_V2_MIGRATION,
      removal: REMOVAL_VERSION,
    };
  }
  return Object.freeze(registry);
}

const TOOL_ALIAS_REGISTRY = buildAliasRegistry();

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

export type { ToolNameMigrationEntry };
