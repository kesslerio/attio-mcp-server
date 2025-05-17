/**
 * Shared types for API operations
 * Re-exports and additional type definitions used across modules
 */

import {
  BatchRequestItem as BatchRequestItemType,
  BatchItemResult as BatchItemResultType,
  BatchResponse as BatchResponseType,
  BatchConfig as BatchConfigType
} from '../../types/attio.js';

// Re-export batch types for convenience
export type BatchRequestItem<T> = BatchRequestItemType<T>;
export type BatchItemResult<R> = BatchItemResultType<R>;
export type BatchResponse<R> = BatchResponseType<R>;
export type BatchConfig = BatchConfigType;

/**
 * Filter definition for list entries
 */
export interface ListEntryFilter {
  attribute: {
    slug: string;
  };
  condition: string;
  value: any;
  /**
   * Optional logical operator to use when combined with other filters
   * If not provided, default is 'and'
   */
  logicalOperator?: 'and' | 'or';
}

/**
 * Parameters for filtering list entries
 */
export interface ListEntryFilters {
  /**
   * Individual filter conditions to apply
   */
  filters?: ListEntryFilter[];
  /**
   * When true, at least one filter must match (equivalent to OR)
   * When false or omitted, all filters must match (equivalent to AND)
   */
  matchAny?: boolean;
  /**
   * Optional array of attribute groups for complex nested conditions
   * Each group is treated as a unit with its own logical operator
   */
  groups?: {
    attributes: ListEntryFilter[];
    logicalOperator?: 'and' | 'or';
  }[];
  [key: string]: any;
}

/**
 * Common types and interfaces shared across API operations
 */

// Additional shared types can be added here as needed