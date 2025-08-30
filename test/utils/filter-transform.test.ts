/**
 * Tests for filter transformation utilities
 */
import { describe, expect, test } from 'vitest';

import { FilterConditionType } from '../../src/types/attio';
import { FilterValidationError } from '../../src/errors/api-errors';
import { transformFiltersToApiFormat } from '../../src/utils/record-utils';

describe('transformFiltersToApiFormat', () => {
  // Test basic filter transformation
  test('transforms a single filter condition correctly', () => {
      filters: [
        {
          attribute: { slug: 'stage' },
          condition: FilterConditionType.EQUALS,
          value: 'discovery',
        },
      ],
    };


    expect(result).toEqual({
      filter: {
        stage: {
          $equals: 'discovery',
        },
      },
    });
  });

  // Test empty filters
  test('returns empty object for undefined filters', () => {
    expect(result).toEqual({});
  });

  test('returns empty object for empty filters array', () => {
    expect(result).toEqual({});
  });

  // Test AND logic (default behavior)
  test('creates AND logic for multiple filters by default', () => {
      filters: [
        {
          attribute: { slug: 'stage' },
          condition: FilterConditionType.EQUALS,
          value: 'discovery',
        },
        {
          attribute: { slug: 'value' },
          condition: FilterConditionType.GREATER_THAN,
          value: 10000,
        },
      ],
    };


    expect(result).toEqual({
      filter: {
        stage: {
          $equals: 'discovery',
        },
        value: {
          $gt: 10000,
        },
      },
    });
  });

  // Test OR logic
  test('creates OR logic when matchAny is true', () => {
      filters: [
        {
          attribute: { slug: 'stage' },
          condition: FilterConditionType.EQUALS,
          value: 'discovery',
        },
        {
          attribute: { slug: 'stage' },
          condition: FilterConditionType.EQUALS,
          value: 'proposal',
        },
      ],
      matchAny: true,
    };


    expect(result).toEqual({
      filter: {
        $or: [
          { stage: { $equals: 'discovery' } },
          { stage: { $equals: 'proposal' } },
        ],
      },
    });
  });

  // Test different filter condition types
  test('supports various filter condition types', () => {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.CONTAINS,
          value: 'Tech',
        },
        {
          attribute: { slug: 'created_at' },
          condition: FilterConditionType.GREATER_THAN,
          value: '2023-01-01',
        },
        {
          attribute: { slug: 'is_active' },
          condition: FilterConditionType.IS_SET,
          value: null,
        },
      ],
    };


    expect(result).toEqual({
      filter: {
        name: {
          $contains: 'Tech',
        },
        created_at: {
          $gt: '2023-01-01',
        },
        is_active: {
          $is_set: null,
        },
      },
    });
  });

  // Test error cases
  test('throws FilterValidationError for invalid filter condition', () => {
      filters: [
        {
          attribute: { slug: 'stage' },
          condition: 'invalid_condition', // Invalid condition
          value: 'discovery',
        },
      ],
    };

    expect(() => transformFiltersToApiFormat(filter)).toThrow(
      FilterValidationError
    );
  });

  test('skips filters with missing attribute slug', () => {
      filters: [
        {
          attribute: { slug: '' }, // Empty slug
          condition: FilterConditionType.EQUALS,
          value: 'discovery',
        },
      ],
    };

    expect(result).toEqual({});
  });

  test('skips filters with missing condition', () => {
      filters: [
        {
          attribute: { slug: 'stage' },
          condition: undefined as any, // Missing condition
          value: 'discovery',
        },
      ],
    };

    expect(result).toEqual({});
  });

  // Test validation bypassing
  test('skips condition validation when validateConditions is false', () => {
      filters: [
        {
          attribute: { slug: 'stage' },
          condition: 'custom_condition', // Would normally be invalid
          value: 'discovery',
        },
      ],
    };


    expect(result).toEqual({
      filter: {
        stage: {
          $custom_condition: 'discovery',
        },
      },
    });
  });
});
