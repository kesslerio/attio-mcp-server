import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import shared helpers
import { setupUnitTestMocks, cleanupMocks } from './helpers/index.js';

// Import tool configurations
import {
  searchRecordsConfig,
  getRecordDetailsConfig,
} from '../../../../src/handlers/tool-configs/universal/core/index.js';

// Import types
import {
  UniversalResourceType,
  UniversalSearchParams,
  UniversalRecordDetailsParams,
} from '../../../../src/handlers/tool-configs/universal/types.js';
import { resolveToolName } from '../../../../src/config/tool-aliases.js';

describe('Universal Core Operations Search Tests', () => {
  beforeEach(() => {
    setupUnitTestMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('records_search tool', () => {
    it('should search companies successfully', async () => {
      const mockResults: any[] = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Test Company' }],
            domains: [{ domain: 'test.com' }],
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
      vi.mocked(handleUniversalSearch).mockRejectedValue(mockError);

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
      };

      await expect(searchRecordsConfig.handler(params)).rejects.toSatisfy(
        (error: unknown) => {
          if (!error) return false;

          if (
            typeof error === 'object' &&
            'name' in error &&
            (error as { name?: unknown }).name === 'search_error'
          ) {
            const typed = error as {
              message?: string;
              details?: {
                context?: {
                  operation?: string;
                  resourceType?: string;
                  recordData?: Record<string, unknown>;
                };
              };
            };

            return (
              typed.message === 'Failed to search companies: API error' &&
              typed.details?.context?.operation === 'search' &&
              typed.details?.context?.resourceType === 'companies' &&
              typed.details?.context?.recordData?.resource_type ===
                'companies' &&
              typed.details?.context?.recordData?.query === 'test'
            );
          }

          if (
            typeof error === 'object' &&
            'status' in error &&
            'body' in error
          ) {
            const typed = error as {
              status?: number;
              body?: { message?: string; type?: string };
            };

            return (
              typeof typed.status === 'number' &&
              typed.body?.message ===
                'Universal search failed for resource type companies: API error' &&
              typed.body?.type === 'validation_error'
            );
          }

          return false;
        }
      );
    });

    it('should format search results correctly', () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Test Company' }],
            domains: [{ domain: 'test.com' }],
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
      expect(formatted).toContain('1. Test Company (test.com) (ID: comp-1)');
      expect(formatted).toContain(
        '2. Another Company (info@another.com) (ID: comp-2)'
      );
    });

    it('should handle empty search results', () => {
      const formatted = (searchRecordsConfig.formatResult as any)([]);
      expect(formatted).toContain('Found 0 records');
    });
  });

  describe('records_get_details tool', () => {
    it('should get company details successfully', async () => {
      const mockRecord: any = {
        id: { record_id: 'comp-1' },
        values: {
          name: [{ value: 'Test Company' }],
          domains: [{ domain: 'test.com' }],
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
      // Cast to any to align with AttioRecord typing used by handler
      vi.mocked(handleUniversalGetDetails).mockResolvedValue(mockRecord as any);

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
          domains: [{ domain: 'test.com' }],
          primary_location: [{ value: 'San Francisco, CA' }],
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
      expect(formatted).toContain('Domains: test.com');
      expect(formatted).toContain('Primary location: San Francisco, CA');
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

  describe('legacy alias compatibility', () => {
    it('resolves search-records alias to records.search', () => {
      const resolution = resolveToolName('search-records');
      expect(resolution.name).toBe('records_search');
      expect(resolution.alias?.alias).toBe('search-records');
    });
  });
});
