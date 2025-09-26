/**
 * Integration tests for shared validators with tool configurations
 * Tests the interaction between Phase 1, 2, and 3 improvements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  withUniversalErrorHandling,
  withSanitizedParams,
  createValidatedHandler,
  validateUUIDWithError,
  validateListId,
  validatePaginationParams,
} from '@handlers/tool-configs/universal/shared-validators.js';
import type { UniversalToolConfig } from '@handlers/tool-configs/universal/types.js';

// Mock dependencies for integration testing
vi.mock('@utils/validation/uuid-validation.js', () => ({
  isValidUUID: vi.fn(),
}));

vi.mock('@services/ValidationService.js', () => ({
  ValidationService: {
    validateUUIDForSearch: vi.fn(),
    validatePaginationParameters: vi.fn(),
  },
}));

vi.mock('@services/ErrorService.js', () => ({
  ErrorService: {
    createUniversalError: vi.fn(),
  },
}));

vi.mock('@handlers/tool-configs/universal/schemas.js', () => ({
  validateUniversalToolParams: vi.fn(),
}));

import { isValidUUID } from '@utils/validation/uuid-validation.js';
import { ValidationService } from '@services/ValidationService.js';
import { ErrorService } from '@services/ErrorService.js';
import { validateUniversalToolParams } from '@handlers/tool-configs/universal/schemas.js';

interface TestParams {
  id: string;
  query?: string;
  limit?: number;
  offset?: number;
}

interface TestResult {
  data: string[];
  metadata: {
    total: number;
    processed: string;
  };
}

describe('Universal Validators Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Tool Configuration Pipeline', () => {
    it('should integrate all validation layers successfully', async () => {
      // Mock successful validations
      vi.mocked(validateUniversalToolParams).mockReturnValue({
        id: 'valid-uuid-123',
        query: 'test query',
        limit: 10,
        offset: 0,
      });
      vi.mocked(isValidUUID).mockReturnValue(true);
      vi.mocked(ValidationService.validatePaginationParameters).mockReturnValue(
        undefined
      );

      // Create a complete tool configuration using shared validators
      const testConfig: UniversalToolConfig<TestParams, TestResult> = {
        name: 'integration-test-tool',
        handler: createValidatedHandler(
          {
            toolName: 'integration-test-tool',
            operation: 'test-operation',
            resourceType: 'test-resource',
            requiresUUID: {
              field: 'id',
              value: 'valid-uuid-123',
            },
            pagination: true,
          },
          async (sanitizedParams: TestParams): Promise<TestResult> => {
            return {
              data: [
                `processed-${sanitizedParams.query}`,
                `id-${sanitizedParams.id}`,
              ],
              metadata: {
                total: sanitizedParams.limit || 10,
                processed: new Date().toISOString(),
              },
            };
          }
        ),
        formatResult: (results: TestResult, ...args: unknown[]): string => {
          const showMetadata = args[0] as boolean | undefined;
          let output = `Found ${results.data.length} items:\n`;
          output += results.data.map((item) => `- ${item}`).join('\n');

          if (showMetadata) {
            output += `\nTotal: ${results.metadata.total}`;
          }

          return output;
        },
      };

      // Test the complete pipeline
      const params: TestParams = {
        id: 'valid-uuid-123',
        query: 'test query',
        limit: 10,
        offset: 0,
      };

      const result = await testConfig.handler(params);
      const formatted = testConfig.formatResult(result, true);

      // Verify all validation layers were called
      expect(validateUniversalToolParams).toHaveBeenCalledWith(
        'integration-test-tool',
        params
      );
      expect(isValidUUID).toHaveBeenCalledWith('valid-uuid-123');
      expect(ValidationService.validatePaginationParameters).toHaveBeenCalled();

      // Verify the result
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toBe('processed-test query');
      expect(result.data[1]).toBe('id-valid-uuid-123');
      expect(formatted).toContain('Found 2 items:');
      expect(formatted).toContain('Total: 10');
    });

    it('should handle validation errors in the pipeline', async () => {
      // Mock UUID validation failure
      vi.mocked(validateUniversalToolParams).mockReturnValue({
        id: 'invalid-uuid',
        query: 'test',
      });
      vi.mocked(isValidUUID).mockReturnValue(false);

      const errorMessage = 'Invalid id: must be a UUID. Got: invalid-uuid';
      const wrappedError = new Error('Wrapped validation error');
      vi.mocked(ErrorService.createUniversalError).mockReturnValue(
        wrappedError
      );

      const failingConfig: UniversalToolConfig<TestParams, TestResult> = {
        name: 'failing-test-tool',
        handler: createValidatedHandler(
          {
            toolName: 'failing-test-tool',
            operation: 'test-operation',
            resourceType: 'test-resource',
            requiresUUID: {
              field: 'id',
              value: 'invalid-uuid',
            },
          },
          async (): Promise<TestResult> => {
            // This should never be reached due to validation failure
            throw new Error('Handler should not be called');
          }
        ),
        formatResult: (results: TestResult): string => {
          return 'Should not reach this';
        },
      };

      const params: TestParams = { id: 'invalid-uuid', query: 'test' };

      await expect(failingConfig.handler(params)).rejects.toThrow(
        'Wrapped validation error'
      );

      // Verify error handling was triggered
      expect(ErrorService.createUniversalError).toHaveBeenCalledWith(
        'test-operation',
        'test-resource',
        expect.any(Error)
      );
    });
  });

  describe('Shared Validator Integration Scenarios', () => {
    it('should integrate withUniversalErrorHandling and validateUUIDWithError', async () => {
      // Create a handler that uses UUID validation
      const validatedHandler = withUniversalErrorHandling(
        'uuid-test',
        'test-resource',
        async (id: string): Promise<string> => {
          const validation = validateUUIDWithError(id, 'record_id');
          if (!validation.isValid) {
            throw new Error(validation.error);
          }
          return `Valid ID: ${id}`;
        }
      );

      // Test with valid UUID
      vi.mocked(isValidUUID).mockReturnValue(true);
      const validResult = await validatedHandler('valid-uuid-123');
      expect(validResult).toBe('Valid ID: valid-uuid-123');

      // Test with invalid UUID
      vi.mocked(isValidUUID).mockReturnValue(false);
      const wrappedError = new Error('Universal error wrapper');
      vi.mocked(ErrorService.createUniversalError).mockReturnValue(
        wrappedError
      );

      await expect(validatedHandler('invalid-uuid')).rejects.toThrow(
        'Universal error wrapper'
      );

      expect(ErrorService.createUniversalError).toHaveBeenCalledWith(
        'uuid-test',
        'test-resource',
        expect.any(Error)
      );
    });

    it('should integrate withSanitizedParams with pagination validation', async () => {
      vi.mocked(validateUniversalToolParams).mockReturnValue({
        query: 'test',
        limit: 20,
        offset: 10,
      });

      const paginatedHandler = withSanitizedParams(
        'pagination-test',
        'paginated-operation',
        'paginated-resource',
        async (params: {
          query: string;
          limit: number;
          offset: number;
        }): Promise<string[]> => {
          // Validate pagination
          validatePaginationParams(params);

          // Return mock data
          return Array.from(
            { length: params.limit },
            (_, i) => `item-${i + params.offset}`
          );
        }
      );

      const result = await paginatedHandler({
        query: 'test',
        limit: 20,
        offset: 10,
      });

      expect(
        ValidationService.validatePaginationParameters
      ).toHaveBeenCalledWith(
        { query: 'test', limit: 20, offset: 10 },
        undefined
      );
      expect(result).toHaveLength(20);
      expect(result[0]).toBe('item-10');
      expect(result[19]).toBe('item-29');
    });

    it('should handle list validation with error handling', async () => {
      const listHandler = withUniversalErrorHandling(
        'list-operation',
        'list-resource',
        async (listId: string): Promise<string> => {
          // This will throw if validation fails
          validateListId(listId, 'list operation');
          return `Processing list: ${listId}`;
        }
      );

      // Test with valid list ID
      vi.mocked(isValidUUID).mockReturnValue(true);
      const validResult = await listHandler('valid-list-uuid');
      expect(validResult).toBe('Processing list: valid-list-uuid');

      // Test with invalid list ID
      vi.mocked(isValidUUID).mockReturnValue(false);
      const wrappedError = new Error('List validation error');
      vi.mocked(ErrorService.createUniversalError).mockReturnValue(
        wrappedError
      );

      await expect(listHandler('invalid-list-id')).rejects.toThrow(
        'List validation error'
      );
    });
  });

  describe('Real-World Integration Scenarios', () => {
    it('should simulate a search tool with all validation layers', async () => {
      // Mock successful validation chain
      vi.mocked(validateUniversalToolParams).mockReturnValue({
        resource_type: 'companies',
        query: 'tech startup',
        limit: 50,
        offset: 0,
      });

      // Create a realistic search tool configuration
      const searchConfig: UniversalToolConfig<
        { resource_type: string; query: string; limit: number; offset: number },
        { records: Array<{ id: string; name: string }>; total: number }
      > = {
        name: 'universal-search',
        handler: createValidatedHandler(
          {
            toolName: 'universal-search',
            operation: 'search',
            resourceType: 'companies',
            pagination: true,
          },
          async (params) => {
            // Simulate search operation
            const mockRecords = Array.from(
              { length: Math.min(params.limit, 25) },
              (_, i) => ({
                id: `company-${i + params.offset}`,
                name: `${params.query} Company ${i + 1}`,
              })
            );

            return {
              records: mockRecords,
              total: 125, // Simulated total
            };
          }
        ),
        formatResult: (results, ...args): string => {
          const resourceType = args[0] as string | undefined;
          if (results.records.length === 0) {
            return `No ${resourceType || 'records'} found`;
          }

          return `Found ${results.records.length} ${resourceType || 'records'} (${results.total} total):\n${results.records
            .slice(0, 3)
            .map((r) => `- ${r.name} (${r.id})`)
            .join('\n')}${results.records.length > 3 ? '\n...' : ''}`;
        },
      };

      const searchParams = {
        resource_type: 'companies',
        query: 'tech startup',
        limit: 50,
        offset: 0,
      };

      const result = await searchConfig.handler(searchParams);
      const formatted = searchConfig.formatResult(result, 'companies');

      // Verify the integration worked correctly
      expect(validateUniversalToolParams).toHaveBeenCalledWith(
        'universal-search',
        searchParams
      );
      expect(ValidationService.validatePaginationParameters).toHaveBeenCalled();

      expect(result.records).toHaveLength(25); // Limited by mock
      expect(result.total).toBe(125);
      expect(formatted).toContain('Found 25 companies (125 total):');
      expect(formatted).toContain('tech startup Company 1');
    });

    it('should simulate a relationship tool with UUID validation', async () => {
      const relationshipId = 'person-company-123';
      vi.mocked(validateUniversalToolParams).mockReturnValue({
        source_id: relationshipId,
        relationship_type: 'company_to_people',
      });
      vi.mocked(isValidUUID).mockReturnValue(true);

      const relationshipConfig: UniversalToolConfig<
        { source_id: string; relationship_type: string },
        Array<{ id: string; name: string; role?: string }>
      > = {
        name: 'relationship-search',
        handler: createValidatedHandler(
          {
            toolName: 'relationship-search',
            operation: 'relationship-search',
            resourceType: 'people',
            requiresUUID: {
              field: 'source_id',
              value: relationshipId,
            },
          },
          async (params) => {
            // Simulate relationship search
            return [
              { id: 'person-1', name: 'John Doe', role: 'CEO' },
              { id: 'person-2', name: 'Jane Smith', role: 'CTO' },
            ];
          }
        ),
        formatResult: (results): string => {
          return `Found ${results.length} related people:\n${results
            .map((p) => `- ${p.name}${p.role ? ` (${p.role})` : ''} [${p.id}]`)
            .join('\n')}`;
        },
      };

      const params = {
        source_id: relationshipId,
        relationship_type: 'company_to_people',
      };

      const result = await relationshipConfig.handler(params);
      const formatted = relationshipConfig.formatResult(result);

      // Verify the complete validation chain
      expect(validateUniversalToolParams).toHaveBeenCalledWith(
        'relationship-search',
        params
      );
      expect(isValidUUID).toHaveBeenCalledWith(relationshipId);

      expect(result).toHaveLength(2);
      expect(formatted).toContain('Found 2 related people:');
      expect(formatted).toContain('John Doe (CEO)');
      expect(formatted).toContain('Jane Smith (CTO)');
    });
  });

  describe('Error Propagation and Recovery', () => {
    it('should properly propagate errors through validation layers', async () => {
      // Test chain: params validation → UUID validation → business logic → error handling
      vi.mocked(validateUniversalToolParams).mockReturnValue({
        id: 'test-uuid',
        action: 'process',
      });
      vi.mocked(isValidUUID).mockReturnValue(true);

      const businessError = new Error('Business logic failure');
      const wrappedError = new Error('Wrapped business error');
      vi.mocked(ErrorService.createUniversalError).mockReturnValue(
        wrappedError
      );

      const errorPropagationConfig: UniversalToolConfig<
        { id: string; action: string },
        string
      > = {
        name: 'error-propagation-test',
        handler: createValidatedHandler(
          {
            toolName: 'error-propagation-test',
            operation: 'process',
            resourceType: 'test-resource',
            requiresUUID: {
              field: 'id',
              value: 'test-uuid',
            },
          },
          async (): Promise<string> => {
            // Simulate business logic failure
            throw businessError;
          }
        ),
        formatResult: (): string => 'Should not reach this',
      };

      await expect(
        errorPropagationConfig.handler({ id: 'test-uuid', action: 'process' })
      ).rejects.toThrow('Wrapped business error');

      // Verify error was properly wrapped
      expect(ErrorService.createUniversalError).toHaveBeenCalledWith(
        'process',
        'test-resource',
        businessError
      );
    });

    it('should maintain type safety throughout error scenarios', async () => {
      // This test verifies that TypeScript types are preserved even in error scenarios
      interface StrictParams {
        requiredField: string;
        optionalField?: number;
      }

      interface StrictResult {
        processedField: string;
        computedValue: number;
      }

      vi.mocked(validateUniversalToolParams).mockReturnValue({
        requiredField: 'test',
        optionalField: 42,
      });

      const typeSafeConfig: UniversalToolConfig<StrictParams, StrictResult> = {
        name: 'type-safe-test',
        handler: createValidatedHandler(
          {
            toolName: 'type-safe-test',
            operation: 'type-safe-operation',
            resourceType: 'strict-resource',
          },
          async (params: StrictParams): Promise<StrictResult> => {
            // TypeScript should enforce these types even in error scenarios
            expect(typeof params.requiredField).toBe('string');
            expect(typeof params.optionalField).toBe('number');

            return {
              processedField: params.requiredField.toUpperCase(),
              computedValue: (params.optionalField || 0) * 2,
            };
          }
        ),
        formatResult: (results: StrictResult): string => {
          // TypeScript should enforce the result type
          expect(typeof results.processedField).toBe('string');
          expect(typeof results.computedValue).toBe('number');

          return `Processed: ${results.processedField}, Computed: ${results.computedValue}`;
        },
      };

      const result = await typeSafeConfig.handler({
        requiredField: 'test',
        optionalField: 42,
      });

      expect(result.processedField).toBe('TEST');
      expect(result.computedValue).toBe(84);

      const formatted = typeSafeConfig.formatResult(result);
      expect(formatted).toBe('Processed: TEST, Computed: 84');
    });
  });
});
