/**
 * Split: ErrorService core behaviors
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ErrorService } from '../../src/services/ErrorService.js';

import { ErrorService } from '../../src/services/ErrorService.js';

describe('ErrorService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should classify 4xx as user errors', () => {
    const e: unknown = new Error('Bad');
    e.status = 400;
    expect(res.message).toContain(
      'Universal test failed for resource type companies'
    );
  });

  it('should classify 5xx as system errors', () => {
    const e: unknown = new Error('Oops');
    e.status = 503;
    expect(res.message).toContain(
      'Universal test failed for resource type companies'
    );
  });
});
