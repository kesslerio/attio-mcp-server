/**
 * Tests for enhanced validation warning UX in update operations
 * Related to issue #728: Enhanced validation warnings UX for deal field mapping
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the updateRecordConfig
import { updateRecordConfig } from '../../../../src/handlers/tool-configs/universal/core/index.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import { EnhancedAttioRecord } from '../../../../src/types/attio.js';

// Mock the shared handlers
vi.mock(
  '../../../../src/handlers/tool-configs/universal/shared-handlers.js',
  () => ({
    getSingularResourceType: vi.fn((type: UniversalResourceType) => {
      const mapping = {
        [UniversalResourceType.COMPANIES]: 'company',
        [UniversalResourceType.PEOPLE]: 'person',
        [UniversalResourceType.DEALS]: 'deal',
        [UniversalResourceType.TASKS]: 'task',
        [UniversalResourceType.LISTS]: 'list',
        [UniversalResourceType.RECORDS]: 'record',
      };
      return mapping[type] || 'record';
    }),
  })
);

describe('Validation Warning UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatResult with validation warnings', () => {
    it('should display warning indicator and warnings list when validation fails', () => {
      const mockRecord: EnhancedAttioRecord = {
        id: { record_id: 'deal_123' },
        values: {
          name: [{ value: 'Test Deal' }],
          stage: [{ value: 'qualified' }],
        },
        validationMetadata: {
          warnings: [
            'Stage "invalid-stage" not found, using fallback: "qualified"',
            'Field persistence warning: Associated company could not be verified',
          ],
          suggestions: ['Use one of: qualified, negotiation, closed-won'],
          actualValues: {
            name: [{ value: 'Test Deal' }],
            stage: [{ value: 'qualified' }],
          },
        },
      };

      const result = updateRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.DEALS
      );

      expect(result).toContain('⚠️  Updated deal with warnings');
      expect(result).toContain('Test Deal');
      expect(result).toContain('deal_123');
      expect(result).toContain('Warnings:');
      expect(result).toContain('• Stage "invalid-stage" not found');
      expect(result).toContain('• Field persistence warning');
      expect(result).toContain('Suggestions:');
      expect(result).toContain(
        '• Use one of: qualified, negotiation, closed-won'
      );
    });

    it('should display success indicator when no validation warnings', () => {
      const mockRecord: EnhancedAttioRecord = {
        id: { record_id: 'deal_456' },
        values: {
          name: [{ value: 'Clean Deal' }],
          stage: [{ value: 'qualified' }],
        },
        validationMetadata: {
          warnings: [],
          suggestions: [],
          actualValues: {},
        },
      };

      const result = updateRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.DEALS
      );

      expect(result).toContain('✅ Successfully updated deal');
      expect(result).toContain('Clean Deal');
      expect(result).not.toContain('⚠️');
      expect(result).not.toContain('Warnings:');
      expect(result).not.toContain('Suggestions:');
    });

    it('should display actual persisted values when there are warnings', () => {
      const mockRecord: EnhancedAttioRecord = {
        id: { record_id: 'deal_789' },
        values: {
          name: [{ value: 'Fallback Deal' }],
          stage: [{ value: 'default-stage' }],
        },
        validationMetadata: {
          warnings: ['Stage validation failed, using default'],
          suggestions: [],
          actualValues: {
            name: [{ value: 'Fallback Deal' }],
            stage: [{ value: 'default-stage' }],
            associated_company: [{ value: 'acme-corp' }],
          },
        },
      };

      const result = updateRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.DEALS
      );

      expect(result).toContain('Actual persisted values:');
      expect(result).toContain('• name: [REDACTED]');
      expect(result).toContain('• stage: default-stage');
      expect(result).toContain('• associated_company: acme-corp');
    });

    it('should not display actual values section when no warnings', () => {
      const mockRecord: EnhancedAttioRecord = {
        id: { record_id: 'deal_clean' },
        values: {
          name: [{ value: 'Perfect Deal' }],
        },
        validationMetadata: {
          warnings: [],
          suggestions: [],
          actualValues: {
            name: [{ value: 'Perfect Deal' }],
            stage: [{ value: 'qualified' }],
          },
        },
      };

      const result = updateRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.DEALS
      );

      expect(result).not.toContain('Actual persisted values:');
    });

    it('should handle complex value formatting in actual values', () => {
      const mockRecord: EnhancedAttioRecord = {
        id: { record_id: 'complex_deal' },
        values: {
          name: [{ value: 'Complex Deal' }],
        },
        validationMetadata: {
          warnings: ['Complex value formatting test'],
          suggestions: [],
          actualValues: {
            simple_string: 'test value',
            attio_array: [{ value: 'extracted value' }],
            full_name_array: [{ full_name: 'John Doe' }],
            complex_object: { nested: 'data', count: 42 },
            null_value: null,
            empty_array: [],
          },
        },
      };

      const result = updateRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.DEALS
      );

      expect(result).toContain('• simple_string: test value');
      expect(result).toContain('• attio_array: extracted value');
      expect(result).toContain('• full_name_array: [REDACTED]');
      expect(result).toContain(
        '• complex_object: {"nested":"data","count":42}'
      );
      expect(result).toContain('• null_value: null');
    });

    it('should filter out duplicate suggestions that are already in warnings', () => {
      const mockRecord: EnhancedAttioRecord = {
        id: { record_id: 'dup_deal' },
        values: {
          name: [{ value: 'Duplicate Test' }],
        },
        validationMetadata: {
          warnings: ['Stage validation failed'],
          suggestions: [
            'Stage validation failed', // Duplicate of warning
            'Try using "qualified" stage instead', // Unique suggestion
          ],
          actualValues: {},
        },
      };

      const result = updateRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.DEALS
      );

      expect(result).toContain('Suggestions:');
      expect(result).toContain('• Try using "qualified" stage instead');
      // Should not duplicate the warning as a suggestion
      const suggestionSection = result.split('Suggestions:')[1];
      expect(suggestionSection).not.toContain('Stage validation failed');
    });

    it('should handle missing validation metadata gracefully', () => {
      const mockRecord: EnhancedAttioRecord = {
        id: { record_id: 'no_meta' },
        values: {
          name: [{ value: 'No Metadata Deal' }],
        },
        // No validationMetadata property
      };

      const result = updateRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.DEALS
      );

      expect(result).toContain('✅ Successfully updated deal');
      expect(result).toContain('No Metadata Deal');
      expect(result).not.toContain('⚠️');
      expect(result).not.toContain('Warnings:');
    });
  });
});
