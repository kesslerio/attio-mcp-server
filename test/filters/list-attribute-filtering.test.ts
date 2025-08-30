/**
 * Tests for list-specific attribute filtering
 *
 * These tests verify that list-specific attributes (stage, status, etc.)
 * are filtered correctly using direct field access, while parent record
 * attributes use the record.values path.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { isListSpecificAttribute } from '../../src/utils/filters/utils.js';
import { transformFiltersToApiFormat } from '../../src/utils/filters/translators.js';

describe('List-Specific Attribute Detection', () => {
  describe('isListSpecificAttribute', () => {
    it('should identify common list-specific attributes', () => {
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
      ];

      listAttributes.forEach((attr) => {
        expect(isListSpecificAttribute(attr)).toBe(true);
      });
    });

    it('should identify UUID attributes as list-specific', () => {
        '2e9b7337-7ffa-4c28-8496-d0aff1b186db',
        '123e4567-e89b-12d3-a456-426614174000',
      ];

      uuids.forEach((uuid) => {
        expect(isListSpecificAttribute(uuid)).toBe(true);
      });
    });

    it('should not identify parent record attributes as list-specific', () => {
        'name',
        'email',
        'website',
        'industry',
        'company',
        'phone',
      ];

      parentAttributes.forEach((attr) => {
        expect(isListSpecificAttribute(attr)).toBe(false);
      });
    });
  });
});

describe('List Entry Filter Transformation', () => {
  describe('transformFiltersToApiFormat with list entry context', () => {
    it('should use direct field access for list-specific attributes', () => {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'equals',
            value: 'Contacted',
          },
        ],
      };


      expect(result).toEqual({
        filter: {
          stage: {
            $equals: 'Contacted',
          },
        },
      });
    });

    it('should use record.values path for parent record attributes', () => {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Inc',
          },
        ],
      };


      expect(result).toEqual({
        filter: {
          'record.values.name': {
            $contains: 'Inc',
          },
        },
      });
    });

    it('should handle multiple list-specific attributes with AND logic', () => {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'equals',
            value: 'Contacted',
          },
          {
            attribute: { slug: 'priority' },
            condition: 'equals',
            value: 'High',
          },
        ],
        matchAny: false,
      };


      expect(result).toEqual({
        filter: {
          stage: {
            $equals: 'Contacted',
          },
          priority: {
            $equals: 'High',
          },
        },
      });
    });

    it('should handle OR logic with list-specific attributes', () => {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'equals',
            value: 'Contacted',
          },
          {
            attribute: { slug: 'stage' },
            condition: 'equals',
            value: 'Demo',
          },
        ],
        matchAny: true,
      };


      expect(result).toEqual({
        filter: {
          $or: [
            { stage: { $equals: 'Contacted' } },
            { stage: { $equals: 'Demo' } },
          ],
        },
      });
    });

    it('should handle mixed filters with both list and parent attributes', () => {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'equals',
            value: 'Contacted',
          },
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Tech',
          },
        ],
        matchAny: false,
      };


      expect(result).toEqual({
        filter: {
          stage: {
            $equals: 'Contacted',
          },
          'record.values.name': {
            $contains: 'Tech',
          },
        },
      });
    });

    it('should handle UUID attribute filters', () => {
        filters: [
          {
            attribute: { slug: '2e9b7337-7ffa-4c28-8496-d0aff1b186db' },
            condition: 'equals',
            value: 'Active',
          },
        ],
      };


      expect(result).toEqual({
        filter: {
          '2e9b7337-7ffa-4c28-8496-d0aff1b186db': {
            $equals: 'Active',
          },
        },
      });
    });

    it('should handle empty value conditions correctly', () => {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'is_not_empty',
            value: '',
          },
        ],
      };


      expect(result).toEqual({
        filter: {
          stage: {
            $is_not_empty: '',
          },
        },
      });
    });
  });

  describe('transformFiltersToApiFormat without list entry context', () => {
    it('should use standard field access for all attributes', () => {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'equals',
            value: 'Active',
          },
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Inc',
          },
        ],
      };


      expect(result).toEqual({
        filter: {
          stage: {
            $equals: 'Active',
          },
          name: {
            $contains: 'Inc',
          },
        },
      });
    });
  });
});

describe('Edge Cases', () => {
  it('should handle attributes with special characters', () => {
      filters: [
        {
          attribute: { slug: 'list_notes' },
          condition: 'contains',
          value: 'Important',
        },
      ],
    };


    expect(result).toEqual({
      filter: {
        list_notes: {
          $contains: 'Important',
        },
      },
    });
  });

  it('should handle case-sensitive attribute detection', () => {
    expect(isListSpecificAttribute('Stage')).toBe(true);
    expect(isListSpecificAttribute('STAGE')).toBe(false); // Not in the predefined list
    expect(isListSpecificAttribute('stage')).toBe(true);
  });

  it('should handle complex OR conditions with mixed attributes', () => {
      filters: [
        {
          attribute: { slug: 'stage' },
          condition: 'equals',
          value: 'Contacted',
        },
        {
          attribute: { slug: 'priority' },
          condition: 'equals',
          value: 'High',
        },
        {
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'Corp',
        },
      ],
      matchAny: true,
    };


    expect(result).toEqual({
      filter: {
        $or: [
          { stage: { $equals: 'Contacted' } },
          { priority: { $equals: 'High' } },
          { 'record.values.name': { $contains: 'Corp' } },
        ],
      },
    });
  });
});
