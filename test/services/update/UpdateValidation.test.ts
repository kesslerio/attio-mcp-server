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

  describe('Edge Cases and Validation - PR Feedback', () => {
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

  describe('unwrapArrayValue - Issue #995 Regression Tests', () => {
    it('should handle status field with API enriched response', () => {
      // Exact scenario from Issue #995:
      // User sends: {"status":"Sales Qualified"}
      // API returns: enriched object with timestamps, active_from, etc.
      const fieldName = 'stage';
      const apiResponse = [
        {
          active_from: '2025-12-11T00:56:58.672000000Z',
          active_until: null,
          status: 'Sales Qualified',
          title: 'Sales Qualified',
          created_by_actor: { type: 'user', id: '123' },
        },
      ];

      const unwrapped = UpdateValidation.unwrapArrayValue(
        fieldName,
        apiResponse
      );

      // Should extract just "Sales Qualified"
      expect(unwrapped).toBe('Sales Qualified');
    });

    it('should handle status field with title property (fallback)', () => {
      // Some API responses might use 'title' instead of 'status'
      const fieldName = 'stage';
      const apiResponse = [
        {
          active_from: '2025-12-11T00:56:58.672000000Z',
          active_until: null,
          title: 'Sales Qualified',
          // Note: no 'status' property, only 'title'
        },
      ];

      const unwrapped = UpdateValidation.unwrapArrayValue(
        fieldName,
        apiResponse
      );

      // Should extract "Sales Qualified" from title
      expect(unwrapped).toBe('Sales Qualified');
    });

    it('should prefer status over title when both exist', () => {
      const fieldName = 'stage';
      const apiResponse = [
        {
          status: 'From Status',
          title: 'From Title',
        },
      ];

      const unwrapped = UpdateValidation.unwrapArrayValue(
        fieldName,
        apiResponse
      );

      // Should prefer 'status' property
      expect(unwrapped).toBe('From Status');
    });

    it('should handle multi-select status fields with title', () => {
      const fieldName = 'stage';
      const apiResponse = [{ title: 'Demo' }, { title: 'Qualified' }];

      const unwrapped = UpdateValidation.unwrapArrayValue(
        fieldName,
        apiResponse
      );

      // Should extract array of titles
      expect(unwrapped).toEqual(['Demo', 'Qualified']);
    });

    it('should handle end-to-end comparison with enriched API response', () => {
      // Full integration: compare expected value against enriched API response
      const fieldName = 'stage';
      const expectedValue = 'Sales Qualified';
      const apiResponse = [
        {
          active_from: '2025-12-11T00:56:58.672000000Z',
          active_until: null,
          status: 'Sales Qualified',
          created_by_actor: { type: 'user', id: '123' },
        },
      ];

      const result = UpdateValidation.compareFieldValues(
        fieldName,
        expectedValue,
        apiResponse
      );

      // Should match without warnings
      expect(result.matches).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should handle comparison with title-only enriched response', () => {
      const fieldName = 'stage';
      const expectedValue = 'Sales Qualified';
      const apiResponse = [
        {
          active_from: '2025-12-11T00:56:58.672000000Z',
          title: 'Sales Qualified',
        },
      ];

      const result = UpdateValidation.compareFieldValues(
        fieldName,
        expectedValue,
        apiResponse
      );

      // Should match without warnings
      expect(result.matches).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should detect semantic mismatch in enriched response', () => {
      const fieldName = 'stage';
      const expectedValue = 'Sales Qualified';
      const apiResponse = [
        {
          active_from: '2025-12-11T00:56:58.672000000Z',
          status: 'Demo', // Different value
        },
      ];

      const result = UpdateValidation.compareFieldValues(
        fieldName,
        expectedValue,
        apiResponse
      );

      // Should NOT match
      expect(result.matches).toBe(false);
    });
  });

  describe('isStatusField - Enhanced Detection', () => {
    it('should recognize stage field variations', () => {
      const statusFields = [
        'stage',
        'deal_stage',
        'pipeline_stage',
        'company_stage',
        'opportunity_stage',
        'sales_stage',
      ];

      for (const fieldName of statusFields) {
        const isStatus = UpdateValidation.isStatusField(fieldName);
        expect(isStatus).toBe(true);
      }
    });

    it('should recognize status field variations', () => {
      const statusFields = [
        'status',
        'deal_status',
        'opportunity_status',
        'project_status',
      ];

      for (const fieldName of statusFields) {
        const isStatus = UpdateValidation.isStatusField(fieldName);
        expect(isStatus).toBe(true);
      }
    });

    it('should NOT recognize non-status fields', () => {
      const regularFields = [
        'name',
        'email',
        'company',
        'description',
        'notes',
      ];

      for (const fieldName of regularFields) {
        const isStatus = UpdateValidation.isStatusField(fieldName);
        expect(isStatus).toBe(false);
      }
    });
  });

  describe('unwrapArrayValue - Null/Empty Edge Cases (defensive)', () => {
    it('should handle null status with valid title (fallback)', () => {
      const fieldName = 'stage';
      const apiResponse = [{ status: null, title: 'Valid Title' }];

      const unwrapped = UpdateValidation.unwrapArrayValue(
        fieldName,
        apiResponse
      );

      // Should fallback to title when status is null
      expect(unwrapped).toBe('Valid Title');
    });

    it('should handle both status and title as null', () => {
      const fieldName = 'stage';
      const apiResponse = [{ status: null, title: null }];

      const unwrapped = UpdateValidation.unwrapArrayValue(
        fieldName,
        apiResponse
      );

      // When both are null, returns null (semantically correct - null is a valid value)
      expect(unwrapped).toBe(null);
    });

    it('should handle empty string status with valid title', () => {
      const fieldName = 'stage';
      const apiResponse = [{ status: '', title: 'Valid Title' }];

      const unwrapped = UpdateValidation.unwrapArrayValue(
        fieldName,
        apiResponse
      );

      // Empty string is a valid value, should not fallback
      expect(unwrapped).toBe('');
    });

    it('should handle both status and title as empty strings', () => {
      const fieldName = 'stage';
      const apiResponse = [{ status: '', title: '' }];

      const unwrapped = UpdateValidation.unwrapArrayValue(
        fieldName,
        apiResponse
      );

      // Empty string is a valid value (takes status)
      expect(unwrapped).toBe('');
    });
  });
});
