import { loadMappingConfig } from '@/utils/config-loader.js';

/**
 * Standard resource types always available in the system.
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
  const config = loadMappingConfig();
  const customObjects = Object.keys(config.mappings?.attributes?.objects || {});

  return [...new Set([...STANDARD_RESOURCE_TYPES, ...customObjects])];
}

/**
 * Canonicalize resource type to valid values and prevent mutations.
 * Supports both standard types and custom objects discovered via config.
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
