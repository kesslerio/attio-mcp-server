/**
 * Split: ErrorService.getOperationSuggestion tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ErrorService } from '../../src/services/ErrorService.js';

vi.mock('../../src/handlers/tool-configs/universal/field-mapper.js', () => ({
  validateResourceType: vi.fn(),
  getFieldSuggestions: vi.fn(),
}));
import {
  validateResourceType,
  getFieldSuggestions,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';

describe('ErrorService.getOperationSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateResourceType).mockReturnValue({
      valid: true,
      suggestion: undefined,
    } as any);
  });

  it('returns resource type suggestion for invalid resource', () => {
    vi.mocked(validateResourceType).mockReturnValue({
      valid: false,
      suggestion: 'Use "companies" instead of "company"',
    } as any);
      'create',
      'company',
      new Error('Invalid resource')
    );
    expect(result).toBe('Use "companies" instead of "company"');
  });

  it('provides date format suggestions', () => {
      'search',
      'companies',
      new Error('Unable to parse date format')
    );
    expect(result).toContain('relative dates like "last 7 days"');
    expect(result).toContain('ISO format (YYYY-MM-DD)');
  });

  it('provides date range suggestions', () => {
      'search',
      'people',
      new Error('Invalid daterange specified')
    );
    expect(result).toContain('Date ranges support formats like');
    expect(result).toContain('last 30 days');
  });

  it('suggests simpler filters for unsupported combinations', () => {
      'search',
      'tasks',
      new Error('Filter combination not supported')
    );
    expect(result).toContain('simpler filter');
  });

  it('suggests batch size limits', () => {
      'create',
      'companies',
      new Error('Batch operation exceeds limit')
    );
    expect(result).toContain('100 items at a time');
  });

  it('suggests rate limit handling', () => {
      'search',
      'people',
      new Error('Rate limit exceeded')
    );
    expect(result).toContain('wait a moment');
  });

  it('suggests field discovery for unknown attributes', () => {
    vi.mocked(getFieldSuggestions).mockReturnValue(
      'Try using "name" or "email"'
    );
      'create',
      'companies',
      new Error('Cannot find attribute with slug/id "unknown_field"')
    );
    expect(result).toBe('Try using "name" or "email"');
    expect(getFieldSuggestions).toHaveBeenCalledWith(
      'companies',
      'unknown_field'
    );
  });

  it('provides generic not found suggestions', () => {
      'get',
      'people',
      new Error('Record not found')
    );
    expect(result).toContain('Verify that the people record exists');
  });

  it('provides authentication suggestions for unauthorized errors', () => {
      'create',
      'tasks',
      new Error('Unauthorized access')
    );
    expect(result).toContain('API permissions');
  });

  it('provides duplicate record suggestions for create', () => {
      'create',
      'companies',
      new Error('Duplicate record found')
    );
    expect(result).toContain('may already exist');
  });

  it('provides uniqueness suggestions', () => {
      'create',
      'people',
      new Error('Uniqueness constraint violation')
    );
    expect(result).toContain('unique values already exists');
  });

  it('handles string errors', () => {
      'search',
      'companies',
      'Rate limit exceeded'
    );
    expect(result).toContain('wait a moment');
  });

  it('handles object errors with message property', () => {
      message: 'Invalid date format',
    } as any);
    expect(result).toContain('relative dates');
  });

  it('returns undefined for unknown patterns', () => {
      'create',
      'companies',
      new Error('Some completely unknown error')
    );
    expect(result).toBeUndefined();
  });
});
