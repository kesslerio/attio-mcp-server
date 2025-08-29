/**
 * Split: UniversalUtilityService display name extraction
 */
import { describe, it, expect } from 'vitest';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';

describe('UniversalUtilityService', () => {
  describe('extractDisplayName', () => {
    describe('Basic Extraction', () => {
      it('should extract name from various fields', () => {
        const values = {
          name: [{ value: 'Test Company' }],
          domain: [{ value: 'test.com' }],
        } as any;

        expect(UniversalUtilityService.extractDisplayName(values)).toBe(
          'Test Company'
        );
      });

      it('should return "Unnamed" when all fields are null/undefined', () => {
        const values = {
          name: null,
          full_name: undefined,
          title: null,
          content: undefined,
        } as any;

        expect(UniversalUtilityService.extractDisplayName(values)).toBe(
          'Unnamed'
        );
      });

      it('should return "Unnamed" when field values are empty strings', () => {
        const values = {
          name: [{ value: '' }],
          full_name: [{ value: '   ' }],
          title: [{ value: null }],
          content: [{ value: undefined }],
        } as any;

        expect(UniversalUtilityService.extractDisplayName(values)).toBe(
          'Unnamed'
        );
      });

      it('should handle mixed data types gracefully', () => {
        const values = {
          name: 'not an array',
          full_name: [{ value: 123 }],
          title: [{ notValue: 'wrong property' }],
          content: [{ value: 'Valid Content' }],
        } as any;

        expect(UniversalUtilityService.extractDisplayName(values)).toBe(
          'Valid Content'
        );
      });
    });

    describe('Real-world Data Patterns', () => {
      it('should handle task records correctly (Issue #472 regression test)', () => {
        const taskValues = {
          content: [{ value: 'Schedule team standup meeting for next week' }],
          status: [{ value: 'pending' }],
          assignee: [{ value: 'user-123' }],
        } as any;

        expect(UniversalUtilityService.extractDisplayName(taskValues)).toBe(
          'Schedule team standup meeting for next week'
        );
      });

      it('should handle company records correctly', () => {
        const companyValues = {
          name: [{ value: 'Acme Corporation' }],
          website: [{ value: 'https://acme.com' }],
          industry: [{ value: 'Technology' }],
        } as any;

        expect(UniversalUtilityService.extractDisplayName(companyValues)).toBe(
          'Acme Corporation'
        );
      });

      it('should handle person records with full_name correctly', () => {
        const personValues = {
          name: [{ full_name: 'John Smith' }],
          email: [{ value: 'john@example.com' }],
          phone: [{ value: '+1234567890' }],
        } as any;

        expect(UniversalUtilityService.extractDisplayName(personValues)).toBe(
          'John Smith'
        );
      });

      it('should handle records with only title (like documents)', () => {
        const documentValues = {
          title: [{ value: 'Q4 Budget Report' }],
          created_at: [{ value: '2025-08-17' }],
        } as any;

        expect(UniversalUtilityService.extractDisplayName(documentValues)).toBe(
          'Q4 Budget Report'
        );
      });

      it('should trim whitespace from extracted values', () => {
        const values = { name: [{ value: '  Test Company  ' }] } as any;

        expect(UniversalUtilityService.extractDisplayName(values)).toBe(
          'Test Company'
        );
      });
    });

    describe('Backward Compatibility', () => {
      it('should work with Record<string, unknown> type (legacy usage)', () => {
        const legacyValues: Record<string, unknown> = {
          name: [{ value: 'Legacy Company' }],
          someOtherField: 'other data',
        } as any;

        expect(UniversalUtilityService.extractDisplayName(legacyValues)).toBe(
          'Legacy Company'
        );
      });

      it('should handle arrays with multiple items (uses first item only)', () => {
        const values = {
          name: [
            { value: 'First Name' },
            { value: 'Second Name' },
            { value: 'Third Name' },
          ],
        } as any;

        expect(UniversalUtilityService.extractDisplayName(values)).toBe(
          'First Name'
        );
      });
    });
  });
});
