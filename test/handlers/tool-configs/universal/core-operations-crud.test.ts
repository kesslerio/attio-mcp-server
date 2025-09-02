import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import shared helpers
import { setupUnitTestMocks, cleanupMocks } from './helpers/index.js';

// Enhanced error types will be imported when needed in error handling tests

// Import tool configurations
import {
  createRecordConfig,
  updateRecordConfig,
  deleteRecordConfig,
} from '../../../../src/handlers/tool-configs/universal/core-operations.js';

// Import types
import {
  UniversalResourceType,
  UniversalCreateParams,
  UniversalUpdateParams,
  UniversalDeleteParams,
} from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Universal Core Operations CRUD Tests', () => {
  beforeEach(() => {
    setupUnitTestMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('create-record tool', () => {
    it('should create company successfully', async () => {
      const mockCreatedRecord = {
        id: { record_id: 'comp-new' },
        values: {
          name: 'New Company',
          website: 'https://new.com',
        },
      };

      const { handleUniversalCreate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalCreate).mockResolvedValue(
        mockCreatedRecord as any
      );

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
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      };

      const { handleUniversalCreate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalCreate).mockResolvedValue(
        mockCreatedRecord as any
      );

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
          name: 'New Company',
        },
      };

      const { getSingularResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(getSingularResourceType).mockReturnValue('company');

      const formatted = (createRecordConfig.formatResult as any)(
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
      vi.mocked(handleUniversalUpdate).mockResolvedValue(mockUpdatedRecord as any);

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

      const formatted = (updateRecordConfig.formatResult as any)(
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

      const formatted = (deleteRecordConfig.formatResult as any)(
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

      const formatted = (deleteRecordConfig.formatResult as any)(
        mockResult,
        UniversalResourceType.COMPANIES
      );
      expect(formatted).toBe('❌ Failed to delete company with ID: comp-1');
    });
  });
});
