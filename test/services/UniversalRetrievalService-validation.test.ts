/**
 * Split: UniversalRetrievalService validation & error handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Inline mocks matching this file's specifiers
vi.mock('../../src/services/CachingService.js', () => ({
  CachingService: { isCached404: vi.fn(), cache404Response: vi.fn() },
}));
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: { validateUUID: vi.fn() },
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
vi.mock('../../src/services/create/index.js', () => ({
  shouldUseMockData: vi.fn(() => false),
}));
vi.mock('../../src/utils/validation/uuid-validation.js', () => ({
  isValidUUID: vi.fn(() => true),
  createRecordNotFoundError: vi.fn(
    () =>
      new (class EnhancedApiError extends Error {
        statusCode = 404;
        constructor() {
          super('Record not found');
          this.name = 'EnhancedApiError';
        }
      })()
  ),
}));
vi.mock('../../src/errors/enhanced-api-errors.js', () => ({
  ErrorEnhancer: {
    autoEnhance: (e: any) => e,
    getErrorMessage: (e: any) => (e && e.message) || String(e),
  },
  EnhancedApiError: class EnhancedApiError extends Error {
    statusCode: number;
    endpoint: string;
    method: string;
    constructor(
      message: string,
      statusCode = 500,
      endpoint = '/test',
      method = 'GET',
      context?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'EnhancedApiError';
      this.statusCode = statusCode;
      this.endpoint = endpoint;
      this.method = method;
      if (context) {
        Object.assign(this, context);
      }
    }
  },
}));
vi.mock('../../src/objects/companies/index.js', () => ({
  getCompanyDetails: vi.fn(),
}));
vi.mock('@/objects/lists.js', () => ({ getListDetails: vi.fn() }));
vi.mock('../../src/objects/tasks.js', () => ({ getTask: vi.fn() }));
vi.mock('../../src/objects/notes.js', () => ({ getNote: vi.fn() }));
import { UniversalRetrievalService } from '../../src/services/UniversalRetrievalService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { EnhancedApiError } from '../../src/errors/enhanced-api-errors.js';
import { CachingService } from '../../src/services/CachingService.js';
import { shouldUseMockData } from '../../src/services/create/index.js';
import { createRecordNotFoundError } from '../../src/utils/validation/uuid-validation.js';
import { enhancedPerformanceTracker } from '../../src/middleware/performance-enhanced.js';
import { getCompanyDetails } from '../../src/objects/companies/index.js';
import * as tasks from '../../src/objects/tasks.js';
import * as lists from '@/objects/lists.js';
import * as companies from '../../src/objects/companies/index.js';
import * as notes from '../../src/objects/notes.js';

describe('UniversalRetrievalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to real API for error handling tests (they expect functions to throw)
    vi.mocked(shouldUseMockData).mockReturnValue(false);
  });

  describe('getRecordDetails - error cases', () => {
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
        new EnhancedApiError('Record not found', 404, '/records/test', 'GET', {
          resourceType: 'record',
        })
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
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      const notFoundError = {
        response: { status: 404 },
        message: 'Company not found',
      } as any;
      vi.mocked(getCompanyDetails).mockRejectedValue(notFoundError);
      vi.mocked(createRecordNotFoundError).mockReturnValue(
        new EnhancedApiError('Record not found', 404, '/records/test', 'GET', {
          resourceType: 'record',
        })
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
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      const taskError = new Error('Task not found');
      vi.mocked(tasks.getTask).mockRejectedValue(taskError);
      vi.mocked(createRecordNotFoundError).mockReturnValue(
        new EnhancedApiError('Record not found', 404, '/records/test', 'GET', {
          resourceType: 'record',
        })
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
  });

  describe('Auth Error Handling', () => {
    it('should re-throw auth errors without caching', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(lists.getListDetails).mockRejectedValue(
        new EnhancedApiError('Unauthorized', 401, '/lists/123', 'GET', {
          httpStatus: 401,
          resourceType: 'lists',
        })
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: '12345678-1234-4000-a000-123456789012',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 401,
        message: expect.stringMatching(/unauthorized|invalid api key/i),
      });

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limit Error Handling', () => {
    it('should re-throw rate limit errors without caching', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(tasks.getTask).mockRejectedValue(
        new EnhancedApiError('Too many requests', 429, '/tasks/111', 'GET', {
          httpStatus: 429,
          resourceType: 'tasks',
        })
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.TASKS,
          record_id: '11111111-1111-4000-a000-111111111111',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 429,
        message: expect.stringMatching(/rate.{0,10}limit|too many requests/i),
      });

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });
  });

  describe('Legitimate 404 Error Handling', () => {
    it('should cache legitimate 404 errors and convert to structured response', async () => {
      vi.mocked(notes.getNote).mockRejectedValue(
        new EnhancedApiError('Note not found', 404, '/notes/222', 'GET', {
          httpStatus: 404,
          resourceType: 'notes',
        })
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.NOTES,
          record_id: '22222222-2222-4000-a000-222222222222',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 404,
        message: expect.stringMatching(/note.*not found/i),
      });

      expect(CachingService.cache404Response).toHaveBeenCalledWith(
        'notes',
        '22222222-2222-4000-a000-222222222222'
      );
    });
  });

  describe('Non-HTTP Error Handling', () => {
    it('should handle TypeError exceptions without masking as 404', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      const typeError = new TypeError('Cannot read properties of null');
      vi.mocked(companies.getCompanyDetails).mockRejectedValue(typeError);

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: '33333333-3333-4000-a000-333333333333',
        })
      ).rejects.toThrow('Cannot read properties of null');

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });
  });
});
