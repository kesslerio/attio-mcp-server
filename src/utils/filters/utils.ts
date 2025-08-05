/**
 * General filter utility functions
 * Consolidates utilities from filter-utils.ts and filter-utils-additions.ts
 */

import { resolveDateRange } from '../date-utils.js';
import {
  ATTRIBUTES,
  type DateRange,
  FilterConditionType,
  type NumericRange,
} from './types.js';

/**
 * Creates a filter for records based on their creation date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createCreatedDateFilter(dateRange: DateRange) {
  return createDateRangeFilter(ATTRIBUTES.CREATED_AT, dateRange);
}

/**
 * Creates a filter for records based on their last modification date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createModifiedDateFilter(dateRange: DateRange) {
  return createDateRangeFilter(ATTRIBUTES.UPDATED_AT, dateRange);
}

/**
 * Creates a filter for B2B Segment (type_persona)
 *
 * @param value - B2B Segment value to filter by
 * @returns Configured filter object
 */
export function createB2BSegmentFilter(value: string) {
  // Using a simple equals filter that will be transformed using the shorthand format
  return {
    filters: [
      {
        attribute: { slug: 'type_persona' },
        condition: FilterConditionType.EQUALS, // This won't be used for type_persona due to shorthand format
        value,
      },
    ],
    matchAny: false,
  };
}

/**
 * Validates if a value falls within a numeric range
 *
 * @param value - The value to check
 * @param range - The numeric range to validate against
 * @returns True if value is within range
 */
export function isInNumericRange(value: number, range: NumericRange): boolean {
  if (range.equals !== undefined) {
    return value === range.equals;
  }

  if (range.min !== undefined && value < range.min) {
    return false;
  }

  if (range.max !== undefined && value > range.max) {
    return false;
  }

  return true;
}

/**
 * Checks if a date string falls within a date range
 *
 * @param dateStr - ISO date string to check
 * @param range - Date range to validate against
 * @returns True if date is within range
 */
export function isInDateRange(dateStr: string, range: DateRange): boolean {
  const date = new Date(dateStr);
  const resolvedRange = resolveDateRange(range);

  if (resolvedRange.start) {
    const startDate = new Date(resolvedRange.start);
    if (date < startDate) return false;
  }

  if (resolvedRange.end) {
    const endDate = new Date(resolvedRange.end);
    if (date > endDate) return false;
  }

  return true;
}

/**
 * Debug logging for filter operations
 *
 * @param operation - The operation being performed
 * @param details - Additional details to log
 */
export function debugFilterLog(operation: string, details: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Filter ${operation}]`, details);
  }
}

/**
 * Determines if a filter attribute represents a date field
 *
 * @param attributeSlug - The attribute slug to check
 * @returns True if the attribute is a date field
 */
export function isDateAttribute(attributeSlug: string): boolean {
  const dateAttributes = [
    ATTRIBUTES.CREATED_AT,
    ATTRIBUTES.UPDATED_AT,
    ATTRIBUTES.LAST_INTERACTION,
  ];

  return dateAttributes.includes(attributeSlug);
}

/**
 * Determines if a filter attribute represents a numeric field
 *
 * @param attributeSlug - The attribute slug to check
 * @returns True if the attribute is a numeric field
 */
export function isNumericAttribute(attributeSlug: string): boolean {
  const numericAttributes = [ATTRIBUTES.REVENUE, ATTRIBUTES.EMPLOYEE_COUNT];

  return numericAttributes.includes(attributeSlug);
}

/**
 * Determines if a filter attribute represents a text field
 *
 * @param attributeSlug - The attribute slug to check
 * @returns True if the attribute is a text field
 */
export function isTextAttribute(attributeSlug: string): boolean {
  const textAttributes = [
    ATTRIBUTES.NAME,
    ATTRIBUTES.EMAIL,
    ATTRIBUTES.WEBSITE,
    ATTRIBUTES.NOTE_CONTENT,
    ATTRIBUTES.INDUSTRY,
  ];

  return textAttributes.includes(attributeSlug);
}

/**
 * List-specific attributes that are stored directly on list entries
 * These attributes are not part of the parent record but are specific to the list context
 */
const LIST_SPECIFIC_ATTRIBUTES = [
  'stage',
  'Stage',
  'status',
  'Status',
  'priority',
  'Priority',
  'score',
  'Score',
  'rating',
  'Rating',
  'lead_rating',
  'Lead Rating',
  'value',
  'Value',
  'notes',
  'Notes',
  'list_notes',
  'List Notes',
];

/**
 * Determines if an attribute is list-specific (stored on the list entry itself)
 * rather than on the parent record (company, person, etc.)
 *
 * @param attributeSlug - The attribute slug to check
 * @returns True if the attribute is list-specific
 */
export function isListSpecificAttribute(attributeSlug: string): boolean {
  // Check if it's in our known list-specific attributes
  if (LIST_SPECIFIC_ATTRIBUTES.includes(attributeSlug)) {
    return true;
  }

  // Check if it's a UUID (attribute IDs are list-specific)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(attributeSlug)) {
    return true;
  }

  // Check for common patterns in list-specific attribute names
  const listPatterns = [
    /^list[_\s]/i,
    /[_\s]stage$/i,
    /[_\s]status$/i,
    /[_\s]priority$/i,
    /[_\s]score$/i,
    /[_\s]rating$/i,
  ];

  return listPatterns.some((pattern) => pattern.test(attributeSlug));
}

/**
 * Helper function to extract attribute mappings as needed
 * Re-exports builder functions as utilities for backward compatibility
 */
import {
  createContainsFilter,
  createDateRangeFilter,
  createEqualsFilter,
} from './builders.js';

export { createDateRangeFilter, createEqualsFilter, createContainsFilter };
