/**
 * Tests for UpdateValidation service
 * Specifically testing the fix for Issue #705 - data type handling in field verification
 */

import { describe, it, expect } from 'vitest';
import { UpdateValidation } from '../../../src/services/update/UpdateValidation.js';

describe('UpdateValidation - Issue #705 Fix', () => {
  describe('compareFieldValues', () => {
    it('should handle status fields with status property', () => {
      // Test case from Issue #705: stage field with status objects
      const expectedValue = 'Demo';
      const actualValue = [
        { status: 'Demo', id: 'demo_id', title: 'Demo Stage' },
      ];

      const result = UpdateValidation.compareFieldValues(
        'stage',
        expectedValue,
        actualValue
      );

      expect(result.matches).toBe(true);
    });

    it('should handle multiple status values in arrays', () => {
      const expectedValue = ['Demo', 'Qualified'];
      const actualValue = [
        { status: 'Demo', id: 'demo_id' },
        { status: 'Qualified', id: 'qualified_id' },
      ];

      const result = UpdateValidation.compareFieldValues(
        'stage',
        expectedValue,
        actualValue
      );

      expect(result.matches).toBe(true);
    });

    it('should handle regular value fields (non-status)', () => {
      const expectedValue = 'Test Company';
      const actualValue = [{ value: 'Test Company' }];

      const result = UpdateValidation.compareFieldValues(
        'name',
        expectedValue,
        actualValue
      );

      expect(result.matches).toBe(true);
    });

    it('should handle expected status objects', () => {
      const expectedValue = { status: 'Demo' };
      const actualValue = [{ status: 'Demo', id: 'demo_id' }];

      const result = UpdateValidation.compareFieldValues(
        'stage',
        expectedValue,
        actualValue
      );

      expect(result.matches).toBe(true);
    });

    it('should handle stage field variations', () => {
      // Test different stage-related field names
      const testCases = ['stage', 'deal_stage', 'company_stage'];

      for (const fieldName of testCases) {
        const expectedValue = 'Qualified';
        const actualValue = [{ status: 'Qualified', id: 'qualified_id' }];

        const result = UpdateValidation.compareFieldValues(
          fieldName,
          expectedValue,
          actualValue
        );

        expect(result.matches).toBe(true);
      }
    });

    it('should handle case mismatches with warnings', () => {
      const expectedValue = 'demo';
      const actualValue = [{ status: 'Demo', id: 'demo_id' }];

      const result = UpdateValidation.compareFieldValues(
        'stage',
        expectedValue,
        actualValue
      );

      expect(result.matches).toBe(true);
      expect(result.warning).toContain('case mismatch');
    });

    it('should handle null and undefined values', () => {
      // Test null expected value
      let result = UpdateValidation.compareFieldValues('stage', null, null);
      expect(result.matches).toBe(true);

      // Test undefined expected value
      result = UpdateValidation.compareFieldValues(
        'stage',
        undefined,
        undefined
      );
      expect(result.matches).toBe(true);

      // Test mismatch
      result = UpdateValidation.compareFieldValues('stage', 'Demo', null);
      expect(result.matches).toBe(false);
    });

    it('should handle non-array actual values for status fields', () => {
      const expectedValue = 'Demo';
      const actualValue = 'Demo'; // Direct string value

      const result = UpdateValidation.compareFieldValues(
        'stage',
        expectedValue,
        actualValue
      );

      expect(result.matches).toBe(true);
    });
  });

  describe('Edge Cases and Performance - PR Feedback', () => {
    it('should handle concurrent field validation requests', async () => {
      // Test concurrent validation of the same field
      const fieldName = 'stage';
      const expectedValue = 'Demo';
      const actualValue = [{ status: 'Demo', id: 'demo_id' }];

      // Create multiple concurrent validation requests
      const promises = Array.from({ length: 10 }, () =>
        UpdateValidation.compareFieldValues(
          fieldName,
          expectedValue,
          actualValue
        )
      );

      const results = await Promise.all(promises);

      // All should return the same result
      results.forEach((result) => {
        expect(result.matches).toBe(true);
        expect(result.warning).toBeUndefined();
      });
    });

    it('should handle very large arrays efficiently', async () => {
      // Test performance with large arrays
      const fieldName = 'tags';
      const expectedValue = Array.from({ length: 1000 }, (_, i) => `tag-${i}`);
      const actualValue = expectedValue.map((tag) => ({ value: tag }));

      const startTime = Date.now();
      const result = UpdateValidation.compareFieldValues(
        fieldName,
        expectedValue,
        actualValue
      );
      const duration = Date.now() - startTime;

      expect(result.matches).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle deeply nested comparison structures', async () => {
      // Test with complex nested structures
      const fieldName = 'complex_field';
      const expectedValue = [
        'value1',
        'value2',
        'value3',
        'value4', // Same case for array comparison
      ];
      const actualValue = [
        { value: 'value1' },
        { value: 'value2' },
        { value: 'value3' },
        { value: 'value4' },
      ];

      const result = UpdateValidation.compareFieldValues(
        fieldName,
        expectedValue,
        actualValue
      );

      expect(result.matches).toBe(true);

      // Test case-insensitive for single string comparison
      const singleResult = UpdateValidation.compareFieldValues(
        fieldName,
        'VALUE_TEST',
        [{ value: 'value_test' }]
      );

      expect(singleResult.matches).toBe(true);
      expect(singleResult.warning).toContain('case mismatch');
    });

    it('should handle malformed array structures', async () => {
      // Test with malformed actual values
      const fieldName = 'malformed_field';
      const expectedValue = 'test_value';

      const malformedCases = [
        [null], // null in array
        [undefined], // undefined in array
        [{}], // empty object
        [{ value: null }], // null value property
        [{ value: undefined }], // undefined value property
        [{ notValue: 'test' }], // wrong property name
      ];

      for (const actualValue of malformedCases) {
        const result = UpdateValidation.compareFieldValues(
          fieldName,
          expectedValue,
          actualValue
        );
        // Should not throw and should handle gracefully
        expect(typeof result).toBe('object');
        expect(typeof result.matches).toBe('boolean');
      }
    });

    it('should handle status field edge cases', async () => {
      // Test status fields with various edge cases
      const fieldName = 'stage';

      const edgeCases = [
        {
          name: 'mixed status and value properties',
          expectedValue: 'Demo',
          actualValue: [{ status: 'Demo', value: 'should_ignore_this' }],
          shouldMatch: true,
        },
        {
          name: 'status field with empty status',
          expectedValue: 'Demo',
          actualValue: [{ status: '', id: 'demo_id' }],
          shouldMatch: false,
        },
        {
          name: 'status field with null status',
          expectedValue: 'Demo',
          actualValue: [{ status: null, id: 'demo_id' }],
          shouldMatch: false,
        },
        {
          name: 'multiple status objects',
          expectedValue: ['Demo', 'Qualified'],
          actualValue: [
            { status: 'Demo', id: 'demo_id' },
            { status: 'Qualified', id: 'qualified_id' },
          ],
          shouldMatch: true,
        },
      ];

      for (const testCase of edgeCases) {
        const result = UpdateValidation.compareFieldValues(
          fieldName,
          testCase.expectedValue,
          testCase.actualValue
        );
        expect(result.matches).toBe(testCase.shouldMatch);
      }
    });

    it('should provide helpful case mismatch warnings', async () => {
      // Test case mismatch warning generation
      const fieldName = 'name';
      const expectedValue = 'Test Company';
      const actualValue = [{ value: 'test company' }]; // Different case

      const result = UpdateValidation.compareFieldValues(
        fieldName,
        expectedValue,
        actualValue
      );

      expect(result.matches).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('case mismatch');
      expect(result.warning).toContain('Test Company');
      expect(result.warning).toContain('test company');
    });
  });
});
