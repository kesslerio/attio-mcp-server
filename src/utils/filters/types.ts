/**
 * @module types
 *
 * Consolidated filter type definitions for Attio API
 * Central location for all filter-related interfaces, types, enums, and constants
 *
 * This module provides:
 * - Type definitions for filters and filter configurations
 * - Attribute constants for consistent field references
 * - Error types specific to filter operations
 * - Enums and interfaces from external dependencies
 */

import {
  FilterConditionType,
  DateRange,
  NumericRange,
  InteractionType,
  ActivityFilter,
  RelationshipType,
  ResourceType,
} from '../../types/attio.js';
import {
  ListEntryFilter,
  ListEntryFilters,
} from '../../api/operations/types.js';

/**
 * Attribute constants for better code readability and consistency
 */
export const ATTRIBUTES = {
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  LAST_INTERACTION: 'last_interaction',
  INTERACTION_TYPE: 'interaction_type',
  EMAIL: 'email',
  PHONE: 'phone',
  NAME: 'name',
  WEBSITE: 'website',
  INDUSTRY: 'industry',
  REVENUE: 'annual_revenue',
  EMPLOYEE_COUNT: 'employee_count',
  LIST_ID: 'list_id',
  NOTE_CONTENT: 'note_content',
  RELATIONSHIP: '$relationship',
};

/**
 * Type for the Attio API filter object format
 * Represents the structure expected by Attio API endpoints
 */
export type AttioApiFilter = {
  [attributeSlug: string]: {
    [condition: string]: any;
  };
};

/**
 * New Query API format for Attio - proper path-based filtering
 * Based on Attio API documentation for advanced filtering with constraints
 */
export interface AttioQueryApiFilter {
  filter?: {
    path: string[];
    constraints: {
      operator: string;
      value: unknown;
    }[];
  } | {
    $and?: AttioQueryApiFilter[];
    $or?: AttioQueryApiFilter[];
  } | {
    [field: string]: {
      [operator: string]: any;
    };
  };
}

/**
 * Path constraint for relationship queries
 */
export interface PathConstraint {
  path: string[];
  constraints: {
    operator: string;
    value: unknown;
  }[];
}

/**
 * Relationship query configuration
 */
export interface RelationshipQuery {
  sourceObjectType: string;
  targetObjectType: string;
  targetAttribute: string;
  condition: string;
  value: unknown;
}

/**
 * Timeframe query configuration
 */
export interface TimeframeQuery {
  attribute: string;
  startDate?: string;
  endDate?: string;
  operator: 'greater_than' | 'less_than' | 'between' | 'equals';
}

/**
 * Error type for rate-limiting on relationship queries
 */
export class RelationshipRateLimitError extends Error {
  constructor(
    message: string,
    public readonly relationshipType: string,
    public readonly resetTime: number,
    public readonly msUntilReset: number
  ) {
    super(message);
    this.name = 'RelationshipRateLimitError';

    // This line is needed to properly capture the stack trace
    Object.setPrototypeOf(this, RelationshipRateLimitError.prototype);
  }
}

/**
 * Configuration for a relationship-based filter
 */
export interface RelationshipFilterConfig {
  // The source record type
  sourceType: ResourceType;

  // The target record type
  targetType: ResourceType;

  // The relationship type connecting the records
  relationshipType: RelationshipType;

  // Filters to apply to the target records
  targetFilters: ListEntryFilters;
}

/**
 * Special case field-operator mappings and handling flags
 */
export const FIELD_SPECIAL_HANDLING: Record<string, any> = {
  // Special handling for B2B Segment field (type_persona)
  type_persona: {
    in: 'contains_any',
    contains_any: 'contains_any',
    not_empty: 'not_empty',
    operators: ['in', 'contains_any', 'not_empty'],
    allowStringValue: true,
    disableDebugLogging: true,
  },
  // Other fields can be added here as needed
  segment: {
    in: 'contains_any',
    contains_any: 'contains_any',
    operators: ['in', 'contains_any'],
  },
};

/**
 * Valid interaction types for activity filtering
 */
export const VALID_INTERACTION_TYPES = new Set<InteractionType>([
  InteractionType.EMAIL,
  InteractionType.CALENDAR,
  InteractionType.PHONE,
  InteractionType.MEETING,
  InteractionType.CUSTOM,
  InteractionType.ANY,
]);

/**
 * Common filter operation types
 */
export type FilterOperation =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'not_empty';

/**
 * Export reusable filter-related types from dependencies
 */
export {
  FilterConditionType,
  type DateRange,
  type NumericRange,
  InteractionType,
  type ActivityFilter,
  RelationshipType,
  ResourceType,
  type ListEntryFilter,
  type ListEntryFilters,
};
