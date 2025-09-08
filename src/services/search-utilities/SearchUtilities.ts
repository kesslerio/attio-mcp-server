/**
 * Search utilities extracted from UniversalSearchService
 * Issue #574: Extract shared utilities for reuse
 */

import { AttioRecord } from '../../types/attio.js';
import { TimeframeParams } from '../search-strategies/interfaces.js';

/**
 * Interfaces for type safety improvements (Issue #598)
 */
interface AttioFieldValueObject {
  value: unknown;
}

interface AttioFieldValueArray extends Array<string | AttioFieldValueObject> {}

type AttioFieldValue = string | AttioFieldValueArray | AttioFieldValueObject | null | undefined;

/**
 * Utility functions for search operations
 */
export class SearchUtilities {
  /**
   * Rank search results by relevance based on query match frequency
   * This provides client-side relevance scoring since Attio API doesn't have native relevance ranking
   */
  static rankByRelevance(
    results: AttioRecord[],
    query: string,
    searchFields: string[]
  ): AttioRecord[] {
    // Calculate relevance score for each result
    const scoredResults = results.map((record) => {
      let score = 0;
      const queryLower = query.toLowerCase();

      // Check each search field for matches
      searchFields.forEach((field) => {
        const fieldValue = this.getFieldValue(record, field);
        if (fieldValue) {
          const valueLower = fieldValue.toLowerCase();

          // Exact match gets highest score
          if (valueLower === queryLower) {
            score += 100;
          }
          // Starts with query gets high score
          else if (valueLower.startsWith(queryLower)) {
            score += 50;
          }
          // Contains query gets moderate score
          else if (valueLower.includes(queryLower)) {
            score += 25;
            // Additional score for more occurrences
            const matches = valueLower.split(queryLower).length - 1;
            score += matches * 10;
          }
          // Partial word match gets lower score
          else {
            const queryWords = queryLower.split(/\s+/);
            queryWords.forEach((word) => {
              if (valueLower.includes(word)) {
                score += 5;
              }
            });
          }
        }
      });

      return { record, score };
    });

    // Sort by score (descending) then by name
    scoredResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary sort by name if scores are equal
      const nameA = this.getFieldValue(a.record, 'name') || '';
      const nameB = this.getFieldValue(b.record, 'name') || '';
      return nameA.localeCompare(nameB);
    });

    return scoredResults.map((item) => item.record);
  }

  /**
   * Helper method to extract field value from a record
   * Issue #598: Simplified with better type safety and helper methods
   */
  static getFieldValue(record: AttioRecord, field: string): string {
    const values = record.values as Record<string, AttioFieldValue>;
    if (!values) return '';

    const fieldValue = values[field];
    return this.extractStringFromFieldValue(fieldValue);
  }

  /**
   * Extract string value from various Attio field value structures
   */
  private static extractStringFromFieldValue(fieldValue: AttioFieldValue): string {
    if (typeof fieldValue === 'string') {
      return fieldValue;
    }
    
    if (Array.isArray(fieldValue)) {
      return this.extractStringFromArray(fieldValue);
    }
    
    if (this.isFieldValueObject(fieldValue)) {
      return String(fieldValue.value || '');
    }
    
    return '';
  }

  /**
   * Extract string from array field values (e.g., email_addresses)
   */
  private static extractStringFromArray(fieldArray: AttioFieldValueArray): string {
    if (fieldArray.length === 0) return '';
    
    const firstItem = fieldArray[0];
    if (typeof firstItem === 'string') {
      return firstItem;
    }
    
    if (this.isFieldValueObject(firstItem)) {
      return String(firstItem.value || '');
    }
    
    return '';
  }

  /**
   * Type guard for field value objects
   */
  private static isFieldValueObject(value: unknown): value is AttioFieldValueObject {
    return value !== null && 
           value !== undefined && 
           typeof value === 'object' && 
           'value' in value;
  }

  /**
   * Helper method to extract field value from a list record for content search
   */
  static getListFieldValue(list: AttioRecord, field: string): string {
    const values = list.values as Record<string, unknown>;
    if (!values) return '';

    const fieldValue = values[field];

    // Handle different field value structures for lists
    if (typeof fieldValue === 'string') {
      return fieldValue;
    } else if (
      fieldValue &&
      typeof fieldValue === 'object' &&
      'value' in fieldValue
    ) {
      return String((fieldValue as { value: unknown }).value || '');
    }

    return '';
  }

  /**
   * Helper method to extract field value from a task record for content search
   */
  static getTaskFieldValue(task: AttioRecord, field: string): string {
    const values = task.values as Record<string, unknown>;
    if (!values) return '';

    const fieldValue = values[field];

    // Handle different field value structures for tasks
    if (typeof fieldValue === 'string') {
      return fieldValue;
    } else if (
      fieldValue &&
      typeof fieldValue === 'object' &&
      'value' in fieldValue
    ) {
      return String((fieldValue as { value: unknown }).value || '');
    }

    return '';
  }

  /**
   * Create date filter from timeframe parameters
   */
  static createDateFilter(timeframeParams: TimeframeParams): Record<string, unknown> | null {
    const { timeframe_attribute, start_date, end_date, date_operator } = timeframeParams;

    if (!timeframe_attribute) {
      return null;
    }

    const filters: Array<Record<string, unknown>> = [];

    if (date_operator === 'between' && start_date && end_date) {
      // Between date range - use valid API conditions
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'greater_than',
        value: start_date,
      });
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'less_than',
        value: end_date,
      });
    } else if (date_operator === 'greater_than' && start_date) {
      // After start date - use valid API condition
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'greater_than',
        value: start_date,
      });
    } else if (date_operator === 'less_than' && end_date) {
      // Before end date - use valid API condition
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'less_than',
        value: end_date,
      });
    } else if (date_operator === 'equals' && start_date) {
      // Exact date match
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'equals',
        value: start_date,
      });
    }

    if (filters.length === 0) {
      return null;
    }

    return {
      filters,
      matchAny: false, // Use AND logic for date ranges
    };
  }

  /**
   * Merge timeframe filters with existing filters
   */
  static mergeFilters(
    existingFilters: Record<string, unknown> | undefined,
    dateFilter: Record<string, unknown>
  ): Record<string, unknown> {
    if (!existingFilters) {
      return dateFilter;
    }

    // If existing filters already has a filters array, merge them
    if (
      Array.isArray(existingFilters.filters) &&
      Array.isArray(dateFilter.filters)
    ) {
      return {
        ...existingFilters,
        filters: [...existingFilters.filters, ...dateFilter.filters],
      };
    }

    // Otherwise, create a new structure with both sets of filters
    const existingFilterArray = Array.isArray(existingFilters.filters)
      ? existingFilters.filters
      : [];
    const dateFilterArray = Array.isArray(dateFilter.filters)
      ? dateFilter.filters
      : [];

    return {
      ...existingFilters,
      filters: [...existingFilterArray, ...dateFilterArray],
      // Preserve existing matchAny logic if it exists
      matchAny: existingFilters.matchAny || false,
    };
  }
}