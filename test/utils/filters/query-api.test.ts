/**
 * Test suite for Issue #523 - Query API implementation
 * Tests TC-010 (Relationship), TC-011 (Content), TC-012 (Timeframe) search functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createQueryApiFilter,
  createRelationshipQuery,
  createTimeframeQuery,
  createContentSearchQuery,
  transformFiltersToQueryApiFormat,
} from '../../../src/utils/filters/index.js';
import {
  RelationshipQuery,
  TimeframeQuery,
  AttioQueryApiFilter,
} from '../../../src/utils/filters/types.js';

describe('Query API Implementation - Issue #523', () => {
  describe('TC-010: Relationship Search', () => {
    it('should create proper relationship query with path and constraints', () => {
      const config: RelationshipQuery = {
        sourceObjectType: 'companies',
        targetObjectType: 'people',
        targetAttribute: 'id',
        condition: 'equals',
        value: 'person_123',
      };

      const result = createRelationshipQuery(config);

      expect(result).toEqual({
        filter: {
          path: ['people', 'id'],
          constraints: [
            {
              operator: 'equals',
              value: 'person_123',
            },
          ],
        },
      });
    });

    it('should handle company to people relationship queries', () => {
      const config: RelationshipQuery = {
        sourceObjectType: 'companies',
        targetObjectType: 'people',
        targetAttribute: 'company_id',
        condition: 'equals',
        value: 'company_456',
      };

      const result = createRelationshipQuery(config);

      expect(result.filter?.path).toEqual(['people', 'company_id']);
      expect(result.filter?.constraints?.[0].operator).toBe('equals');
      expect(result.filter?.constraints?.[0].value).toBe('company_456');
    });
  });

  describe('TC-011: Content Search', () => {
    it('should create proper content search query with OR logic', () => {
      const fields = ['name', 'description', 'domains'];
      const query = 'Tech Company';

      const result = createContentSearchQuery(fields, query, true);

      expect(result.filter?.$or).toHaveLength(3);
      expect(result.filter?.$or?.[0]).toEqual({
        filter: {
          path: ['name'],
          constraints: [
            {
              operator: 'contains',
              value: 'Tech Company',
            },
          ],
        },
      });
    });

    it('should create proper content search query with AND logic', () => {
      const fields = ['name', 'description'];
      const query = 'Software';

      const result = createContentSearchQuery(fields, query, false);

      expect(result.filter?.$and).toHaveLength(2);
      expect(result.filter?.$and?.[0]).toEqual({
        filter: {
          path: ['name'],
          constraints: [
            {
              operator: 'contains',
              value: 'Software',
            },
          ],
        },
      });
    });

    it('should handle single field content search', () => {
      const fields = ['name'];
      const query = 'Acme Corp';

      const result = createContentSearchQuery(fields, query, true);

      // Single field should still use the query API format
      expect(result).toEqual({
        filter: {
          path: ['name'],
          constraints: [
            {
              operator: 'contains',
              value: 'Acme Corp',
            },
          ],
        },
      });
    });
  });

  describe('TC-012: Timeframe Search', () => {
    it('should create proper date range query for between operator', () => {
      const config: TimeframeQuery = {
        attribute: 'created_at',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        operator: 'between',
      };

      const result = createTimeframeQuery(config);

      expect(result).toEqual({
        filter: {
          path: [['created_at']],
          constraints: {
            $gte: '2024-01-01',
            $lte: '2024-12-31',
          },
        },
      });
    });

    it('should create proper single date query for greater_than operator', () => {
      const config: TimeframeQuery = {
        attribute: 'updated_at',
        startDate: '2024-06-01',
        operator: 'greater_than',
      };

      const result = createTimeframeQuery(config);

      expect(result).toEqual({
        filter: {
          path: [['updated_at']],
          constraints: {
            $gt: '2024-06-01',
          },
        },
      });
    });

    it('should create proper single date query for less_than operator', () => {
      const config: TimeframeQuery = {
        attribute: 'last_interaction',
        endDate: '2024-03-15',
        operator: 'less_than',
      };

      const result = createTimeframeQuery(config);

      expect(result).toEqual({
        filter: {
          path: [['last_interaction']],
          constraints: {
            $lt: '2024-03-15',
          },
        },
      });
    });
  });

  describe('Query API Filter Builder', () => {
    it('should create basic query API filter with path and constraints', () => {
      const result = createQueryApiFilter(['name'], 'contains', 'Test Company');

      expect(result).toEqual({
        filter: {
          path: ['name'],
          constraints: [
            {
              operator: 'contains',
              value: 'Test Company',
            },
          ],
        },
      });
    });

    it('should handle complex path arrays for relationship queries', () => {
      const result = createQueryApiFilter(
        ['company', 'industry'],
        'equals',
        'Technology'
      );

      expect(result).toEqual({
        filter: {
          path: ['company', 'industry'],
          constraints: [
            {
              operator: 'equals',
              value: 'Technology',
            },
          ],
        },
      });
    });
  });

  describe('Legacy Filter Format Transformation', () => {
    it('should transform legacy filters to query API format for single filter', () => {
      const legacyFilters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Acme',
          },
        ],
      };

      const result = transformFiltersToQueryApiFormat(legacyFilters);

      expect(result).toEqual({
        filter: {
          path: ['name'],
          constraints: [
            {
              operator: 'contains',
              value: 'Acme',
            },
          ],
        },
      });
    });

    it('should transform legacy filters to query API format for multiple filters with OR logic', () => {
      const legacyFilters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Acme',
          },
          {
            attribute: { slug: 'industry' },
            condition: 'equals',
            value: 'Technology',
          },
        ],
        matchAny: true,
      };

      const result = transformFiltersToQueryApiFormat(legacyFilters);

      expect(result.filter?.$or).toHaveLength(2);
      expect(result.filter?.$or?.[0]).toEqual({
        filter: {
          path: ['name'],
          constraints: [
            {
              operator: 'contains',
              value: 'Acme',
            },
          ],
        },
      });
    });

    it('should handle empty filters gracefully', () => {
      const result = transformFiltersToQueryApiFormat(undefined);
      expect(result).toEqual({});

      const emptyFilters = { filters: [] };
      const result2 = transformFiltersToQueryApiFormat(emptyFilters);
      expect(result2).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid relationship query', () => {
      expect(() => {
        const config = {
          sourceObjectType: '',
          targetObjectType: 'people',
          targetAttribute: 'id',
          condition: 'equals',
          value: 'test',
        } as RelationshipQuery;
        createRelationshipQuery(config);
      }).toThrow();
    });

    it('should throw error for invalid timeframe query', () => {
      expect(() => {
        const config = {
          attribute: '',
          operator: 'between' as const,
        };
        createTimeframeQuery(config);
      }).toThrow();
    });

    it('should throw error for empty content search fields', () => {
      expect(() => {
        createContentSearchQuery([], 'test query');
      }).toThrow();
    });
  });
});
