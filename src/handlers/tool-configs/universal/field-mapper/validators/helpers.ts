/**
 * Helper utilities for validation modules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';

/**
 * Get a list of valid resource types for error messages
 */
export function getValidResourceTypes(): string {
  return Object.values(UniversalResourceType).join(', ');
}
