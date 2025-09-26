/**
 * Tests for shared validation utilities
 * Covers the new shared-validators.ts module created in Phase 3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  withUniversalErrorHandling,
  validateUUIDWithError,
  validateUUIDForSearch,
  sanitizeToolParams,
  withSanitizedParams,
  createValidatedHandler,
  validateListId,
  validatePaginationParams,
} from '@handlers/tool-configs/universal/shared-validators.js';

// Mock dependencies
vi.mock('@utils/validation/uuid-validation.js', () => ({
  isValidUUID: vi.fn(),
}));

vi.mock('@services/ValidationService.js', () => ({
  ValidationService: {
    validateUUIDForSearch: vi.fn(),
    validatePaginationParameters: vi.fn(),
  },
}));

vi.mock('@services/ErrorService.js', () => ({
  ErrorService: {
    createUniversalError: vi.fn(),
  },
}));

vi.mock('@handlers/tool-configs/universal/schemas.js', () => ({
  validateUniversalToolParams: vi.fn(),
}));

import { isValidUUID } from '@utils/validation/uuid-validation.js';
import { ValidationService } from '@services/ValidationService.js';
import { ErrorService } from '@services/ErrorService.js';
import { validateUniversalToolParams } from '@handlers/tool-configs/universal/schemas.js';

describe('Shared Validators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withUniversalErrorHandling', () => {
    it('should execute handler successfully when no errors', async () => {
      const mockHandler = vi.fn().mockResolvedValue('success');
      const wrappedHandler = withUniversalErrorHandling(
        'test-operation',
        'test-resource',
        mockHandler
      );

      const result = await wrappedHandler('arg1', 'arg2');

      expect(result).toBe('success');
      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(ErrorService.createUniversalError).not.toHaveBeenCalled();
    });

    it('should wrap errors with ErrorService.createUniversalError', async () => {
      const originalError = new Error('Original error');
      const wrappedError = new Error('Wrapped error');
      const mockHandler = vi.fn().mockRejectedValue(originalError);

      vi.mocked(ErrorService.createUniversalError).mockReturnValue(
        wrappedError
      );

      const wrappedHandler = withUniversalErrorHandling(
        'test-operation',
        'test-resource',
        mockHandler
      );

      await expect(wrappedHandler('arg1')).rejects.toThrow('Wrapped error');
      expect(ErrorService.createUniversalError).toHaveBeenCalledWith(
        'test-operation',
        'test-resource',
        expect.objectContaining({
          message: 'Original error',
          name: 'Error',
          operation: 'test-operation',
          resourceType: 'test-resource',
        })
      );
    });
  });

  describe('validateUUIDWithError', () => {
    it('should return valid result for valid UUID', () => {
      vi.mocked(isValidUUID).mockReturnValue(true);

      const result = validateUUIDWithError(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      expect(result).toEqual({ isValid: true });
      expect(isValidUUID).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should return error result for invalid UUID', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);

      const result = validateUUIDWithError('invalid-uuid');

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid ID: must be a UUID. Got: invalid-uuid',
      });
    });

    it('should return error result for empty UUID', () => {
      const result = validateUUIDWithError('');

      expect(result).toEqual({
        isValid: false,
        error: 'ID is required',
      });
    });

    it('should use custom field name in error message', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);

      const result = validateUUIDWithError('invalid', 'company_id');

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid company_id: must be a UUID. Got: invalid',
      });
    });
  });

  describe('validateUUIDForSearch', () => {
    it('should delegate to ValidationService.validateUUIDForSearch', () => {
      vi.mocked(ValidationService.validateUUIDForSearch).mockReturnValue(true);

      const result = validateUUIDForSearch('test-uuid');

      expect(result).toBe(true);
      expect(ValidationService.validateUUIDForSearch).toHaveBeenCalledWith(
        'test-uuid'
      );
    });
  });

  describe('sanitizeToolParams', () => {
    it('should delegate to validateUniversalToolParams', () => {
      const mockParams = { key: 'value' };
      const mockSanitized = { sanitized: 'params' };

      vi.mocked(validateUniversalToolParams).mockReturnValue(mockSanitized);

      const result = sanitizeToolParams('test-tool', mockParams);

      expect(result).toBe(mockSanitized);
      expect(validateUniversalToolParams).toHaveBeenCalledWith(
        'test-tool',
        mockParams
      );
    });
  });

  describe('withSanitizedParams', () => {
    it('should sanitize params and call handler successfully', async () => {
      const mockParams = { key: 'value' };
      const mockSanitized = { sanitized: 'params' };
      const mockResult = 'handler-result';
      const mockHandler = vi.fn().mockResolvedValue(mockResult);

      vi.mocked(validateUniversalToolParams).mockReturnValue(mockSanitized);

      const wrappedHandler = withSanitizedParams(
        'test-tool',
        'test-operation',
        'test-resource',
        mockHandler
      );

      const result = await wrappedHandler(mockParams);

      expect(result).toBe(mockResult);
      expect(validateUniversalToolParams).toHaveBeenCalledWith(
        'test-tool',
        mockParams
      );
      expect(mockHandler).toHaveBeenCalledWith(mockSanitized);
    });

    it('should handle errors through error handling wrapper', async () => {
      const mockParams = { key: 'value' };
      const originalError = new Error('Handler error');
      const wrappedError = new Error('Wrapped error');
      const mockHandler = vi.fn().mockRejectedValue(originalError);

      vi.mocked(validateUniversalToolParams).mockReturnValue({});
      vi.mocked(ErrorService.createUniversalError).mockReturnValue(
        wrappedError
      );

      const wrappedHandler = withSanitizedParams(
        'test-tool',
        'test-operation',
        'test-resource',
        mockHandler
      );

      await expect(wrappedHandler(mockParams)).rejects.toThrow('Wrapped error');
      expect(ErrorService.createUniversalError).toHaveBeenCalledWith(
        'test-operation',
        'test-resource',
        expect.objectContaining({
          message: 'Handler error',
          name: 'Error',
          operation: 'test-operation',
          resourceType: 'test-resource',
        })
      );
    });
  });

  describe('validateListId', () => {
    it('should pass validation for valid list ID', () => {
      vi.mocked(isValidUUID).mockReturnValue(true);

      expect(() =>
        validateListId('550e8400-e29b-41d4-a716-446655440000')
      ).not.toThrow();
      expect(isValidUUID).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should throw error for invalid list ID', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);

      expect(() => validateListId('invalid-uuid')).toThrow(
        'Invalid list_id: must be a UUID. Got: invalid-uuid'
      );
    });

    it('should throw error for undefined list ID', () => {
      expect(() => validateListId(undefined)).toThrow(
        'List ID is required for operation'
      );
    });

    it('should use custom operation name in error message', () => {
      expect(() => validateListId(undefined, 'custom-operation')).toThrow(
        'List ID is required for custom-operation'
      );
    });
  });

  describe('validatePaginationParams', () => {
    it('should delegate to ValidationService.validatePaginationParameters', () => {
      const mockParams = { limit: 10, offset: 0 };
      const mockPerfId = 'perf-123';

      validatePaginationParams(mockParams, mockPerfId);

      expect(
        ValidationService.validatePaginationParameters
      ).toHaveBeenCalledWith(mockParams, mockPerfId);
    });

    it('should work without perfId parameter', () => {
      const mockParams = { limit: 20, offset: 10 };

      validatePaginationParams(mockParams);

      expect(
        ValidationService.validatePaginationParameters
      ).toHaveBeenCalledWith(mockParams, undefined);
    });
  });

  describe('createValidatedHandler', () => {
    it('should create a fully validated handler', async () => {
      const mockParams = { key: 'value' };
      const mockSanitized = { sanitized: 'params' };
      const mockResult = 'final-result';
      const mockHandler = vi.fn().mockResolvedValue(mockResult);

      vi.mocked(validateUniversalToolParams).mockReturnValue(mockSanitized);

      const validatedHandler = createValidatedHandler(
        {
          toolName: 'test-tool',
          operation: 'test-operation',
          resourceType: 'test-resource',
        },
        mockHandler
      );

      const result = await validatedHandler(mockParams);

      expect(result).toBe(mockResult);
      expect(validateUniversalToolParams).toHaveBeenCalledWith(
        'test-tool',
        mockParams
      );
      expect(mockHandler).toHaveBeenCalledWith(mockSanitized);
    });

    it('should handle UUID validation when requiresUUID option is provided', async () => {
      const mockParams = { key: 'value' };
      const mockSanitized = { sanitized: 'params' };
      const mockResult = 'final-result';
      const mockHandler = vi.fn().mockResolvedValue(mockResult);

      vi.mocked(validateUniversalToolParams).mockReturnValue(mockSanitized);
      vi.mocked(isValidUUID).mockReturnValue(true);

      const validatedHandler = createValidatedHandler(
        {
          toolName: 'test-tool',
          operation: 'test-operation',
          resourceType: 'test-resource',
          requiresUUID: {
            field: 'record_id',
            value: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
        mockHandler
      );

      const result = await validatedHandler(mockParams);

      expect(result).toBe(mockResult);
      expect(isValidUUID).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should handle pagination validation when pagination option is true', async () => {
      const mockParams = { limit: 10, offset: 0 };
      const mockSanitized = { limit: 10, offset: 0 };
      const mockResult = 'final-result';
      const mockHandler = vi.fn().mockResolvedValue(mockResult);

      vi.mocked(validateUniversalToolParams).mockReturnValue(mockSanitized);

      const validatedHandler = createValidatedHandler(
        {
          toolName: 'test-tool',
          operation: 'test-operation',
          resourceType: 'test-resource',
          pagination: true,
        },
        mockHandler
      );

      const result = await validatedHandler(mockParams);

      expect(result).toBe(mockResult);
      expect(
        ValidationService.validatePaginationParameters
      ).toHaveBeenCalledWith(mockSanitized, undefined);
    });
  });
});
