import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import shared helpers
import { setupUnitTestMocks, cleanupMocks } from './helpers/index.js';

// Import enhanced error types
import {
  UniversalValidationError,
  ErrorType,
} from '../../../../src/handlers/tool-configs/universal/schemas.js';

// Import tool configurations
import {
  searchRecordsConfig,
  getRecordDetailsConfig,
} from '../../../../src/handlers/tool-configs/universal/core-operations.js';

// Import types
import {
  UniversalResourceType,
  UniversalSearchParams,
  UniversalRecordDetailsParams,
} from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Universal Core Operations Search Tests', () => {
  beforeEach(() => {
    setupUnitTestMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('search-records tool', () => {
    it('should search companies successfully', async () => {
      const mockResults: any[] = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Test Company' }],
            website: [{ value: 'https://test.com' }],
          },
        },
      ];

      const { handleUniversalSearch } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalSearch).mockResolvedValue(mockResults);

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
      };

      const result = await searchRecordsConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(vi.mocked(handleUniversalSearch)).toHaveBeenCalledWith(params);
    });

    it('should search people successfully', async () => {
      const mockResults: any[] = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'John Doe' }],
            email: [{ value: 'john@example.com' }],
          },
        },
      ];

      const { handleUniversalSearch } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalSearch).mockResolvedValue(mockResults);

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        query: 'john',
        limit: 10,
      };

      const result = await searchRecordsConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(vi.mocked(handleUniversalSearch)).toHaveBeenCalledWith(params);
    });

    it('should handle search errors properly', async () => {
      const mockError = new Error('API error');
      const { handleUniversalSearch } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      const { ErrorService } = await import(
        '../../../../src/services/ErrorService.js'
      );
      vi.mocked(handleUniversalSearch).mockRejectedValue(mockError);
      vi.mocked(ErrorService.createUniversalError).mockReturnValue(
        new UniversalValidationError(
          'Universal search failed for resource type companies: API error',
          ErrorType.API_ERROR,
          { cause: mockError }
        )
      );

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
      };

      await expect(searchRecordsConfig.handler(params)).rejects.toThrow(
        'Universal search failed for resource type companies: API error'
      );
      expect(vi.mocked(ErrorService.createUniversalError)).toHaveBeenCalledWith(
        'search',
        UniversalResourceType.COMPANIES,
        mockError
      );
    });

    it('should format search results correctly', () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Test Company' }],
            website: [{ value: 'https://test.com' }],
          },
        },
        {
          id: { record_id: 'comp-2' },
          values: {
            name: [{ value: 'Another Company' }],
            email: [{ value: 'info@another.com' }],
          },
        },
      ];

      const formatted = (searchRecordsConfig.formatResult as any)(
        mockResults,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Found 2 companies');
      expect(formatted).toContain(
        '1. Test Company (https://test.com) (ID: comp-1)'
      );
      expect(formatted).toContain(
        '2. Another Company (info@another.com) (ID: comp-2)'
      );
    });

    it('should handle empty search results', () => {
      const formatted = (searchRecordsConfig.formatResult as any)([]);
      expect(formatted).toContain('Found 0 records');
    });
  });

  describe('get-record-details tool', () => {
    it('should get company details successfully', async () => {
      const mockRecord: any = {
        id: { record_id: 'comp-1' },
        values: {
          name: [{ value: 'Test Company' }],
          website: [{ value: 'https://test.com' }],
          industry: [{ value: 'Technology' }],
        },
      };

      const { handleUniversalGetDetails } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalGetDetails).mockResolvedValue(mockRecord as any);

      const params: UniversalRecordDetailsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp-1',
      };

      const result = await getRecordDetailsConfig.handler(params);
      expect(result).toEqual(mockRecord);
      expect(vi.mocked(handleUniversalGetDetails)).toHaveBeenCalledWith(params);
    });

    it('should get person details successfully', async () => {
      const mockRecord = {
        id: { record_id: 'person-1' },
        values: {
          name: [{ value: 'John Doe' }],
          email: [{ value: 'john@example.com' }],
          phone: [{ value: '+1234567890' }],
        },
      };

      const { handleUniversalGetDetails } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalGetDetails).mockResolvedValue(mockRecord);

      const params: UniversalRecordDetailsParams = {
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person-1',
        fields: ['name', 'email', 'phone'],
      };

      const result = await getRecordDetailsConfig.handler(params);
      expect(result).toEqual(mockRecord);
    });

    it('should format record details correctly', async () => {
      const mockRecord = {
        id: { record_id: 'comp-1' },
        values: {
          name: [{ value: 'Test Company' }],
          website: [{ value: 'https://test.com' }],
          industry: [{ value: 'Technology' }],
          location: [{ value: 'San Francisco, CA' }],
        },
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = (getRecordDetailsConfig.formatResult as any)(
        mockRecord,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Company: Test Company');
      expect(formatted).toContain('ID: comp-1');
      expect(formatted).toContain('Website: https://test.com');
      expect(formatted).toContain('Industry: Technology');
      expect(formatted).toContain('Location: San Francisco, CA');
    });
  });

  describe('Cross-resource type validation', () => {
    it('should handle all resource types for search', async () => {
      const { handleUniversalSearch } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalSearch).mockResolvedValue([]);

      const resourceTypes = [
        UniversalResourceType.COMPANIES,
        UniversalResourceType.PEOPLE,
        UniversalResourceType.LISTS,
        UniversalResourceType.RECORDS,
        UniversalResourceType.TASKS,
        UniversalResourceType.DEALS,
      ];

      for (const resourceType of resourceTypes) {
        const params: UniversalSearchParams = {
          resource_type: resourceType,
          query: 'test',
        };

        await searchRecordsConfig.handler(params);
        expect(vi.mocked(handleUniversalSearch)).toHaveBeenCalledWith(params);
      }

      expect(vi.mocked(handleUniversalSearch)).toHaveBeenCalledTimes(6);
    });

    it('should handle all resource types for CRUD operations', async () => {
      const {
        handleUniversalGetDetails,
        handleUniversalCreate,
        handleUniversalUpdate,
        handleUniversalDelete,
      } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );

      vi.mocked(handleUniversalGetDetails).mockResolvedValue({} as any);
      vi.mocked(handleUniversalCreate).mockResolvedValue({} as any);
      vi.mocked(handleUniversalUpdate).mockResolvedValue({} as any);
      vi.mocked(handleUniversalDelete).mockResolvedValue({
        success: true,
        record_id: 'test',
      });

      const resourceTypes = Object.values(UniversalResourceType);

      for (const resourceType of resourceTypes) {
        // Test get details
        await getRecordDetailsConfig.handler({
          resource_type: resourceType,
          record_id: 'test-id',
        });

        // Note: Create, Update, Delete tests are in the CRUD file
        // We only test get details here to avoid duplication
      }

      expect(vi.mocked(handleUniversalGetDetails)).toHaveBeenCalledTimes(7);
    });
  });
});
