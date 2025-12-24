/**
 * Integration Tests: Core Operations Workflow
 *
 * Tests complete CRUD workflows through core operations and verifies
 * resource type routing works correctly across all operations.
 */

import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import {
  createRecordConfig,
  updateRecordConfig,
  deleteRecordConfig,
} from '@handlers/tool-configs/universal/core/crud-operations.js';
import { searchRecordsConfig } from '@handlers/tool-configs/universal/core/search-operations.js';
import { getRecordDetailsConfig } from '@handlers/tool-configs/universal/core/record-details-operations.js';
import { UniversalResourceType } from '@handlers/tool-configs/universal/types.js';

// Mock dependencies
vi.mock('@handlers/tool-configs/universal/shared-handlers.js', () => ({
  handleUniversalCreate: vi.fn(),
  handleUniversalUpdate: vi.fn(),
  handleUniversalDelete: vi.fn(),
  handleUniversalSearch: vi.fn(),
  handleUniversalGetDetails: vi.fn(),
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
}));

vi.mock('@services/UniversalUpdateService.js', () => ({
  UniversalUpdateService: {
    updateRecordWithValidation: vi.fn(),
  },
}));

vi.mock('@handlers/tool-configs/universal/schemas.js', async () => {
  const actual = await vi.importActual<
    typeof import('@handlers/tool-configs/universal/schemas.js')
  >('@handlers/tool-configs/universal/schemas.js');

  return {
    ...actual,
    validateUniversalToolParams: vi.fn((toolName, params) => params),
    CrossResourceValidator: {
      validateRecordRelationships: vi.fn(),
    },
  };
});

vi.mock('@handlers/tool-configs/universal/core/error-utils.js', async () => {
  const actual = await vi.importActual<
    typeof import('@handlers/tool-configs/universal/core/error-utils.js')
  >('@handlers/tool-configs/universal/core/error-utils.js');

  return {
    ...actual,
    handleCreateError: vi.fn(actual.handleCreateError),
    handleUpdateError: vi.fn(actual.handleUpdateError),
    handleDeleteError: vi.fn(actual.handleDeleteError),
    handleSearchError: vi.fn(actual.handleSearchError),
    handleCoreOperationError: vi.fn(actual.handleCoreOperationError),
  };
});

