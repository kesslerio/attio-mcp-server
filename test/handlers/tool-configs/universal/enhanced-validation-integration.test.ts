/**
 * Integration Tests: Enhanced Validation Integration
 *
 * Tests real validation warnings flow through UniversalUpdateService
 * and verifies deal-specific validation paths work end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateRecordConfig } from '../../../../src/handlers/tool-configs/universal/core/crud-operations.js';
import type { ValidationMetadata } from '../../../../src/handlers/tool-configs/universal/core/utils.js';

// Mock dependencies
vi.mock('../../../../src/services/UniversalUpdateService.js', () => ({
  UniversalUpdateService: {
    updateRecordWithValidation: vi.fn(),
  },
}));

vi.mock(
  '../../../../src/handlers/tool-configs/universal/shared-handlers.js',
  () => ({
    handleUniversalUpdate: vi.fn(),
    getSingularResourceType: vi.fn((type) => {
      const mapping: Record<string, string> = {
        companies: 'company',
        people: 'person',
        deals: 'deal',
        tasks: 'task',
        notes: 'note',
        lists: 'list',
        records: 'record',
      };
      return mapping[type] ?? type;
    }),
  })
);

vi.mock(
  '../../../../src/handlers/tool-configs/universal/schemas.js',
  async () => {
    const actual = await vi.importActual<
      typeof import('../../../../src/handlers/tool-configs/universal/schemas.js')
    >('../../../../src/handlers/tool-configs/universal/schemas.js');

    return {
      ...actual,
      validateUniversalToolParams: vi.fn((toolName, params) => params),
      CrossResourceValidator: {
        validateRecordRelationships: vi.fn(),
      },
    };
  }
);

vi.mock('../../../../src/utils/logger.js', () => ({
  createScopedLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('Enhanced Validation Integration', () => {
  let mockUniversalUpdateService: any;
  let mockSharedHandlers: any;
  let mockCrudErrorHandlers: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUniversalUpdateService = await vi.importMock(
      '../../../../src/services/UniversalUpdateService.js'
    );
    mockSharedHandlers = await vi.importMock(
      '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
    );
    mockCrudErrorHandlers = await vi.importMock(
      '../../../../src/handlers/tool-configs/universal/core/error-utils.js'
    );
  });

  describe('Deal-Specific Validation Flow', () => {
    it('should use enhanced validation service for deals', async () => {
      const dealData = {
        name: 'Test Deal',
        amount: 50000,
        deal_stage: 'qualification',
        close_date: '2024-12-31',
      };

      const validationMetadata: ValidationMetadata = {
        warnings: [
          'Field "deal_stage" mapped to "stage" - consider using the official field name',
          'Amount field should include currency specification',
        ],
        suggestions: [
          'Use "stage" instead of "deal_stage"',
          'Add currency field for clarity',
        ],
        actualValues: {
          stage: 'qualification',
          amount: 50000,
        },
      };

      const enhancedServiceResult = {
        record: {
          id: { record_id: 'deal-123' },
          values: {
            name: [{ value: 'Test Deal' }],
            amount: [{ value: 50000 }],
            stage: [{ value: 'qualification' }],
          },
        },
        validation: {
          warnings: validationMetadata.warnings ?? [],
          suggestions: validationMetadata.suggestions ?? [],
          actualValues: validationMetadata.actualValues ?? {},
        },
      };

      const expectedResult = {
        ...enhancedServiceResult.record,
        validationMetadata,
      };

      // Mock enhanced validation service
      mockUniversalUpdateService.UniversalUpdateService.updateRecordWithValidation.mockResolvedValue(
        enhancedServiceResult
      );

      const updateParams = {
        resource_type: 'deals',
        record_id: 'deal-123',
        record_data: dealData,
      };

      const result = await updateRecordConfig.handler(updateParams);

      expect(result).toEqual(expectedResult);
      expect(
        mockUniversalUpdateService.UniversalUpdateService
          .updateRecordWithValidation
      ).toHaveBeenCalledWith(updateParams);

      // Verify standard handler was NOT called for deals
      expect(mockSharedHandlers.handleUniversalUpdate).not.toHaveBeenCalled();
    });

    it('should format deal validation results with enhanced metadata', () => {
      const dealResult = {
        id: { record_id: 'deal-456' },
        values: {
          name: [{ value: 'Big Deal' }],
          amount: [{ value: 100000 }],
        },
        validationMetadata: {
          warnings: [
            'Deal stage field mapping detected',
            'Missing required currency field',
          ],
          suggestions: [
            'Use standard "stage" field name',
            'Add "currency" field with ISO code',
          ],
          actualValues: {
            stage: 'negotiation',
            amount: 100000,
          },
        },
      };

      const formatted = updateRecordConfig.formatResult(dealResult, 'deals');

      expect(formatted).toContain(
        '⚠️  Updated deal with warnings: Big Deal (ID: deal-456)'
      );
      expect(formatted).toContain('Warnings:');
      expect(formatted).toContain('• Deal stage field mapping detected');
      expect(formatted).toContain('• Missing required currency field');
      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('• Use standard "stage" field name');
      expect(formatted).toContain('• Add "currency" field with ISO code');
      expect(formatted).toContain('Actual persisted values:');
      expect(formatted).toContain('• stage: negotiation');
      expect(formatted).toContain('• amount: 100000');
    });

    it('should handle deal validation service errors gracefully', async () => {
      const dealData = { name: 'Test Deal' };
      const serviceError = new Error('Enhanced validation service error');

      mockUniversalUpdateService.UniversalUpdateService.updateRecordWithValidation.mockRejectedValue(
        serviceError
      );

      // Mock fallback to standard handler
      const fallbackResult = {
        id: { record_id: 'deal-789' },
        values: { name: [{ value: 'Test Deal' }] },
      };
      mockSharedHandlers.handleUniversalUpdate.mockResolvedValue(
        fallbackResult
      );

      const updateParams = {
        resource_type: 'deals',
        record_id: 'deal-789',
        record_data: dealData,
      };

      const result = await updateRecordConfig.handler(updateParams);

      expect(result).toEqual(fallbackResult);
      expect(mockSharedHandlers.handleUniversalUpdate).toHaveBeenCalledWith(
        updateParams
      );
    });
  });

  describe('Non-Deal Resource Standard Validation', () => {
    const nonDealResources = ['companies', 'people', 'tasks', 'notes'];

    it.each(nonDealResources)(
      'should use standard validation for %s',
      async (resourceType) => {
        const recordData = { name: `Test ${resourceType}` };
        const standardResult = {
          id: { record_id: `${resourceType}-123` },
          values: { name: [{ value: `Test ${resourceType}` }] },
        };

        mockSharedHandlers.handleUniversalUpdate.mockResolvedValue(
          standardResult
        );

        const updateParams = {
          resource_type: resourceType,
          record_id: `${resourceType}-123`,
          record_data: recordData,
        };

        const result = await updateRecordConfig.handler(updateParams);

        expect(result).toEqual(standardResult);
        expect(mockSharedHandlers.handleUniversalUpdate).toHaveBeenCalledWith(
          updateParams
        );

        // Verify enhanced validation service was NOT called
        expect(
          mockUniversalUpdateService.UniversalUpdateService
            .updateRecordWithValidation
        ).not.toHaveBeenCalled();
      }
    );
  });

  describe('Validation Metadata Processing', () => {
    it('should handle complex validation metadata scenarios', async () => {
      const complexValidationMetadata: ValidationMetadata = {
        warnings: [
          'Multiple field mapping issues detected',
          'Data type conversion applied automatically',
          'Some fields were normalized during processing',
        ],
        suggestions: [
          'Review field mappings in your integration',
          'Consider using explicit type conversions',
          'Check data format consistency',
          'Validate input before submission',
        ],
        actualValues: {
          normalized_email: 'test@example.com',
          converted_amount: 1000.0,
          mapped_stage: 'qualification',
          processed_date: '2024-01-15T10:00:00Z',
        },
      };

      const complexRecord = {
        id: { record_id: 'complex-123' },
        values: {
          name: [{ value: 'Complex Record' }],
          email: [{ value: 'test@example.com' }],
        },
      };

      mockUniversalUpdateService.UniversalUpdateService.updateRecordWithValidation.mockResolvedValue(
        {
          record: complexRecord,
          validation: complexValidationMetadata,
        }
      );

      const updateParams = {
        resource_type: 'deals',
        record_id: 'complex-123',
        record_data: { name: 'Complex Record', email: 'test@example.com' },
      };

      const result = await updateRecordConfig.handler(updateParams);
      const formatted = updateRecordConfig.formatResult(result, 'deals');

      // Verify all warnings are displayed
      expect(formatted).toContain('Multiple field mapping issues detected');
      expect(formatted).toContain('Data type conversion applied automatically');
      expect(formatted).toContain(
        'Some fields were normalized during processing'
      );

      // Verify suggestions are displayed and deduplicated
      expect(formatted).toContain('Review field mappings in your integration');
      expect(formatted).toContain('Consider using explicit type conversions');
      expect(formatted).toContain('Check data format consistency');

      // Verify actual values are displayed with proper formatting
      expect(formatted).toMatch(
        /normalized_email: (?:\[REDACTED\]|test@example\.com)/
      );
      expect(formatted).toContain('converted_amount: 1000');
      expect(formatted).toContain('mapped_stage: qualification');
      expect(formatted).toContain('processed_date: 2024-01-15T10:00:00Z');
    });

    it('should handle validation metadata with overlapping warnings and suggestions', () => {
      const overlappingMetadata: ValidationMetadata = {
        warnings: [
          'Use standard field names',
          'Data format issue detected',
          'Review field mappings',
        ],
        suggestions: [
          'Use standard field names', // Duplicate of warning
          'Validate data format before submission',
          'Review field mappings', // Duplicate of warning
          'Consider data normalization',
        ],
        actualValues: {
          field1: 'value1',
          field2: 'value2',
        },
      };

      const recordWithOverlap = {
        id: { record_id: 'overlap-123' },
        values: { name: [{ value: 'Overlap Test' }] },
        validationMetadata: overlappingMetadata,
      };

      const formatted = updateRecordConfig.formatResult(
        recordWithOverlap,
        'deals'
      );

      // Count occurrences of duplicated items
      const standardFieldNameCount = (
        formatted.match(/Use standard field names/g) || []
      ).length;
      const reviewMappingsCount = (
        formatted.match(/Review field mappings/g) || []
      ).length;

      // Should appear in warnings but be deduplicated from suggestions
      expect(standardFieldNameCount).toBe(1);
      expect(reviewMappingsCount).toBe(1);

      // Non-duplicate suggestions should appear
      expect(formatted).toContain('Validate data format before submission');
      expect(formatted).toContain('Consider data normalization');
    });

    it('should handle empty and null validation metadata gracefully', async () => {
      const testCases = [
        { validationMetadata: undefined },
        { validationMetadata: {} },
        {
          validationMetadata: {
            warnings: [],
            suggestions: [],
            actualValues: {},
          },
        },
        {
          validationMetadata: {
            warnings: null,
            suggestions: null,
            actualValues: null,
          } as unknown as ValidationMetadata,
        },
      ];

      for (const testCase of testCases) {
        const result = {
          id: { record_id: 'empty-123' },
          values: { name: [{ value: 'Empty Test' }] },
          ...testCase,
        };

        const formatted = updateRecordConfig.formatResult(result, 'deals');

        expect(formatted).toContain('Successfully updated deal: Empty Test');
        expect(formatted).toContain('ID: empty-123');
        expect(formatted).not.toContain('Warnings:');
        expect(formatted).not.toContain('Suggestions:');
        expect(formatted).not.toContain('Actual persisted values:');
      }
    });
  });

  describe('Error Propagation Through Validation', () => {
    it('should fallback to standard handler when enhanced validation fails', async () => {
      const validationError = new Error('Field validation failed');
      mockUniversalUpdateService.UniversalUpdateService.updateRecordWithValidation.mockRejectedValue(
        validationError
      );

      const fallbackResult = {
        id: { record_id: 'error-123' },
        values: { name: [{ value: 'Error Test' }] },
      };

      mockSharedHandlers.handleUniversalUpdate.mockResolvedValue(
        fallbackResult
      );

      const updateParams = {
        resource_type: 'deals',
        record_id: 'error-123',
        record_data: { name: 'Error Test' },
      };

      const result = await updateRecordConfig.handler(updateParams);

      expect(result).toEqual(fallbackResult);
      expect(
        mockUniversalUpdateService.UniversalUpdateService
          .updateRecordWithValidation
      ).toHaveBeenCalledWith(updateParams);
      expect(mockSharedHandlers.handleUniversalUpdate).toHaveBeenCalledWith(
        updateParams
      );
    });
  });
});
