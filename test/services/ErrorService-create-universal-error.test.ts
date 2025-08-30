/**
 * Split: ErrorService.createUniversalError tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EnhancedApiError } from '../../src/errors/enhanced-api-errors.js';
import { ErrorService } from '../../src/services/ErrorService.js';
import { validateResourceType } from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { validateResourceType } from '../../src/handlers/tool-configs/universal/field-mapper.js';

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
      'Test error',
      ErrorType.USER_ERROR
    );
      'create',
      'companies',
      original
    );
    expect(result).toBe(original);
  });

  it('passes through EnhancedApiError unchanged', () => {
      'Test error',
      400,
      '/api/test',
      'GET'
    );
      'update',
      'people',
      original
    );
    expect(result).toBe(original);
  });

  it('extracts message from Error objects', () => {
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
    const original: unknown = { message: 'Object error message', status: 400 };
      'delete',
      'deals',
      original
    ) as UniversalValidationError;
    expect(result).toBeInstanceOf(UniversalValidationError);
    expect(result.message).toContain('Object error message');
  });

  it('handles string errors', () => {
      'create',
      'companies',
      'String error message'
    ) as UniversalValidationError;
    expect(result).toBeInstanceOf(UniversalValidationError);
    expect(result.message).toContain('String error message');
  });

  it('handles unknown error types', () => {
      'update',
      'people',
      12345 as any
    ) as UniversalValidationError;
    expect(result).toBeInstanceOf(UniversalValidationError);
    expect(result.message).toContain('Unknown error');
  });

  it('classifies USER_ERROR for not found messages', () => {
      'get',
      'records',
      new Error('Record not found')
    ) as UniversalValidationError;
    expect(result.errorType).toBe(ErrorType.USER_ERROR);
  });

  it('defaults to SYSTEM_ERROR for unclassified errors', () => {
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
      'create',
      'companies',
      new Error('Rate limit exceeded')
    ) as UniversalValidationError;
    expect(result.suggestion).toBeDefined();
    expect(result.suggestion).toContain('wait a moment');
  });

  it('includes original error as cause', () => {
      'update',
      'people',
      original
    ) as UniversalValidationError;
    expect(result.cause).toBe(original);
  });
});