vi.mock('@utils/logger.js', () => ({
  createScopedLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

const importSharedHandlers = async () =>
  import('@handlers/tool-configs/universal/shared-handlers.js');

describe('Core Operations Workflow Integration', () => {
  type SharedHandlersModule = Awaited<ReturnType<typeof importSharedHandlers>>;
  let mockHandlers: Mocked<SharedHandlersModule>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockHandlers = vi.mocked(await importSharedHandlers());
  });

  describe('Complete CRUD Workflow for Companies', () => {
    it('should handle full create-read-update-delete workflow', async () => {
      const companyData = {
        name: 'Test Company',
        domain: 'test.com',
        description: 'A test company',
      };

      const resourceType = UniversalResourceType.COMPANIES;
      const recordId = 'company-123';

      // Mock successful responses
      const createdRecord = {
        id: { record_id: recordId },
        values: { name: 'Test Company' },
      };

      const updatedRecord = {
        ...createdRecord,
        values: { name: 'Updated Test Company' },
        validationMetadata: {
          warnings: ['Minor field mapping issue'],
          suggestions: ['Consider using official field names'],
        },
      };

      const searchResults = [createdRecord, updatedRecord];

      vi.mocked(mockHandlers.handleUniversalCreate).mockResolvedValue(
        createdRecord
      );
      vi.mocked(mockHandlers.handleUniversalUpdate).mockResolvedValue(
        updatedRecord
      );
      vi.mocked(mockHandlers.handleUniversalDelete).mockResolvedValue({
        success: true,
        record_id: recordId,
      });
      vi.mocked(mockHandlers.handleUniversalSearch).mockResolvedValue(
        searchResults
      );
      vi.mocked(mockHandlers.handleUniversalGetDetails).mockResolvedValue(
        createdRecord
      );

      // 1. Create Record
      const createParams = {
        resource_type: resourceType,
        record_data: companyData,
      };

      const createResult = await createRecordConfig.handler(createParams);
      expect(createResult).toEqual(createdRecord);
      expect(mockHandlers.handleUniversalCreate).toHaveBeenCalledWith(
        createParams
      );

      // 2. Get Record Details
      const detailsParams = {
        resource_type: resourceType,
        record_id: recordId,
      };

      const detailsResult = await getRecordDetailsConfig.handler(detailsParams);
      expect(detailsResult).toEqual(createdRecord);
      expect(mockHandlers.handleUniversalGetDetails).toHaveBeenCalledWith(
        detailsParams
      );

      // 3. Update Record
      const updateParams = {
        resource_type: resourceType,
        record_id: recordId,
        record_data: { ...companyData, name: 'Updated Test Company' },
      };

      const updateResult = await updateRecordConfig.handler(updateParams);
      expect(updateResult).toEqual(updatedRecord);
      expect(mockHandlers.handleUniversalUpdate).toHaveBeenCalledWith(
        updateParams
      );

      // 4. Search Records
      const searchParams = {
        resource_type: resourceType,
        query: 'Test Company',
        limit: 10,
      };

      const searchResult = await searchRecordsConfig.handler(searchParams);
      expect(searchResult).toEqual(searchResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        searchParams
      );

      // 5. Delete Record
      const deleteParams = {
        resource_type: resourceType,
        record_id: recordId,
      };

      const deleteResult = await deleteRecordConfig.handler(deleteParams);
      expect(deleteResult).toEqual({ success: true, record_id: recordId });
      expect(mockHandlers.handleUniversalDelete).toHaveBeenCalledWith(
        deleteParams
      );
    });

    it('should format results correctly throughout workflow', () => {
      const recordData = {
        id: { record_id: 'company-123' },
        values: {
          name: 'Test Company',
          domains: [{ domain: 'test.com' }],
        },
      };

      // Test create result formatting
      const createFormatted = createRecordConfig.formatResult(
        recordData,
        UniversalResourceType.COMPANIES
      );
      expect(createFormatted).toContain(
        '✅ Successfully created company: Test Company (ID: company-123)'
      );

      // Test update result formatting
      const updateData = {
        ...recordData,
        validationMetadata: {
          warnings: ['Field mapping warning'],
          suggestions: ['Use standard field names'],
        },
      };

      const updateFormatted = updateRecordConfig.formatResult(
        updateData,
        UniversalResourceType.COMPANIES
      );
      expect(updateFormatted).toContain(
        '⚠️  Updated company with warnings: Test Company (ID: company-123)'
      );
      expect(updateFormatted).toContain('Warnings:');
      expect(updateFormatted).toContain('• Field mapping warning');

      // Test delete result formatting
      const deleteFormatted = deleteRecordConfig.formatResult(
        { success: true, record_id: 'company-123' },
        UniversalResourceType.COMPANIES
      );
      expect(deleteFormatted).toBe(
        '✅ Successfully deleted company with ID: company-123'
      );

      // Test search result formatting
      const searchFormatted = searchRecordsConfig.formatResult(
        [recordData],
        UniversalResourceType.COMPANIES
      );
      expect(searchFormatted).toContain('Found 1 companies:');
      expect(searchFormatted).toContain(
        '1. Test Company (test.com) (ID: company-123)'
      );

      // Test details result formatting
      const detailsFormatted = getRecordDetailsConfig.formatResult(
        recordData,
        UniversalResourceType.COMPANIES
      );
      expect(detailsFormatted).toContain('Company: Test Company');
      expect(detailsFormatted).toContain('ID: company-123');
      expect(detailsFormatted).toContain('Domains: test.com');
    });
  });

  describe('Resource Type Routing', () => {
    const resourceTypes = [
      UniversalResourceType.COMPANIES,
      UniversalResourceType.PEOPLE,
      UniversalResourceType.DEALS,
      UniversalResourceType.TASKS,
      UniversalResourceType.NOTES,
    ];

    it.each(resourceTypes)(
      'should route %s operations correctly',
      async (resourceType) => {
        const recordData = { name: `Test ${resourceType}` };
        const recordId = `${resourceType}-123`;

        const mockRecord = {
          id: { record_id: recordId },
          values: { name: `Test ${resourceType}` },
        };

        vi.mocked(mockHandlers.handleUniversalCreate).mockResolvedValue(
          mockRecord
        );
        vi.mocked(mockHandlers.handleUniversalUpdate).mockResolvedValue(
          mockRecord
        );
        vi.mocked(mockHandlers.handleUniversalDelete).mockResolvedValue({
          success: true,
          record_id: recordId,
        });
        vi.mocked(mockHandlers.handleUniversalSearch).mockResolvedValue([
          mockRecord,
        ]);
        vi.mocked(mockHandlers.handleUniversalGetDetails).mockResolvedValue(
          mockRecord
        );

        // Test Create
        const createParams = {
          resource_type: resourceType,
          record_data: recordData,
        };
        await createRecordConfig.handler(createParams);
        expect(mockHandlers.handleUniversalCreate).toHaveBeenCalledWith(
          expect.objectContaining({ resource_type: resourceType })
        );

        // Test Update
        const updateParams = {
          resource_type: resourceType,
          record_id: recordId,
          record_data: recordData,
        };
        await updateRecordConfig.handler(updateParams);
        expect(mockHandlers.handleUniversalUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ resource_type: resourceType })
        );

        // Test Delete
        const deleteParams = {
          resource_type: resourceType,
          record_id: recordId,
        };
        await deleteRecordConfig.handler(deleteParams);
        expect(mockHandlers.handleUniversalDelete).toHaveBeenCalledWith(
          expect.objectContaining({ resource_type: resourceType })
        );

        // Test Search
        const searchParams = { resource_type: resourceType, query: 'test' };
        await searchRecordsConfig.handler(searchParams);
        expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
          expect.objectContaining({ resource_type: resourceType })
        );

        // Test Get Details
        const detailsParams = {
          resource_type: resourceType,
          record_id: recordId,
        };
        await getRecordDetailsConfig.handler(detailsParams);
        expect(mockHandlers.handleUniversalGetDetails).toHaveBeenCalledWith(
          expect.objectContaining({ resource_type: resourceType })
        );
      }
    );

    it('should handle deals with special validation service', async () => {
      const dealData = {
        name: 'Test Deal',
        amount: 10000,
        stage: 'qualification',
      };

      const dealRecord = {
        id: { record_id: 'deal-123' },
        values: { name: 'Test Deal' },
      };

      const { UniversalUpdateService } = await import(
        '@services/UniversalUpdateService.js'
      );

      vi.mocked(
        UniversalUpdateService.updateRecordWithValidation
      ).mockResolvedValue({
        record: dealRecord,
        validation: {
          warnings: ['Deal-specific validation'],
          suggestions: ['Use proper deal stage'],
          actualValues: { stage: 'qualification' },
        },
      });

      vi.mocked(mockHandlers.handleUniversalCreate).mockResolvedValue(
        dealRecord
      );

      // Test deal creation
      const createParams = {
        resource_type: UniversalResourceType.DEALS,
        record_data: dealData,
      };

      const result = await createRecordConfig.handler(createParams);
      expect(result).toEqual(dealRecord);

      // Test deal update (should use enhanced validation)
      const updateParams = {
        resource_type: UniversalResourceType.DEALS,
        record_id: 'deal-123',
        record_data: { ...dealData, stage: 'proposal' },
      };

      const updateResult = await updateRecordConfig.handler(updateParams);
      expect(updateResult).toEqual({
        ...dealRecord,
        validationMetadata: {
          warnings: ['Deal-specific validation'],
          suggestions: ['Use proper deal stage'],
          actualValues: { stage: 'qualification' },
        },
      });

      expect(
        vi.mocked(UniversalUpdateService.updateRecordWithValidation)
      ).toHaveBeenCalledWith(updateParams);
    });
  });

  describe('Error Handling Integration', () => {
    it('should propagate errors correctly through the workflow', async () => {
      const error = new Error('Integration test error');
      vi.mocked(mockHandlers.handleUniversalCreate).mockRejectedValue(error);

      const createParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_data: { name: 'Test' },
      };

      await expect(createRecordConfig.handler(createParams)).rejects.toSatisfy(
        (err: unknown) => {
          if (!err || typeof err !== 'object') return false;

          const candidate = err as {
            message?: string;
            name?: string;
            status?: number;
            body?: { message?: string; type?: string };
          };

          if (
            candidate.message ===
              'Failed to create company: Integration test error' &&
            candidate.name === 'create_error'
          ) {
            return true;
          }

          return (
            typeof candidate.status === 'number' &&
            candidate.body?.message ===
              'Universal create failed for resource type companies: Integration test error' &&
            candidate.body?.type === 'SYSTEM_ERROR'
          );
        }
      );
    });

    it('should maintain error boundaries between operations', async () => {
      const createError = new Error('Create error');
      const updateError = new Error('Update error');

      vi.mocked(mockHandlers.handleUniversalCreate).mockRejectedValue(
        createError
      );
      vi.mocked(mockHandlers.handleUniversalUpdate).mockRejectedValue(
        updateError
      );

      // Test create error
      await expect(
        createRecordConfig.handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { name: 'Test' },
        })
      ).rejects.toSatisfy((err: unknown) => {
        if (!err || typeof err !== 'object') return false;

        const candidate = err as {
          message?: string;
          name?: string;
          status?: number;
          body?: { message?: string; type?: string };
        };

        if (
          candidate.message === 'Failed to create company: Create error' &&
          candidate.name === 'create_error'
        ) {
          return true;
        }

        return (
          typeof candidate.status === 'number' &&
          candidate.body?.message ===
            'Universal create failed for resource type companies: Create error' &&
          candidate.body?.type === 'SYSTEM_ERROR'
        );
      });

      // Test update error
      await expect(
        updateRecordConfig.handler({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'company-123',
          record_data: { name: 'Updated' },
        })
      ).rejects.toSatisfy((err: unknown) => {
        if (!err || typeof err !== 'object') return false;

        const candidate = err as {
          message?: string;
          name?: string;
          status?: number;
          body?: { message?: string; type?: string };
        };

        if (
          candidate.message === 'Failed to update company: Update error' &&
          candidate.name === 'update_error'
        ) {
          return true;
        }

        return (
          typeof candidate.status === 'number' &&
          candidate.body?.message ===
            'Universal update failed for resource type companies: Update error' &&
          candidate.body?.type === 'SYSTEM_ERROR'
        );
      });
    });
  });

  describe('Parameter Validation Integration', () => {
    it('should validate parameters before processing', async () => {
      const { validateUniversalToolParams } = await import(
        '@handlers/tool-configs/universal/schemas.js'
      );

      const createParams = {
        resource_type: UniversalResourceType.COMPANIES,
        record_data: { name: 'Test Company' },
      };

      vi.mocked(mockHandlers.handleUniversalCreate).mockResolvedValue({
        id: { record_id: 'company-123' },
        values: { name: 'Test Company' },
      });

      await createRecordConfig.handler(createParams);

      expect(vi.mocked(validateUniversalToolParams)).toHaveBeenCalledWith(
        'create_record',
        createParams
      );
    });

    it('should validate cross-resource relationships', async () => {
      const { CrossResourceValidator } = await import(
        '@handlers/tool-configs/universal/schemas.js'
      );

      const createParams = {
        resource_type: UniversalResourceType.TASKS,
        record_data: {
          title: 'Test Task',
          assignee: { record_id: 'person-123' },
        },
      };

      vi.mocked(mockHandlers.handleUniversalCreate).mockResolvedValue({
        id: { record_id: 'task-123' },
        values: { title: 'Test Task' },
      });

      await createRecordConfig.handler(createParams);

      expect(
        vi.mocked(CrossResourceValidator.validateRecordRelationships)
      ).toHaveBeenCalledWith('tasks', createParams.record_data);
    });
  });
});
