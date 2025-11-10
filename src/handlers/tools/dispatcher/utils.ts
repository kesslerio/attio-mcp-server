/**
 * Dispatcher utilities
 */
import { loadMappingConfig } from '../../../utils/config-loader.js';

/**
 * Normalize error messages by stripping tool execution prefixes.
 */
export function normalizeToolMsg(msg: string): string {
  return msg.replace(/^Error executing tool '.*?':\s*/, '');
}

/**
 * Canonicalize resource type to valid values and prevent mutations.
 * Supports both standard objects and custom objects defined in mapping config.
 */
export function canonicalizeResourceType(rt: unknown): string {
  const value = String(rt ?? '').toLowerCase();

  // Standard resource types that are always valid
  const standardTypes = [
    'records',
    'lists',
    'people',
    'companies',
    'tasks',
    'deals',
    'notes',
  ];

  // Load custom objects from mapping configuration
  // Custom objects are discovered via attio-discover and stored in config/mappings/user.json
  const config = loadMappingConfig();
  const customObjects = Object.keys(config.mappings.attributes.objects || {});

  // Merge standard types with custom objects (deduplicated)
  const validTypes = [...new Set([...standardTypes, ...customObjects])];

  if (!validTypes.includes(value)) {
    throw new Error(
      `Invalid resource_type: ${value}. Must be one of: ${validTypes.join(', ')}`
    );
  }

  return value;
}
