/**
 * Determines which MCP tool set should be exposed to clients.
 *
 * By default we expose the complete universal tool catalogue. Setting
 * `ATTIO_MCP_TOOL_MODE=search` limits the surface area to the lightweight
 * search/fetch compatibility tools that match OpenAI's baseline MCP support.
 */

const SEARCH_ONLY_ENV_VALUE = 'search';

const SEARCH_ONLY_TOOL_NAMES = new Set([
  'search',
  'fetch',
  'aaa-health-check',
  'health-check',
]);

/**
 * Returns true when the server should run in search-only compatibility mode.
 */
export function isSearchOnlyMode(): boolean {
  const mode = (process.env.ATTIO_MCP_TOOL_MODE ?? '').toLowerCase();
  return mode === SEARCH_ONLY_ENV_VALUE;
}

/**
 * Determines whether a given tool name may be exposed in the current mode.
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
