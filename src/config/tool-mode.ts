/**
 * Determines which MCP tool set should be exposed to clients.
 *
 * By default we expose the complete universal tool catalogue. Setting
 * `ATTIO_MCP_TOOL_MODE=search` limits the surface area to the lightweight
 * search/fetch compatibility tools that match OpenAI's baseline MCP support.
 *
 * The allowlist is the three canonical names only. Callers must resolve
 * migration aliases first (`resolveToolName`) and then call `isToolAllowed`
 * on that canonical name. Checking the alias string itself fails closed:
 * a prior name is not in this set, so it cannot widen search-only mode.
 */

import { SEARCH_ONLY_CANONICAL_TOOL_NAMES } from '@/constants/tool-names.js';

const SEARCH_ONLY_ENV_VALUE = 'search';

const SEARCH_ONLY_TOOL_NAMES = new Set<string>(
  SEARCH_ONLY_CANONICAL_TOOL_NAMES
);

/**
 * Returns true when the server should run in search-only compatibility mode.
 */
export function isSearchOnlyMode(): boolean {
  const mode = (process.env.ATTIO_MCP_TOOL_MODE ?? '').toLowerCase();
  return mode === SEARCH_ONLY_ENV_VALUE;
}

/**
 * Determines whether a canonical tool name may be exposed in the current mode.
 * Pass the name returned by `resolveToolName`, not the caller's raw alias.
 */
export function isToolAllowed(toolName: string): boolean {
  if (!isSearchOnlyMode()) {
    return true;
  }
  return SEARCH_ONLY_TOOL_NAMES.has(toolName);
}

/**
 * Filters an array of tool definitions/configurations so only the allowed
 * tools are returned for the active server mode.
 */
export function filterAllowedTools<T extends { name: string }>(
  tools: T[]
): T[] {
  if (!isSearchOnlyMode()) {
    return tools;
  }
  return tools.filter((tool) => isToolAllowed(tool.name));
}

export function searchOnlyCanonicalToolNames(): readonly string[] {
  return SEARCH_ONLY_CANONICAL_TOOL_NAMES;
}
