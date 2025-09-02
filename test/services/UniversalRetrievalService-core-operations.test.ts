/**
 * Split: UniversalRetrievalService core operations
 */
// Local mocks (must match specifiers used below)
import { vi } from 'vitest';
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: { validateUUID: vi.fn() },
}));
vi.mock('../../src/services/CachingService.js', () => ({
  CachingService: { isCached404: vi.fn(), cache404Response: vi.fn() },
}));
vi.mock('../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: { convertTaskToRecord: vi.fn() },
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
    autoEnhance: vi.fn((e) => e),
    getErrorMessage: vi.fn((e) => (e as any).message),
  },
  EnhancedApiError: class EnhancedApiError extends Error {
    public readonly statusCode: number;
    public readonly endpoint: string;
    public readonly method: string;
    public readonly context?: any;
    constructor(
      message: string,
      statusCode = 500,
      endpoint = '',
      method = 'GET',
      context: any = {}
    ) {
      super(message);
      this.name = 'EnhancedApiError';
      this.statusCode = statusCode;
      this.endpoint = endpoint;
      this.method = method;
      this.context = context;
    }
  },
}));
vi.mock('../../src/objects/companies/index.js', () => ({
  getCompanyDetails: vi.fn(),
}));
vi.mock('../../src/objects/people/index.js', () => ({
  getPersonDetails: vi.fn(),
}));
vi.mock('../../src/objects/lists.js', () => ({ getListDetails: vi.fn() }));
vi.mock('../../src/objects/records/index.js', () => ({
  getObjectRecord: vi.fn(),
}));
vi.mock('../../src/objects/tasks.js', () => ({ getTask: vi.fn() }));
vi.mock('../../src/objects/notes.js', () => ({ getNote: vi.fn() }));
vi.mock('../../src/services/create/index.js', () => ({
  shouldUseMockData: vi.fn(),
}));
import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalRetrievalService } from '../../src/services/UniversalRetrievalService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../../src/types/attio.js';
import { enhancedPerformanceTracker } from '../../src/middleware/performance-enhanced.js';
import { CachingService } from '../../src/services/CachingService.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { getCompanyDetails } from '../../src/objects/companies/index.js';
import { getPersonDetails } from '../../src/objects/people/index.js';
import * as lists from '../../src/objects/lists.js';
import { getObjectRecord } from '../../src/objects/records/index.js';
import * as tasks from '../../src/objects/tasks.js';
import { shouldUseMockData } from '../../src/services/create/index.js';

describe('UniversalRetrievalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to using mock data for most tests (offline mode)
    vi.mocked(shouldUseMockData).mockReturnValue(true);
  });

  describe('getRecordDetails', () => {
    const mockRecord: AttioRecord = {
      id: { record_id: 'test_123' },
      values: { name: [{ value: 'Test Record' }] },
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
        title: 'Test List',
        description: 'Test description',
        object_slug: 'companies',
        api_slug: 'test-list',
        workspace_id: 'ws_123',
        workspace_member_access: 'read',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as any;
      vi.mocked(lists.getListDetails).mockResolvedValue(mockList);

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_789',
      });

      expect(lists.getListDetails).toHaveBeenCalledWith('list_789');
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
      // Ensure we use real task API, not mock data
      vi.mocked(shouldUseMockData).mockReturnValue(false);

      const mockTask: AttioTask = {
        id: { task_id: 'task_ghi' },
        content: 'Test Task',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as any;
      vi.mocked(tasks.getTask).mockResolvedValue(mockTask);
      vi.mocked(UniversalUtilityService.convertTaskToRecord).mockReturnValue(
        mockRecord
      );

      const result = await UniversalRetrievalService.getRecordDetails({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_ghi',
      });

      expect(tasks.getTask).toHaveBeenCalledWith('task_ghi');
      expect(UniversalUtilityService.convertTaskToRecord).toHaveBeenCalledWith(
        mockTask
      );
      expect(result).toEqual(mockRecord);
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
        values: { name: [{ value: 'Test Company' }] },
      } as any);

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
  });

  describe('getMultipleRecords', () => {
    it('should retrieve multiple records successfully', async () => {
      const record1: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: [{ value: 'Company 1' }] },
      } as any;
      const record2: AttioRecord = {
        id: { record_id: 'comp_456' },
        values: { name: [{ value: 'Company 2' }] },
      } as any;

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
        values: { name: [{ value: 'Company 1' }] },
      } as any;

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
        values: {
          name: [{ value: 'Company 1' }],
          domain: 'company1.com',
          employees: 10,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as any;

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
        values: { name: [{ value: 'Test Company' }] },
      } as any;

      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(getCompanyDetails).mockResolvedValue(mockRecord);

      const result = await UniversalRetrievalService.getRecordWithMetrics({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(result.record).toEqual(mockRecord);
      expect(result.metrics).toEqual(
        expect.objectContaining({
          duration: expect.any(Number),
          cached: false,
        })
      );
    });
  });
});

// local shim to satisfy import order (side-effect first)
export {};
