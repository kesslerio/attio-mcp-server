/**
 * Dispatcher utilities
 */

import { loadMappingConfig } from '@/utils/config-loader.js';

/**
 * Normalize error messages by stripping tool execution prefixes.
 */
export function normalizeToolMsg(msg: string): string {
  return msg.replace(/^Error executing tool '.*?':\s*/, '');
}

/**
 * Standard resource types always available in the system
 */
export const STANDARD_RESOURCE_TYPES = [
  'records',
  'lists',
  'people',
  'companies',
  'tasks',
  'deals',
  'notes',
] as const;

export function getValidResourceTypes(): string[] {
  // Load custom objects from mapping config (e.g., "funds", "investment_opportunities")
  const config = loadMappingConfig();
  const customObjects = Object.keys(config.mappings?.attributes?.objects || {});

  // Merge standard + custom (deduplicated)
  return [...new Set([...STANDARD_RESOURCE_TYPES, ...customObjects])];
}

/**
 * Canonicalize resource type to valid values and prevent mutations.
 * Supports both standard types and custom objects discovered via config.
 *
 * Custom objects require running `attio-discover attributes -a` first
 * to populate the mapping config.
 */
export function canonicalizeResourceType(rt: unknown): string {
  const value = String(rt ?? '').toLowerCase();
  const validTypes = getValidResourceTypes();

  if (!validTypes.includes(value)) {
    throw new Error(
      `Invalid resource_type: ${value}. Must be one of: ${validTypes.join(
        ', '
      )}`
    );
  }

  return value;
}
