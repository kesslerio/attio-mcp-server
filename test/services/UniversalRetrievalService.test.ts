/**
 * Test suite for UniversalRetrievalService
 *
 * Tests universal record retrieval operations extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalRetrievalService } from '../../src/services/UniversalRetrievalService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../../src/types/attio.js';

// Mock the dependencies
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    validateUUID: vi.fn(),
  },
}));

vi.mock('../../src/services/CachingService.js', () => ({
  CachingService: {
    isCached404: vi.fn(),
    cache404Response: vi.fn(),
  },
}));

vi.mock('../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: {
    convertTaskToRecord: vi.fn(),
  },
}));

vi.mock('../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    startOperation: vi.fn(() => 'perf-123'),
    markTiming: vi.fn(),
    markApiStart: vi.fn(() => 100),
    markApiEnd: vi.fn(),
    endOperation: vi.fn(),
  },
}));

vi.mock('../../src/utils/validation/uuid-validation.js', () => ({
  createRecordNotFoundError: vi.fn(() => new Error('Record not found')),
}));

vi.mock('../../src/errors/enhanced-api-errors.js', () => ({
  ErrorEnhancer: {
    autoEnhance: vi.fn((error) => error),
    getErrorMessage: vi.fn((error) => error.message),
  },
}));

vi.mock('../../src/objects/companies/index.js', () => ({
  getCompanyDetails: vi.fn(),
}));

vi.mock('../../src/objects/people/index.js', () => ({
  getPersonDetails: vi.fn(),
}));

vi.mock('../../src/objects/lists.js', () => ({
  getListDetails: vi.fn(),
}));

vi.mock('../../src/objects/records/index.js', () => ({
  getObjectRecord: vi.fn(),
}));

vi.mock('../../src/objects/tasks.js', () => ({
  getTask: vi.fn(),
}));

import { ValidationService } from '../../src/services/ValidationService.js';
import { CachingService } from '../../src/services/CachingService.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { enhancedPerformanceTracker } from '../../src/middleware/performance-enhanced.js';
import { createRecordNotFoundError } from '../../src/utils/validation/uuid-validation.js';
import { ErrorEnhancer } from '../../src/errors/enhanced-api-errors.js';
import { getCompanyDetails } from '../../src/objects/companies/index.js';
import { getPersonDetails } from '../../src/objects/people/index.js';
import { getListDetails } from '../../src/objects/lists.js';
import { getObjectRecord } from '../../src/objects/records/index.js';
import { getTask } from '../../src/objects/tasks.js';

describe('UniversalRetrievalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecordDetails', () => {
    const mockRecord: AttioRecord = {
      id: { record_id: 'test_123' },
      values: { name: 'Test Record' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
    });

    it('should retrieve a company record', async () => {
      vi.mocked(getCompanyDetails).mockResolvedValue(mockRecord);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(ValidationService.validateUUID).toHaveBeenCalledWith(
        'comp_123',
        UniversalResourceType.COMPANIES,
        'GET',
        'perf-123'
      );
      expect(getCompanyDetails).toHaveBeenCalledWith('comp_123');
      expect(result).toEqual(mockRecord);
    });

    it('should retrieve a person record', async () => {
      vi.mocked(getPersonDetails).mockResolvedValue(mockRecord);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person_456',
      });

      expect(getPersonDetails).toHaveBeenCalledWith('person_456');
      expect(result).toEqual(mockRecord);
    });

    it('should retrieve a list record and convert format', async () => {
      const mockList = {
        id: { list_id: 'list_789' },
        name: 'Test List',
        description: 'Test description',
        object_slug: 'companies',
        api_slug: 'test-list',
        workspace_id: 'ws_123',
        workspace_member_access: 'read',
        created_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(getListDetails).mockResolvedValue(mockList);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_789',
      });

      expect(getListDetails).toHaveBeenCalledWith('list_789');
      expect(result).toEqual({
        id: {
          record_id: 'list_789',
          list_id: 'list_789',
        },
        values: {
          name: 'Test List',
          description: 'Test description',
          parent_object: 'companies',
          api_slug: 'test-list',
          workspace_id: 'ws_123',
          workspace_member_access: 'read',
          created_at: '2024-01-01T00:00:00Z',
        },
      });
    });

    it('should retrieve a records object record', async () => {
      vi.mocked(getObjectRecord).mockResolvedValue(mockRecord);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.RECORDS,
        record_id: 'record_abc',
      });

      expect(getObjectRecord).toHaveBeenCalledWith('records', 'record_abc');
      expect(result).toEqual(mockRecord);
    });

    it('should retrieve a deals object record', async () => {
      vi.mocked(getObjectRecord).mockResolvedValue(mockRecord);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.DEALS,
        record_id: 'deal_def',
      });

      expect(getObjectRecord).toHaveBeenCalledWith('deals', 'deal_def');
      expect(result).toEqual(mockRecord);
    });

    it('should retrieve a task record and convert to AttioRecord', async () => {
      const mockTask: AttioTask = {
        id: { task_id: 'task_ghi' },
        content: 'Test Task',
        status: 'pending',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(getTask).mockResolvedValue(mockTask);
      vi.mocked(UniversalUtilityService.convertTaskToRecord).mockReturnValue(
        mockRecord
      );

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_ghi',
      });

      expect(getTask).toHaveBeenCalledWith('task_ghi');
      expect(UniversalUtilityService.convertTaskToRecord).toHaveBeenCalledWith(
        mockTask
      );
      expect(result).toEqual(mockRecord);
    });

    it('should throw error for unsupported resource type', async () => {
      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: 'invalid' as any,
          record_id: 'test_123',
        })
      ).rejects.toThrow('Unsupported resource type for get details: invalid');
    });

    it('should handle cached 404 responses', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(true);
      vi.mocked(createRecordNotFoundError).mockReturnValue(
        new Error('Record not found')
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
        })
      ).rejects.toThrow('Record not found');

      expect(CachingService.isCached404).toHaveBeenCalledWith(
        UniversalResourceType.COMPANIES,
        'comp_123'
      );
      expect(enhancedPerformanceTracker.endOperation).toHaveBeenCalledWith(
        'perf-123',
        false,
        'Cached 404 response',
        404,
        { cached: true }
      );
    });

    it('should handle 404 errors and cache them', async () => {
      const notFoundError = {
        response: { status: 404 },
        message: 'Company not found',
      };
      vi.mocked(getCompanyDetails).mockRejectedValue(notFoundError);
      vi.mocked(createRecordNotFoundError).mockReturnValue(
        new Error('Record not found')
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
        })
      ).rejects.toThrow('Record not found');

      expect(CachingService.cache404Response).toHaveBeenCalledWith(
        UniversalResourceType.COMPANIES,
        'comp_123'
      );
    });

    it('should handle task retrieval errors and cache 404s', async () => {
      const taskError = new Error('Task not found');
      vi.mocked(getTask).mockRejectedValue(taskError);
      vi.mocked(createRecordNotFoundError).mockReturnValue(
        new Error('Record not found')
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'task_123',
        })
      ).rejects.toThrow('Record not found');

      expect(CachingService.cache404Response).toHaveBeenCalledWith(
        UniversalResourceType.TASKS,
        'task_123'
      );
    });

    it('should handle non-404 errors with enhancement', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Internal server error',
      };
      vi.mocked(getCompanyDetails).mockRejectedValue(serverError);
      vi.mocked(ErrorEnhancer.autoEnhance).mockReturnValue(
        new Error('Enhanced error')
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
        })
      ).rejects.toThrow('Enhanced error');

      expect(ErrorEnhancer.autoEnhance).toHaveBeenCalled();
    });

    it('should apply field filtering when fields parameter is provided', async () => {
      const fullRecord: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: {
          name: 'Test Company',
          domain: 'test.com',
          employees: 50,
          industry: 'Tech',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(getCompanyDetails).mockResolvedValue(fullRecord);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
        fields: ['name', 'domain'],
      });

      expect(result.values).toEqual({
        name: 'Test Company',
        domain: 'test.com',
      });
      expect(result.id).toEqual(fullRecord.id);
      expect(result.created_at).toEqual(fullRecord.created_at);
      expect(result.updated_at).toEqual(fullRecord.updated_at);
    });

    it('should handle performance tracking correctly', async () => {
      vi.mocked(getCompanyDetails).mockResolvedValue(mockRecord);

      await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(enhancedPerformanceTracker.startOperation).toHaveBeenCalledWith(
        'get-record-details',
        'get',
        { resourceType: UniversalResourceType.COMPANIES, recordId: 'comp_123' }
      );
      expect(enhancedPerformanceTracker.markTiming).toHaveBeenCalled();
      expect(enhancedPerformanceTracker.markApiStart).toHaveBeenCalledWith(
        'perf-123'
      );
      expect(enhancedPerformanceTracker.markApiEnd).toHaveBeenCalledWith(
        'perf-123',
        100
      );
      expect(enhancedPerformanceTracker.endOperation).toHaveBeenCalledWith(
        'perf-123',
        true,
        undefined,
        200
      );
    });
  });

  describe('recordExists', () => {
    it('should return true when record exists', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(getCompanyDetails).mockResolvedValue({
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      });

      const exists = await UniversalRetrievalService.recordExists(
        UniversalResourceType.COMPANIES,
        'comp_123'
      );

      expect(exists).toBe(true);
    });

    it('should return false when record is cached as 404', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(true);

      const exists = await UniversalRetrievalService.recordExists(
        UniversalResourceType.COMPANIES,
        'comp_123'
      );

      expect(exists).toBe(false);
    });

    it('should return false when record throws not found error', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(getCompanyDetails).mockRejectedValue(
        new Error('Record not found')
      );

      const exists = await UniversalRetrievalService.recordExists(
        UniversalResourceType.COMPANIES,
        'comp_123'
      );

      expect(exists).toBe(false);
    });

    it('should re-throw non-404 errors', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(getCompanyDetails).mockRejectedValue(new Error('Server error'));
      vi.mocked(ErrorEnhancer.autoEnhance).mockReturnValue(
        new Error('Enhanced error')
      );

      await expect(
        UniversalRetrievalService.recordExists(
          UniversalResourceType.COMPANIES,
          'comp_123'
        )
      ).rejects.toThrow('Enhanced error');
    });
  });

  describe('getMultipleRecords', () => {
    it('should retrieve multiple records successfully', async () => {
      const record1: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Company 1' },
      };
      const record2: AttioRecord = {
        id: { record_id: 'comp_456' },
        values: { name: 'Company 2' },
      };

      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(getCompanyDetails)
        .mockResolvedValueOnce(record1)
        .mockResolvedValueOnce(record2);

      const results = await UniversalRetrievalService.getMultipleRecords(
        UniversalResourceType.COMPANIES,
        ['comp_123', 'comp_456']
      );

      expect(results).toEqual([record1, record2]);
    });

    it('should handle mixed success and failure results', async () => {
      const record1: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Company 1' },
      };

      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(getCompanyDetails)
        .mockResolvedValueOnce(record1)
        .mockRejectedValueOnce(new Error('Not found'));

      const results = await UniversalRetrievalService.getMultipleRecords(
        UniversalResourceType.COMPANIES,
        ['comp_123', 'comp_456']
      );

      expect(results).toEqual([record1, null]);
    });

    it('should apply field filtering to multiple records', async () => {
      const record1: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Company 1', domain: 'company1.com', employees: 10 },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(getCompanyDetails).mockResolvedValue(record1);

      const results = await UniversalRetrievalService.getMultipleRecords(
        UniversalResourceType.COMPANIES,
        ['comp_123'],
        ['name']
      );

      expect(results[0]?.values).toEqual({ name: 'Company 1' });
      expect(results[0]?.id).toEqual(record1.id);
    });
  });

  describe('getRecordWithMetrics', () => {
    it('should return record with performance metrics', async () => {
      const mockRecord: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      };

      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(getCompanyDetails).mockResolvedValue(mockRecord);

      const result = await UniversalRetrievalService.getRecordWithMetrics({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(result.record).toEqual(mockRecord);
      expect(result.metrics).toEqual({
        duration: expect.any(Number),
        cached: false,
      });
    });

    it('should indicate cached status in metrics', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(true);
      vi.mocked(createRecordNotFoundError).mockReturnValue(
        new Error('Record not found')
      );

      await expect(
        UniversalRetrievalService.getRecordWithMetrics({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
        })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('Field filtering', () => {
    beforeEach(() => {
      // Reset all mocks for field filtering tests
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
    });

    it('should filter non-AttioRecord objects correctly', async () => {
      const plainObject = {
        name: 'Test',
        domain: 'test.com',
        employees: 50,
        industry: 'Tech',
      };

      // Access private method for testing
      const filtered = (UniversalRetrievalService as any).filterResponseFields(
        plainObject,
        ['name', 'domain']
      );

      expect(filtered).toEqual({
        name: 'Test',
        domain: 'test.com',
      });
    });

    it('should return full data when no fields specified', async () => {
      const fullRecord: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company', domain: 'test.com' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getCompanyDetails).mockResolvedValue(fullRecord);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(result).toEqual(fullRecord);
    });

    it('should handle empty fields array', async () => {
      const fullRecord: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company', domain: 'test.com' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getCompanyDetails).mockResolvedValue(fullRecord);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
        fields: [],
      });

      expect(result).toEqual(fullRecord);
    });

    it('should handle fields that do not exist in the record', async () => {
      const fullRecord: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getCompanyDetails).mockResolvedValue(fullRecord);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
        fields: ['name', 'nonexistent_field'],
      });

      expect(result.values).toEqual({ name: 'Test Company' });
    });
  });
});
