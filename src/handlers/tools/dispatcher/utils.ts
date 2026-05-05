/**
 * Dispatcher utilities
 */

export {
  STANDARD_RESOURCE_TYPES,
  getValidResourceTypes,
  canonicalizeResourceType,
} from '@/utils/resource-types.js';

/**
 * Normalize error messages by stripping tool execution prefixes.
 */
export function normalizeToolMsg(msg: string): string {
  return msg.replace(/^Error executing tool '.*?':\s*/, '');
}

/**
 * Standard resource types always available in the system
 */
