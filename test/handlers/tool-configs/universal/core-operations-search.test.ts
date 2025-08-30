import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { setupUnitTestMocks, cleanupMocks } from './helpers/index.js';

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

      expect(result).toEqual(mockResults);
      expect(vi.mocked(handleUniversalSearch)).toHaveBeenCalledWith(params);
    });

    it('should search people successfully', async () => {
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

      expect(result).toEqual(mockResults);
      expect(vi.mocked(handleUniversalSearch)).toHaveBeenCalledWith(params);
    });

    it('should handle search errors properly', async () => {
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
      expect(formatted).toContain('Found 0 records');
    });
  });

  describe('get-record-details tool', () => {
    it('should get company details successfully', async () => {
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
      vi.mocked(handleUniversalGetDetails).mockResolvedValue(mockRecord);

      const params: UniversalRecordDetailsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp-1',
      };

      expect(result).toEqual(mockRecord);
      expect(vi.mocked(handleUniversalGetDetails)).toHaveBeenCalledWith(params);
    });

    it('should get person details successfully', async () => {
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

      expect(result).toEqual(mockRecord);
    });

    it('should format record details correctly', async () => {
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

      vi.mocked(handleUniversalGetDetails).mockResolvedValue({});
      vi.mocked(handleUniversalCreate).mockResolvedValue({});
      vi.mocked(handleUniversalUpdate).mockResolvedValue({});
      vi.mocked(handleUniversalDelete).mockResolvedValue({
        success: true,
        record_id: 'test',
      });


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
