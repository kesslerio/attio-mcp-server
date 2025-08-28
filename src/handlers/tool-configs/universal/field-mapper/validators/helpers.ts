/**
 * Helper utilities for validation modules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';

/**
 * Utility function to check if an attribute exists in available attributes
 * Case-insensitive matching for attribute names
 */
export const attrHas = (attrs?: string[], k?: string): boolean =>
  !!attrs && !!k && (attrs.includes(k) || attrs.includes(k.toLowerCase()));

/**
 * Resource type mappings - maps invalid resource types to valid ones
 * Includes common typos and variations for user-friendly error correction
 */
export const RESOURCE_TYPE_MAPPINGS: Record<string, UniversalResourceType> = {
  record: UniversalResourceType.RECORDS,
  records: UniversalResourceType.RECORDS,
  company: UniversalResourceType.COMPANIES,
  companies: UniversalResourceType.COMPANIES,
  person: UniversalResourceType.PEOPLE,
  people: UniversalResourceType.PEOPLE,
  deal: UniversalResourceType.DEALS,
  deals: UniversalResourceType.DEALS,
  task: UniversalResourceType.TASKS,
  tasks: UniversalResourceType.TASKS,
  note: UniversalResourceType.NOTES,
  notes: UniversalResourceType.NOTES,
  // Common typos and variations
  comapny: UniversalResourceType.COMPANIES,
  compnay: UniversalResourceType.COMPANIES,
  poeple: UniversalResourceType.PEOPLE,
  peolpe: UniversalResourceType.PEOPLE,
  dela: UniversalResourceType.DEALS,
  dael: UniversalResourceType.DEALS,
};

/**
 * Get a list of valid resource types for error messages
 */
export function getValidResourceTypes(): string {
  return Object.values(UniversalResourceType).join(', ');
}