/**
 * Search utilities extracted from UniversalSearchService
 * Issue #574: Extract shared utilities for reuse
 */

import { AttioRecord } from '../../types/attio.js';
import { TimeframeParams } from '../search-strategies/interfaces.js';

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
      let score = 0;

      // Check each search field for matches
      searchFields.forEach((field) => {
        if (fieldValue) {

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
            score += matches * 10;
          }
          // Partial word match gets lower score
          else {
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
      return nameA.localeCompare(nameB);
    });

    return scoredResults.map((item) => item.record);
  }

  /**
   * Helper method to extract field value from a record
   */
  static getFieldValue(record: AttioRecord, field: string): string {
    if (!values) return '';


    // Handle different field value structures
    if (typeof fieldValue === 'string') {
      return fieldValue;
    } else if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      // For array fields like email_addresses, get the first value
      if (typeof firstItem === 'string') {
        return firstItem;
      } else if (
        firstItem &&
        typeof firstItem === 'object' &&
        'value' in firstItem
      ) {
        return String(firstItem.value || '');
      }
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
   * Helper method to extract field value from a list record for content search
   */
  static getListFieldValue(list: AttioRecord, field: string): string {
    if (!values) return '';


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
    if (!values) return '';


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
      ? existingFilters.filters
      : [];
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