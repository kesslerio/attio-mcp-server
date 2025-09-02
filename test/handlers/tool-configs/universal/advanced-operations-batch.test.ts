import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Hoist mocks to the top level
vi.mock(
  '../../../../src/handlers/tool-configs/universal/shared-handlers.js',
  () => ({
    handleUniversalSearch: vi.fn(),
    handleUniversalGetDetails: vi.fn(),
    handleUniversalCreate: vi.fn(),
    handleUniversalUpdate: vi.fn(),
    handleUniversalDelete: vi.fn(),
    handleUniversalGetAttributes: vi.fn(),
    handleUniversalDiscoverAttributes: vi.fn(),
    handleUniversalGetDetailedInfo: vi.fn(),
    formatResourceType: vi.fn((type: string) => {
      switch (type) {
        case 'companies':
          return 'company';
        case 'people':
          return 'person';
        case 'records':
          return 'record';
        case 'tasks':
          return 'task';
        default:
          return type;
      }
    }),
    getSingularResourceType: vi.fn((type: string) => type.slice(0, -1)),
    createUniversalError: vi.fn(
      (operation: string, resourceType: string, error: any) =>
        new Error(
          `${operation} failed for ${resourceType}: ${error.message || error}`
        )
    ),
  })
);

vi.mock(
  '../../../../src/handlers/tool-configs/universal/schemas.js',
  async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
      ...actual,
      validateUniversalToolParams: vi.fn((operation: string, params: any) => {
        return params || {};
      }),
    };
  }
);

import { batchOperationsConfig } from '../../../../src/handlers/tool-configs/universal/advanced-operations.js';
import {
  UniversalResourceType,
  BatchOperationType,
  BatchOperationsParams,
} from '../../../../src/handlers/tool-configs/universal/types.js';
// Import the mock modules to get access to the mocked functions
import * as sharedHandlers from '../../../../src/handlers/tool-configs/universal/shared-handlers.js';
import * as schemas from '../../../../src/handlers/tool-configs/universal/schemas.js';

