/**
 * Integration tests for advanced-search filter documentation
 * Validates that documented filter patterns work correctly
 *
 * Issue #512: Advanced Search Filter Schema Requirements Undocumented
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { validateFilters } from '../../src/utils/filters/validation-utils.js';
import { FilterValidationError } from '../../src/errors/api-errors.js';

describe('Advanced Search Filter Documentation', () => {
  describe('Valid Filter Patterns (from README examples)', () => {
    it('should accept single filter format', () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Tech',
          },
        ],
      };

      expect(() => validateFilters(filters)).not.toThrow();
    });

    it('should accept multiple filters format (AND logic)', () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Tech',
          },
          {
            attribute: { slug: 'industry' },
            condition: 'equals',
            value: 'Technology',
          },
        ],
      };

      expect(() => validateFilters(filters)).not.toThrow();
    });

    it('should accept OR logic format', () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Tech',
          },
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Corp',
          },
        ],
        matchAny: true,
      };

      expect(() => validateFilters(filters)).not.toThrow();
    });

    it('should accept all supported conditions', () => {
      const supportedConditions = [
        'contains',
        'equals',
        'starts_with',
        'ends_with',
        'greater_than',
        'less_than',
        'is_empty',
        'is_not_empty',
      ];

      for (const condition of supportedConditions) {
        const filters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: condition,
              value: condition.includes('is_') ? undefined : 'test_value',
            },
          ],
        };

        expect(() => validateFilters(filters)).not.toThrow();
      }
    });
  });

  describe('Error Messages (from Issue #512)', () => {
    it('should provide helpful error when filters property is missing', () => {
      const invalidFilters = {
        // Missing "filters" array property
        name: { operator: 'contains', value: 'Test' },
      };

      expect(() => validateFilters(invalidFilters as any)).toThrow(
        FilterValidationError
      );

      try {
        validateFilters(invalidFilters as any);
      } catch (error: any) {
        expect(error.message).toContain('Invalid filter format');
        expect(error.message).toContain('Expected structure');
        expect(error.message).toContain('"filters"');
        expect(error.message).toContain('array format');
        expect(error.message).toContain('documentation');
      }
    });

    it('should provide helpful error when filters is not an array', () => {
      const invalidFilters = {
        filters: {
          // Should be array, not object
          name: { operator: 'contains', value: 'Test' },
        },
      };

      expect(() => validateFilters(invalidFilters as any)).toThrow(
        FilterValidationError
      );

      try {
        validateFilters(invalidFilters as any);
      } catch (error: any) {
        expect(error.message).toContain('must be an array');
        expect(error.message).toContain('Expected format');
      }
    });

    it('should provide context when all filters are invalid', () => {
      const invalidFilters = {
        filters: [
          {
            // Missing required properties
            invalid: 'filter',
          },
        ],
      };

      expect(() => validateFilters(invalidFilters as any)).toThrow(
        FilterValidationError
      );

      try {
        validateFilters(invalidFilters as any);
      } catch (error: any) {
        expect(error.message).toContain('All filters are invalid');
        expect(error.message).toContain('Example of valid filter structure');
      }
    });
  });

  describe('Common Field Names (from README)', () => {
    it('should accept common company field names', () => {
      const companyFields = [
        'name',
        'website',
        'industry',
        'employee_count',
        'location',
      ];

      for (const field of companyFields) {
        const filters = {
          filters: [
            {
              attribute: { slug: field },
              condition: 'contains',
              value: 'test',
            },
          ],
        };

        expect(() => validateFilters(filters)).not.toThrow();
      }
    });

    it('should accept common people field names', () => {
      const peopleFields = ['full_name', 'email', 'job_title', 'company'];

      for (const field of peopleFields) {
        const filters = {
          filters: [
            {
              attribute: { slug: field },
              condition: 'contains',
              value: 'test',
            },
          ],
        };

        expect(() => validateFilters(filters)).not.toThrow();
      }
    });

    it('should accept common task field names', () => {
      const taskFields = ['content', 'status', 'due_date', 'assignee'];

      for (const field of taskFields) {
        const filters = {
          filters: [
            {
              attribute: { slug: field },
              condition: 'contains',
              value: 'test',
            },
          ],
        };

        expect(() => validateFilters(filters)).not.toThrow();
      }
    });
  });

  describe('Filter Structure Validation', () => {
    it('should require attribute object', () => {
      const invalidFilters = {
        filters: [
          {
            // Missing attribute object
            condition: 'contains',
            value: 'test',
          },
        ],
      };

      expect(() => validateFilters(invalidFilters as any)).toThrow();
    });

    it('should require attribute.slug property', () => {
      const invalidFilters = {
        filters: [
          {
            attribute: {}, // Missing slug
            condition: 'contains',
            value: 'test',
          },
        ],
      };

      expect(() => validateFilters(invalidFilters as any)).toThrow();
    });

    it('should require condition property', () => {
      const invalidFilters = {
        filters: [
          {
            attribute: { slug: 'name' },
            // Missing condition
            value: 'test',
          },
        ],
      };

      expect(() => validateFilters(invalidFilters as any)).toThrow();
    });
  });

  describe('QA Test Case TC-009.1 Scenario', () => {
    it('should handle the original failing test case with clear guidance', () => {
      // This is the exact format that was failing in QA Test Case TC-009.1
      const originalFailingFormat = {
        query: 'QA',
        filters: {
          name: {
            operator: 'contains',
            value: 'Test',
          },
        },
        limit: 5,
      };

      // This should fail with a helpful error message
      expect(() =>
        validateFilters(originalFailingFormat.filters as any)
      ).toThrow(FilterValidationError);

      try {
        validateFilters(originalFailingFormat.filters as any);
      } catch (error: any) {
        // Verify the error message provides clear guidance
        expect(error.message).toContain('Invalid filter format');
        expect(error.message).toContain('Expected structure');
        expect(error.message).toContain('array format');
      }
    });

    it('should accept the corrected format from the issue description', () => {
      // This is the correct format from the issue description
      const correctedFormat = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'Test',
          },
        ],
      };

      // This should pass validation
      expect(() => validateFilters(correctedFormat)).not.toThrow();
    });
  });
});
