/**
 * Tests for activity and historical filtering functionality
 */

import {
  type ActivityFilter,
  type DateRange,
  InteractionType,
} from '../../src/types/attio.js';
import {
  createActivityFilter,
  createCreatedDateFilter,
  createDateRangeFilter,
  createLastInteractionFilter,
  createModifiedDateFilter,
} from '../../src/utils/record-utils.js';

describe('Activity and Historical filtering', () => {
  describe('createDateRangeFilter', () => {
    it('should create a filter with start date only', () => {
      const startDate = '2023-01-01T00:00:00.000Z';
      const dateRange: DateRange = { start: startDate };
      const filter = createDateRangeFilter('created_at', dateRange);

      expect(filter.filters).toHaveLength(1);
      expect(filter.filters![0].attribute.slug).toBe('created_at');
      expect(filter.filters![0].condition).toBe('gte');
      expect(filter.filters![0].value).toBe(startDate);
    });

    it('should create a filter with end date only', () => {
      const endDate = '2023-12-31T23:59:59.999Z';
      const dateRange: DateRange = { end: endDate };
      const filter = createDateRangeFilter('created_at', dateRange);

      expect(filter.filters).toHaveLength(1);
      expect(filter.filters![0].attribute.slug).toBe('created_at');
      expect(filter.filters![0].condition).toBe('lt');
      expect(filter.filters![0].value).toBe(endDate);
    });

    it('should create a filter with both start and end dates', () => {
      const startDate = '2023-01-01T00:00:00.000Z';
      const endDate = '2023-12-31T23:59:59.999Z';
      const dateRange: DateRange = { start: startDate, end: endDate };
      const filter = createDateRangeFilter('created_at', dateRange);

      expect(filter.filters).toHaveLength(2);
      expect(filter.filters![0].attribute.slug).toBe('created_at');
      expect(filter.filters![0].condition).toBe('gte');
      expect(filter.filters![0].value).toBe(startDate);
      expect(filter.filters![1].attribute.slug).toBe('created_at');
      expect(filter.filters![1].condition).toBe('lt');
      expect(filter.filters![1].value).toBe(endDate);
      expect(filter.matchAny).toBe(false);
    });
  });

  describe('createCreatedDateFilter', () => {
    it('should create a filter for record creation date', () => {
      const dateRange: DateRange = {
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-12-31T23:59:59.999Z',
      };
      const filter = createCreatedDateFilter(dateRange);

      expect(filter.filters).toHaveLength(2);
      expect(filter.filters![0].attribute.slug).toBe('created_at');
      expect(filter.filters![1].attribute.slug).toBe('created_at');
    });
  });

  describe('createModifiedDateFilter', () => {
    it('should create a filter for record modification date', () => {
      const dateRange: DateRange = {
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-12-31T23:59:59.999Z',
      };
      const filter = createModifiedDateFilter(dateRange);

      expect(filter.filters).toHaveLength(2);
      expect(filter.filters![0].attribute.slug).toBe('updated_at');
      expect(filter.filters![1].attribute.slug).toBe('updated_at');
    });
  });

  describe('createLastInteractionFilter', () => {
    it('should create a filter for last interaction date', () => {
      const dateRange: DateRange = {
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-12-31T23:59:59.999Z',
      };
      const filter = createLastInteractionFilter(dateRange);

      expect(filter.filters).toHaveLength(2);
      expect(filter.filters![0].attribute.slug).toBe('last_interaction');
      expect(filter.filters![1].attribute.slug).toBe('last_interaction');
    });

    it('should include interaction type when specified', () => {
      const dateRange: DateRange = {
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-12-31T23:59:59.999Z',
      };
      const interactionType = InteractionType.EMAIL;
      const filter = createLastInteractionFilter(dateRange, interactionType);

      expect(filter.filters).toHaveLength(3);
      expect(filter.filters![0].attribute.slug).toBe('last_interaction');
      expect(filter.filters![1].attribute.slug).toBe('last_interaction');
      expect(filter.filters![2].attribute.slug).toBe('interaction_type');
      expect(filter.filters![2].condition).toBe('equals');
      expect(filter.filters![2].value).toBe(interactionType);
    });

    it('should not include interaction type when ANY is specified', () => {
      const dateRange: DateRange = {
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-12-31T23:59:59.999Z',
      };
      const interactionType = InteractionType.ANY;
      const filter = createLastInteractionFilter(dateRange, interactionType);

      expect(filter.filters).toHaveLength(2);
      expect(filter.filters![0].attribute.slug).toBe('last_interaction');
      expect(filter.filters![1].attribute.slug).toBe('last_interaction');
    });
  });

  describe('createActivityFilter', () => {
    it('should create a filter for activity', () => {
      const activityFilter: ActivityFilter = {
        dateRange: {
          start: '2023-01-01T00:00:00.000Z',
          end: '2023-12-31T23:59:59.999Z',
        },
        interactionType: InteractionType.EMAIL,
      };
      const filter = createActivityFilter(activityFilter);

      expect(filter.filters).toHaveLength(3);
      expect(filter.filters![0].attribute.slug).toBe('last_interaction');
      expect(filter.filters![1].attribute.slug).toBe('last_interaction');
      expect(filter.filters![2].attribute.slug).toBe('interaction_type');
      expect(filter.filters![2].value).toBe(InteractionType.EMAIL);
    });
  });
});
