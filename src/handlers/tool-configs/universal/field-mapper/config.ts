/**
 * Field mapper configuration and settings
 * Extracted from ../config.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';

/**
 * Mapping configuration defaults for each resource type
 * Controls strict mode behavior for field validation
 */
export const MappingDefaults: Record<
  UniversalResourceType,
  { strictMode: boolean }
> = {
  [UniversalResourceType.COMPANIES]: { strictMode: false },
  [UniversalResourceType.PEOPLE]: { strictMode: false },
  [UniversalResourceType.DEALS]: { strictMode: false },
  [UniversalResourceType.TASKS]: { strictMode: false },
  [UniversalResourceType.RECORDS]: { strictMode: true },
  [UniversalResourceType.NOTES]: { strictMode: true },
  [UniversalResourceType.LISTS]: { strictMode: false },
};

/**
 * Determines if strict mode validation should be applied for a resource type
 * In strict mode, field validation errors become blocking errors instead of warnings
 */
export const strictModeFor = (rt: UniversalResourceType): boolean =>
  MappingDefaults[rt]?.strictMode ?? false;
