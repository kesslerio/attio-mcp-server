/**
 * Canonical tool catalog used by `attio-discover tools`.
 * The names are the tools/list payload, which does not include migration aliases.
 */
import { getToolsListPayload } from '@/utils/mcp-discovery.js';

export function listAdvertisedToolNames(): string[] {
  return getToolsListPayload().tools.map((tool) => tool.name);
}
