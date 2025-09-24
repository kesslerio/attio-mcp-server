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
});
