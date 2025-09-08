/**
 * Field mapper configuration and settings
 * Extracted from ../config.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';

/**
 * Determines if strict mode validation should be applied for a resource type
 * In strict mode, field validation errors become blocking errors instead of warnings
 */
export const strictModeFor = (rt: UniversalResourceType): boolean =>
  MappingDefaults[rt]?.strictMode ?? false;
