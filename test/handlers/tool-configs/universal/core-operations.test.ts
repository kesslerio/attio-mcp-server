import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import enhanced error types
import {
  ErrorType,
  UniversalValidationError,
} from '../../../../src/handlers/tool-configs/universal/schemas.js';

// Mock the shared handlers
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
        new UniversalValidationError(
          `Universal ${operation} failed for resource type ${resourceType}: ${error.message || error}`,
          ErrorType.API_ERROR,
          { cause: error }
        )
    ),
  })
);

// Mock validation and schemas
vi.mock(
  '../../../../src/handlers/tool-configs/universal/schemas.js',
  async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
      ...actual,
      validateUniversalToolParams: vi.fn((operation: string, params: any) => {
        // Just return the params as-is (simulating successful validation)
        // This matches the expected behavior in tests
        return params || {};
      }),
      searchRecordsSchema: {},
      getRecordDetailsSchema: {},
      createRecordSchema: {},
      updateRecordSchema: {},
      deleteRecordSchema: {},
      getAttributesSchema: {},
      discoverAttributesSchema: {},
      getDetailedInfoSchema: {},
    };
  }
);

import {
  createRecordConfig,
  deleteRecordConfig,
  discoverAttributesConfig,
  getAttributesConfig,
  getDetailedInfoConfig,
  getRecordDetailsConfig,
  searchRecordsConfig,
  updateRecordConfig,
} from '../../../../src/handlers/tool-configs/universal/core-operations.js';
import {
  DetailedInfoType,
  UniversalAttributesParams,
  UniversalCreateParams,
  UniversalDeleteParams,
  UniversalDetailedInfoParams,
  UniversalRecordDetailsParams,
  UniversalResourceType,
  UniversalSearchParams,
  UniversalUpdateParams,
} from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Universal Core Operations Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search-records tool', () => {
    it('should search companies successfully', async () => {
      const mockResults = [
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
      const mockResults = [
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
      const { handleUniversalSearch, createUniversalError } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalSearch).mockRejectedValue(mockError);
      vi.mocked(createUniversalError).mockReturnValue(
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
      expect(vi.mocked(createUniversalError)).toHaveBeenCalledWith(
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

      const formatted = searchRecordsConfig.formatResult(
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
      const formatted = searchRecordsConfig.formatResult([]);
      expect(formatted).toContain('Found 0 records');
    });
  });

  describe('get-record-details tool', () => {
    it('should get company details successfully', async () => {
      const mockRecord = {
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
          description: [{ value: 'A test company' }],
        },
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = getRecordDetailsConfig.formatResult(
        mockRecord,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Company: Test Company');
      expect(formatted).toContain('ID: comp-1');
      expect(formatted).toContain('Website: https://test.com');
      expect(formatted).toContain('Industry: Technology');
      expect(formatted).toContain('Description: A test company');
    });
  });

  describe('create-record tool', () => {
    it('should create company successfully', async () => {
      const mockCreatedRecord = {
        id: { record_id: 'comp-new' },
        values: {
          name: [{ value: 'New Company' }],
          website: [{ value: 'https://new.com' }],
        },
      };

      const { handleUniversalCreate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalCreate).mockResolvedValue(mockCreatedRecord);

      const params: UniversalCreateParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_data: {
          name: 'New Company',
          website: 'https://new.com',
        },
        return_details: true,
      };

      const result = await createRecordConfig.handler(params);
      expect(result).toEqual(mockCreatedRecord);
      expect(vi.mocked(handleUniversalCreate)).toHaveBeenCalledWith(params);
    });

    it('should create person successfully', async () => {
      const mockCreatedRecord = {
        id: { record_id: 'person-new' },
        values: {
          name: [{ value: 'Jane Smith' }],
          email: [{ value: 'jane@example.com' }],
        },
      };

      const { handleUniversalCreate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalCreate).mockResolvedValue(mockCreatedRecord);

      const params: UniversalCreateParams = {
        resource_type: UniversalResourceType.PEOPLE,
        record_data: {
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      };

      const result = await createRecordConfig.handler(params);
      expect(result).toEqual(mockCreatedRecord);
    });

    it('should format create result correctly', async () => {
      const mockRecord = {
        id: { record_id: 'comp-new' },
        values: {
          name: [{ value: 'New Company' }],
        },
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = createRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toBe(
        '✅ Successfully created company: New Company (ID: comp-new)'
      );
    });
  });

  describe('update-record tool', () => {
    it('should update company successfully', async () => {
      const mockUpdatedRecord = {
        id: { record_id: 'comp-1' },
        values: {
          name: [{ value: 'Updated Company' }],
          website: [{ value: 'https://updated.com' }],
        },
      };

      const { handleUniversalUpdate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalUpdate).mockResolvedValue(mockUpdatedRecord);

      const params: UniversalUpdateParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp-1',
        record_data: {
          website: 'https://updated.com',
        },
        return_details: true,
      };

      const result = await updateRecordConfig.handler(params);
      expect(result).toEqual(mockUpdatedRecord);
      expect(vi.mocked(handleUniversalUpdate)).toHaveBeenCalledWith(params);
    });

    it('should format update result correctly', async () => {
      const mockRecord = {
        id: { record_id: 'comp-1' },
        values: {
          name: [{ value: 'Updated Company' }],
        },
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = updateRecordConfig.formatResult(
        mockRecord,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toBe(
        '✅ Successfully updated company: Updated Company (ID: comp-1)'
      );
    });
  });

  describe('delete-record tool', () => {
    it('should delete record successfully', async () => {
      const mockResult = {
        success: true,
        record_id: 'comp-1',
      };

      const { handleUniversalDelete } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalDelete).mockResolvedValue(mockResult);

      const params: UniversalDeleteParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp-1',
      };

      const result = await deleteRecordConfig.handler(params);
      expect(result).toEqual(mockResult);
      expect(vi.mocked(handleUniversalDelete)).toHaveBeenCalledWith(params);
    });

    it('should format successful delete result correctly', async () => {
      const mockResult = { success: true, record_id: 'comp-1' };
      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = deleteRecordConfig.formatResult(
        mockResult,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toBe('✅ Successfully deleted company with ID: comp-1');
    });

    it('should format failed delete result correctly', async () => {
      const mockResult = { success: false, record_id: 'comp-1' };
      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = deleteRecordConfig.formatResult(
        mockResult,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toBe('❌ Failed to delete company with ID: comp-1');
    });
  });

  describe('get-attributes tool', () => {
    it('should get attributes successfully', async () => {
      const mockAttributes = [
        { name: 'name', type: 'string', required: true },
        { name: 'website', type: 'url', required: false },
        { name: 'industry', type: 'select', required: false },
      ];

      const { handleUniversalGetAttributes } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalGetAttributes).mockResolvedValue(mockAttributes);

      const params: UniversalAttributesParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp-1',
      };

      const result = await getAttributesConfig.handler(params);
      expect(result).toEqual(mockAttributes);
      expect(vi.mocked(handleUniversalGetAttributes)).toHaveBeenCalledWith(
        params
      );
    });

    it('should format array attributes correctly', async () => {
      const mockAttributes = [
        { name: 'name', type: 'string' },
        { name: 'website', type: 'url' },
      ];

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = getAttributesConfig.formatResult(
        mockAttributes,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toContain('Company attributes (2)');
      expect(formatted).toContain('1. name (string)');
      expect(formatted).toContain('2. website (url)');
    });

    it('should format object attributes correctly', async () => {
      const mockAttributes = {
        name: 'Test Company',
        website: 'https://test.com',
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = getAttributesConfig.formatResult(
        mockAttributes,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toContain('Company attributes (2)');
      expect(formatted).toContain('1. name: "Test Company"');
      expect(formatted).toContain('2. website: "https://test.com"');
    });
  });

  describe('discover-attributes tool', () => {
    it('should discover attributes successfully', async () => {
      const mockSchema = [
        { name: 'name', type: 'string', required: true },
        { name: 'website', type: 'url', required: false },
      ];

      const { handleUniversalDiscoverAttributes } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue(
        mockSchema
      );

      const params = { resource_type: UniversalResourceType.COMPANIES };

      const result = await discoverAttributesConfig.handler(params);
      expect(result).toEqual(mockSchema);
      expect(vi.mocked(handleUniversalDiscoverAttributes)).toHaveBeenCalledWith(
        UniversalResourceType.COMPANIES
      );
    });

    it('should format discovered attributes correctly', async () => {
      const mockSchema = [
        { name: 'name', type: 'string', required: true },
        { name: 'website', type: 'url', required: false },
      ];

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = discoverAttributesConfig.formatResult(
        mockSchema,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toContain('Available company attributes (2)');
      expect(formatted).toContain('1. name (string) (required)');
      expect(formatted).toContain('2. website (url)');
    });
  });

  describe('get-detailed-info tool', () => {
    it('should get detailed info successfully', async () => {
      const mockInfo = {
        values: {
          name: [{ value: 'Test Company' }],
          website: [{ value: 'https://test.com' }],
          email: [{ value: 'info@test.com' }],
        },
      };

      const { handleUniversalGetDetailedInfo } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalGetDetailedInfo).mockResolvedValue(mockInfo);

      const params: UniversalDetailedInfoParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp-1',
        info_type: DetailedInfoType.CONTACT,
      };

      const result = await getDetailedInfoConfig.handler(params);
      expect(result).toEqual(mockInfo);
      expect(vi.mocked(handleUniversalGetDetailedInfo)).toHaveBeenCalledWith(
        params
      );
    });

    it('should format detailed info with values correctly', async () => {
      const mockInfo = {
        values: {
          name: [{ value: 'Test Company' }],
          website: [{ value: 'https://test.com' }],
          email: [{ value: 'info@test.com' }],
        },
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = getDetailedInfoConfig.formatResult(
        mockInfo,
        UniversalResourceType.COMPANIES,
        DetailedInfoType.CONTACT
      );

      expect(formatted).toContain('Company contact information:');
      expect(formatted).toContain('Name: Test Company');
      expect(formatted).toContain('Website: https://test.com');
      expect(formatted).toContain('Email: info@test.com');
    });

    it('should format detailed info as object correctly', async () => {
      const mockInfo = {
        name: 'Test Company',
        website: 'https://test.com',
        email: 'info@test.com',
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = getDetailedInfoConfig.formatResult(
        mockInfo,
        UniversalResourceType.COMPANIES,
        DetailedInfoType.BUSINESS
      );

      expect(formatted).toContain('Company business information:');
      expect(formatted).toContain('Name: Test Company');
      expect(formatted).toContain('Website: https://test.com');
      expect(formatted).toContain('Email: info@test.com');
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

      expect(vi.mocked(handleUniversalSearch)).toHaveBeenCalledTimes(5);
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

      const resourceTypes = Object.values(UniversalResourceType);

      for (const resourceType of resourceTypes) {
        // Test get details
        await getRecordDetailsConfig.handler({
          resource_type: resourceType,
          record_id: 'test-id',
        });

        // Test create
        await createRecordConfig.handler({
          resource_type: resourceType,
          record_data: { name: 'Test' },
        });

        // Test update
        await updateRecordConfig.handler({
          resource_type: resourceType,
          record_id: 'test-id',
          record_data: { name: 'Updated' },
        });

        // Test delete
        await deleteRecordConfig.handler({
          resource_type: resourceType,
          record_id: 'test-id',
        });
      }

      expect(vi.mocked(handleUniversalGetDetails)).toHaveBeenCalledTimes(5);
      expect(vi.mocked(handleUniversalCreate)).toHaveBeenCalledTimes(5);
      expect(vi.mocked(handleUniversalUpdate)).toHaveBeenCalledTimes(5);
      expect(vi.mocked(handleUniversalDelete)).toHaveBeenCalledTimes(5);
    });
  });
});
