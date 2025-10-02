/**
 * Split: ErrorService.createUniversalError tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorService } from '../../src/services/ErrorService.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../src/handlers/tool-configs/universal/schemas.js';
import { EnhancedApiError } from '../../src/errors/enhanced-api-errors.js';

vi.mock('../../src/handlers/tool-configs/universal/field-mapper.js', () => ({
  validateResourceType: vi.fn(),
  getFieldSuggestions: vi.fn(),
}));
import { validateResourceType } from '../../src/handlers/tool-configs/universal/field-mapper.js';

describe('ErrorService.createUniversalError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateResourceType).mockReturnValue({
      valid: true,
      suggestion: undefined,
    } as any);
  });

  it('passes through UniversalValidationError unchanged', () => {
    const original = new UniversalValidationError(
      'Test error',
      ErrorType.USER_ERROR
    );
    const result = ErrorService.createUniversalError(
      'create',
      'companies',
      original
    );
    expect(result).toBe(original);
  });

  it('passes through EnhancedApiError unchanged', () => {
    const original = new EnhancedApiError(
      'Test error',
      400,
      '/api/test',
      'GET'
    );
    const result = ErrorService.createUniversalError(
      'update',
      'people',
      original
    );
    expect(result).toBe(original);
  });

  it('preserves enhanced context field type metadata', () => {
    const original = new EnhancedApiError(
      'Invalid status value',
      400,
      '/api/test',
      'POST',
      {
        field: 'status',
        fieldType: 'select',
        validValues: ['new', 'active'],
      }
    );

    const result = ErrorService.createUniversalError(
      'update',
      'people',
      original
    ) as EnhancedApiError;

    expect(result).toBe(original);
    expect(result.context?.fieldType).toBe('select');
    expect(result.getContextualMessage()).toContain("type 'select'");
  });

  it('extracts message from Error objects', () => {
    const original = new Error('Test error message');
    const result = ErrorService.createUniversalError(
      'search',
      'tasks',
      original
    ) as UniversalValidationError;
    expect(result).toBeInstanceOf(UniversalValidationError);
    expect(result.message).toContain('Test error message');
    expect(result.message).toContain(
      'Universal search failed for resource type tasks'
    );
  });

  it('extracts message from objects with message property', () => {
    const original: any = { message: 'Object error message', status: 400 };
    const result = ErrorService.createUniversalError(
      'delete',
      'deals',
      original
    ) as UniversalValidationError;
    expect(result).toBeInstanceOf(UniversalValidationError);
    expect(result.message).toContain('Object error message');
  });

  it('handles string errors', () => {
    const result = ErrorService.createUniversalError(
      'create',
      'companies',
      'String error message'
    ) as UniversalValidationError;
    expect(result).toBeInstanceOf(UniversalValidationError);
    expect(result.message).toContain('String error message');
  });

  it('handles unknown error types', () => {
    const result = ErrorService.createUniversalError(
      'update',
      'people',
      12345 as any
    ) as UniversalValidationError;
    expect(result).toBeInstanceOf(UniversalValidationError);
    expect(result.message).toContain('Unknown error');
  });

  it('classifies USER_ERROR for not found messages', () => {
    const result = ErrorService.createUniversalError(
      'get',
      'records',
      new Error('Record not found')
    ) as UniversalValidationError;
    expect(result.errorType).toBe(ErrorType.USER_ERROR);
  });

  it('defaults to SYSTEM_ERROR for unclassified errors', () => {
    const result = ErrorService.createUniversalError(
      'create',
      'tasks',
      new Error('Some random error')
    ) as UniversalValidationError;
    expect(result.errorType).toBe(ErrorType.SYSTEM_ERROR);
  });

  it('includes operation suggestion in error details', () => {
    vi.mocked(validateResourceType).mockReturnValue({
      valid: true,
      suggestion: undefined,
    } as any);
    const result = ErrorService.createUniversalError(
      'create',
      'companies',
      new Error('Rate limit exceeded')
    ) as UniversalValidationError;
    expect(result.suggestion).toBeDefined();
    expect(result.suggestion).toContain('wait a moment');
  });

  it('includes original error as cause', () => {
    const original = new Error('Original error');
    const result = ErrorService.createUniversalError(
      'update',
      'people',
      original
    ) as UniversalValidationError;
    expect(result.cause).toBe(original);
  });

  describe('fromAxios', () => {
    it('preserves field type metadata within validation errors', () => {
      const mapped = ErrorService.fromAxios({
        response: {
          status: 400,
          data: {
            message: 'Invalid status value',
            validation_errors: [
              {
                field: 'status',
                message: 'Invalid option provided',
                field_type: 'select',
              },
            ],
          },
        },
      } as any);

      expect(mapped.details?.validation_errors?.[0]?.fieldType).toBe('select');
      expect(mapped.message).toContain('type: select');
    });

    it('preserves field metadata when creating enhanced errors', () => {
      const fieldMetadata = {
        slug: 'priority',
        type: 'select',
        options: ['low', 'medium', 'high'],
      };

      const original = new EnhancedApiError(
        'Invalid priority value',
        400,
        '/api/test',
        'POST',
        {
          field: 'priority',
          fieldType: 'select',
          fieldMetadata,
        }
      );

      const result = ErrorService.createUniversalError(
        'update',
        'tasks',
        original
      ) as EnhancedApiError;

      expect(result.context?.fieldMetadata).toBe(fieldMetadata);
      expect(result.context?.fieldType).toBe('select');
    });
  });
});
