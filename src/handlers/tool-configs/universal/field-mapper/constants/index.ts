/**
 * Field mapping constants - centralized exports
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';
import { FieldMapping } from '../types.js';

// Import all resource-specific mappings
import { COMPANIES_FIELD_MAPPING } from './companies.js';
import { PEOPLE_FIELD_MAPPING } from './people.js';
import { DEALS_FIELD_MAPPING } from './deals.js';
import { TASKS_FIELD_MAPPING } from './tasks.js';
import { RECORDS_FIELD_MAPPING } from './records.js';
import { NOTES_FIELD_MAPPING } from './notes.js';
import { LISTS_FIELD_MAPPING } from './lists.js';

// Re-export individual mappings
export {
  COMPANIES_FIELD_MAPPING,
  PEOPLE_FIELD_MAPPING,
  DEALS_FIELD_MAPPING,
  TASKS_FIELD_MAPPING,
  RECORDS_FIELD_MAPPING,
  NOTES_FIELD_MAPPING,
  LISTS_FIELD_MAPPING,
};

/**
 * Unified resource type mappings - maintains backward compatibility
 * with the original FIELD_MAPPINGS object structure
 */
export const RESOURCE_TYPE_MAPPINGS: Record<UniversalResourceType, FieldMapping> = {
  [UniversalResourceType.COMPANIES]: COMPANIES_FIELD_MAPPING,
  [UniversalResourceType.PEOPLE]: PEOPLE_FIELD_MAPPING,
  [UniversalResourceType.DEALS]: DEALS_FIELD_MAPPING,
  [UniversalResourceType.TASKS]: TASKS_FIELD_MAPPING,
  [UniversalResourceType.RECORDS]: RECORDS_FIELD_MAPPING,
  [UniversalResourceType.NOTES]: NOTES_FIELD_MAPPING,
  [UniversalResourceType.LISTS]: LISTS_FIELD_MAPPING,
};