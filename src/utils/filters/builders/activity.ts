/**
 * Activity related filter builders.
 */

// External imports
import { createDateRangeFilter } from './date.js';
import { createDateRangeFilter } from './date.js';
import { FilterValidationError } from '../../../errors/api-errors.js';
import { resolveDateRange } from '../../date-utils.js';
import { validateActivityFilter } from '../validators.js';
import { validateActivityFilter } from '../validators.js';

// Internal imports
import {
  FilterConditionType,
  ListEntryFilter,
  ListEntryFilters,
  DateRange,
  ActivityFilter,
  InteractionType,
  ATTRIBUTES,
} from './types.js';
import { validateActivityFilter } from '../validators.js';
import { createDateRangeFilter } from './date.js';

/**
 * Creates an activity filter for finding records with specific interaction types within a date range.
 */
export function createActivityFilter(
  activityFilter: ActivityFilter
): ListEntryFilters {
  const filters: ListEntryFilter[] = [];

    ATTRIBUTES.LAST_INTERACTION,
    validated.dateRange
  );
  if (dateFilter.filters) {
    filters.push(...dateFilter.filters);
  }

  if (validated.interactionType) {
    filters.push({
      attribute: { slug: ATTRIBUTES.INTERACTION_TYPE },
      condition: FilterConditionType.EQUALS,
      value: validated.interactionType,
    });
  }

  return { filters, matchAny: false };
}

/**
 * Creates a filter for records based on their last interaction date.
 */
export function createLastInteractionFilter(
  dateRange: DateRange,
  interactionType?: InteractionType
): ListEntryFilters {
  try {
    const filters: ListEntryFilter[] = [];

    if (resolvedRange.start) {
      filters.push({
        attribute: { slug: ATTRIBUTES.LAST_INTERACTION },
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
        value: resolvedRange.start,
      });
    }

    if (resolvedRange.end) {
      filters.push({
        attribute: { slug: ATTRIBUTES.LAST_INTERACTION },
        condition: FilterConditionType.LESS_THAN_OR_EQUALS,
        value: resolvedRange.end,
      });
    }

    if (interactionType && interactionType !== InteractionType.ANY) {
      filters.push({
        attribute: { slug: ATTRIBUTES.INTERACTION_TYPE },
        condition: FilterConditionType.EQUALS,
        value: interactionType,
      });
    }

    return { filters, matchAny: false };
  } catch (error: unknown) {
    throw new FilterValidationError(
      `Failed to create interaction filter: ${message}`
    );
  }
}
