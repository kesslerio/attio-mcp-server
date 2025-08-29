/**
 * Split: ErrorService core behaviors
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../../src/errors/enhanced-api-errors.js', () => ({
  ErrorEnhancer: {
    autoEnhance: vi.fn((e: any) => e),
    getErrorMessage: vi.fn((e: any) => e?.message || String(e)),
  },
  EnhancedApiError: class EnhancedApiError extends Error {
    statusCode: number;
    constructor(m: string, s = 500) {
      super(m);
      this.name = 'EnhancedApiError';
      this.statusCode = s;
    }
  },
}));

import { ErrorService } from '../../src/services/ErrorService.js';

describe('ErrorService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should classify 4xx as user errors', () => {
    const e: any = new Error('Bad');
    e.status = 400;
    const res = ErrorService.createUniversalError('test', 'companies', e);
    expect(res.message).toContain(
      'Universal test failed for resource type companies'
    );
  });

  it('should classify 5xx as system errors', () => {
    const e: any = new Error('Oops');
    e.status = 503;
    const res = ErrorService.createUniversalError('test', 'companies', e);
    expect(res.message).toContain(
      'Universal test failed for resource type companies'
    );
  });
});
