/**
 * Tests for list-specific attribute filtering
 *
 * These tests verify that list-specific attributes (stage, status, etc.)
 * are filtered correctly using direct field access, while parent record
 * attributes use the record.values path.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformFiltersToApiFormat } from '../../src/utils/filters/translators.js';
import { isListSpecificAttribute } from '../../src/utils/filters/utils.js';

describe('List-Specific Attribute Detection', () => {
  describe('isListSpecificAttribute', () => {
    it('should identify common list-specific attributes', () => {
      const listAttributes = [
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
      const uuids = [
        '2e9b7337-7ffa-4c28-8496-d0aff1b186db',
        '123e4567-e89b-12d3-a456-426614174000',
      ];

      uuids.forEach((uuid) => {
        expect(isListSpecificAttribute(uuid)).toBe(true);
      });
    });

    it('should not identify parent record attributes as list-specific', () => {
      const parentAttributes = [
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
    it('should use direct field access for list-specific attributes', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'equals',
            value: 'Contacted',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(filters, true, true);

      expect(result).toEqual({
        filter: {
          stage: {
            $eq: 'Contacted',
          },
        },
      });
    });

    it('should use record.values path for parent record attributes', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Inc',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(filters, true, true);

      expect(result).toEqual({
        filter: {
          'record.values.name': {
            $contains: 'Inc',
          },
        },
      });
    });

    it('should handle multiple list-specific attributes with AND logic', async () => {
      const filters = {
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

      const result = await transformFiltersToApiFormat(filters, true, true);

      expect(result).toEqual({
        filter: {
          stage: {
            $eq: 'Contacted',
          },
          priority: {
            $eq: 'High',
          },
        },
      });
    });

    it('should handle OR logic with list-specific attributes', async () => {
      const filters = {
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

      const result = await transformFiltersToApiFormat(filters, true, true);

      expect(result).toEqual({
        filter: {
          $or: [{ stage: { $eq: 'Contacted' } }, { stage: { $eq: 'Demo' } }],
        },
      });
    });

    it('should handle mixed filters with both list and parent attributes', async () => {
      const filters = {
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

      const result = await transformFiltersToApiFormat(filters, true, true);

      expect(result).toEqual({
        filter: {
          stage: {
            $eq: 'Contacted',
          },
          'record.values.name': {
            $contains: 'Tech',
          },
        },
      });
    });

    it('should handle UUID attribute filters', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: '2e9b7337-7ffa-4c28-8496-d0aff1b186db' },
            condition: 'equals',
            value: 'Active',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(filters, true, true);

      expect(result).toEqual({
        filter: {
          '2e9b7337-7ffa-4c28-8496-d0aff1b186db': {
            $eq: 'Active',
          },
        },
      });
    });

    it('should handle empty value conditions correctly', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'is_not_empty',
            value: '',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(filters, true, true);

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
    it('should use standard field access for all attributes', async () => {
      const filters = {
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

      const result = await transformFiltersToApiFormat(filters, true, false);

      expect(result).toEqual({
        filter: {
          stage: {
            $eq: 'Active',
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
  it('should handle attributes with special characters', async () => {
    const filters = {
      filters: [
        {
          attribute: { slug: 'list_notes' },
          condition: 'contains',
          value: 'Important',
        },
      ],
    };

    const result = await transformFiltersToApiFormat(filters, true, true);

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

  it('should handle complex OR conditions with mixed attributes', async () => {
    const filters = {
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

    const result = await transformFiltersToApiFormat(filters, true, true);

    expect(result).toEqual({
      filter: {
        $or: [
          { stage: { $eq: 'Contacted' } },
          { priority: { $eq: 'High' } },
          { 'record.values.name': { $contains: 'Corp' } },
        ],
      },
    });
  });
});