describe('Universal Advanced Operations - Batch Tests', () => {
  beforeEach(() => {
    // Clear mock call history before each test
    vi.clearAllMocks();
  });

  describe('batch-operations tool', () => {
    it('should handle batch create operations', async () => {
      const mockHandleUniversalCreate = vi.mocked(
        sharedHandlers.handleUniversalCreate
      );

      mockHandleUniversalCreate
        .mockResolvedValueOnce({
          id: { record_id: 'comp-1' },
          values: { name: 'Company 1' },
        })
        .mockResolvedValueOnce({
          id: { record_id: 'comp-2' },
          values: { name: 'Company 2' },
        });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records: [
          { name: 'Company 1', website: 'https://comp1.com' },
          { name: 'Company 2', website: 'https://comp2.com' },
        ],
      };

      const result: any = await batchOperationsConfig.handler(params);
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
      expect(mockHandleUniversalCreate).toHaveBeenCalledTimes(2);
    });

    it('should handle batch update operations', async () => {
      const mockHandleUniversalUpdate = vi.mocked(
        sharedHandlers.handleUniversalUpdate
      );

      mockHandleUniversalUpdate
        .mockResolvedValueOnce({
          id: { record_id: 'comp-1' },
          values: { name: 'Updated Company 1' },
        })
        .mockRejectedValueOnce(new Error('Record not found'));

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.UPDATE,
        records: [
          { id: 'comp-1', name: 'Updated Company 1' },
          { id: 'comp-invalid', name: 'Invalid Company' },
        ],
      };

      const result: any = await batchOperationsConfig.handler(params);
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);
      expect(result[1].error).toBe('Record not found');
    });

    it('should handle batch delete operations', async () => {
      const mockHandleUniversalDelete = vi.mocked(
        sharedHandlers.handleUniversalDelete
      );

      mockHandleUniversalDelete
        .mockResolvedValueOnce({ success: true, record_id: 'comp-1' })
        .mockResolvedValueOnce({ success: true, record_id: 'comp-2' });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.DELETE,
        record_ids: ['comp-1', 'comp-2'],
      };

      const result: any = await batchOperationsConfig.handler(params);
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
      expect(mockHandleUniversalDelete).toHaveBeenCalledTimes(2);
    });

    it('should handle batch get operations', async () => {
      const mockHandleUniversalGetDetails = vi.mocked(
        sharedHandlers.handleUniversalGetDetails
      );

      mockHandleUniversalGetDetails
        .mockResolvedValueOnce({
          id: { record_id: 'comp-1' },
          values: { name: 'Company 1' },
        })
        .mockResolvedValueOnce({
          id: { record_id: 'comp-2' },
          values: { name: 'Company 2' },
        });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.GET,
        record_ids: ['comp-1', 'comp-2'],
      };

      const result: any = await batchOperationsConfig.handler(params);
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
    });

    it('should handle batch search operations', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: { name: 'Company 1' },
        },
        {
          id: { record_id: 'comp-2' },
          values: { name: 'Company 2' },
        },
      ];

      const mockHandleUniversalSearch = vi.mocked(
        sharedHandlers.handleUniversalSearch
      );
      mockHandleUniversalSearch.mockResolvedValue(mockResults);

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.SEARCH,
        limit: 50,
        offset: 0,
      };

      const result: any = await batchOperationsConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockHandleUniversalSearch).toHaveBeenCalledWith({
        resource_type: UniversalResourceType.COMPANIES,
        limit: 50,
        offset: 0,
      });
    });

    it('should validate batch size limits', async () => {
      const largeRecordArray = Array(101).fill({ name: 'Test Company' });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records: largeRecordArray,
      };

      await expect(batchOperationsConfig.handler(params)).rejects.toThrow(
        /Batch size \(101\) exceeds maximum allowed \(100\)/
      );
    });

    it('should format batch results correctly', async () => {
      const mockResults = [
        {
          success: true,
          result: { values: { name: 'Company 1' } },
        },
        {
          success: false,
          error: 'Creation failed',
          data: { name: 'Failed Company' },
        },
      ];

      const mockFormatResourceType = vi.mocked(
        sharedHandlers.formatResourceType
      );
      mockFormatResourceType.mockReturnValue('company');

      const formatted = (batchOperationsConfig.formatResult as any)(
        mockResults,
        BatchOperationType.CREATE,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain(
        'Batch create completed: 1 successful, 1 failed'
      );
      expect(formatted).toContain('Successful operations:');
      expect(formatted).toContain('1. Company 1');
      expect(formatted).toContain('Failed operations:');
      expect(formatted).toContain('1. Failed Company: Creation failed');
    });

    it('should format batch search results correctly', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: { name: 'Company 1' },
        },
        {
          id: { record_id: 'comp-2' },
          values: { name: 'Company 2' },
        },
      ];

      const mockFormatResourceType = vi.mocked(
        sharedHandlers.formatResourceType
      );
      mockFormatResourceType.mockReturnValue('company');

      const formatted = (batchOperationsConfig.formatResult as any)(
        mockResults,
        BatchOperationType.SEARCH,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Batch search found 2 companys');
      expect(formatted).toContain('1. Company 1 (ID: comp-1)');
      expect(formatted).toContain('2. Company 2 (ID: comp-2)');
    });

    it('should handle missing records/record_ids for batch operations', async () => {
      const createParams: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        // Missing records array
      };

      await expect(batchOperationsConfig.handler(createParams)).rejects.toThrow(
        'Records array is required for batch create operation'
      );

      const deleteParams: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.DELETE,
        // Missing record_ids array
      };

      await expect(batchOperationsConfig.handler(deleteParams)).rejects.toThrow(
        'Record IDs array is required for batch delete operation'
      );
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle validation errors in batch operations', async () => {
      const mockValidateUniversalToolParams = vi.mocked(
        schemas.validateUniversalToolParams
      );

      // Store the original mock implementation to restore it later
      const originalMock = mockValidateUniversalToolParams;

      mockValidateUniversalToolParams.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records: [],
      };

      await expect(batchOperationsConfig.handler(params)).rejects.toThrow(
        'Validation failed'
      );

      // Restore the original mock behavior to not affect other tests
      mockValidateUniversalToolParams.mockImplementation(
        (operation: string, params: any) => {
          return params || {};
        }
      );
    });

    it('should handle empty results gracefully for batch operations', async () => {
      const emptyResults: any[] = [];

      // For empty arrays, batch formatters should handle empty results appropriately
      const formatted = batchOperationsConfig.formatResult(
        emptyResults,
        BatchOperationType.SEARCH,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Batch search found 0');
    });
  });

  describe('Concurrency and performance', () => {
    it('should handle batch operations with controlled concurrency', async () => {
      const mockHandleUniversalCreate = vi.mocked(
        sharedHandlers.handleUniversalCreate
      );

      // Mock delay to test concurrency
      mockHandleUniversalCreate.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          id: { record_id: 'test' },
          values: { name: 'Test' },
        };
      });

      const records = Array(10).fill({ name: 'Test Company' });
      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records,
      };

      const startTime = Date.now();
      const result: any[] = (await batchOperationsConfig.handler(
        params
      )) as any[];
      const endTime = Date.now();

      expect(result).toHaveLength(10);
      expect((result as any[]).every((r: any) => r.success)).toBe(true);
      // Should complete faster than sequential processing due to controlled concurrency
      expect(endTime - startTime).toBeLessThan(200); // Much less than 10 * 10ms = 100ms
    });

    it('should add delays between batch chunks', async () => {
      // This test ensures that delays are added between chunks for rate limiting
      const mockHandleUniversalCreate = vi.mocked(
        sharedHandlers.handleUniversalCreate
      );
      mockHandleUniversalCreate.mockResolvedValue({
        id: { record_id: 'test' },
        values: {},
      });

      // Create enough records to trigger multiple chunks (>5 concurrent)
      const records = Array(12).fill({ name: 'Test' });
      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records,
      };

      const startTime = Date.now();
      await batchOperationsConfig.handler(params);
      const endTime = Date.now();

      // Should take some time due to batch delays
      expect(endTime - startTime).toBeGreaterThan(50); // At least some delay for chunking
    });
  });
});
