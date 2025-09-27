/**
 * Security constants for protecting against various code injection attacks
 */

/**
 * Keys that pose a prototype pollution risk and must be filtered
 * These keys can modify the prototype chain and should never be used in object merging
 */
export const PROTOTYPE_POLLUTION_KEYS = [
  '__proto__',
  'constructor',
  'prototype',
] as const;

/**
 * Characters that could be used for path traversal attacks
 */
export const PATH_TRAVERSAL_CHARS = ['.', '/', '\\'] as const;

/**
 * Combined dangerous keys for object merging operations
 * Includes both prototype pollution keys and path traversal prevention
 */
export const DANGEROUS_KEYS = [...PROTOTYPE_POLLUTION_KEYS] as const;
