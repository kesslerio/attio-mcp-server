/**
 * Split: ErrorService edge cases
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { ErrorService } from '../../src/services/ErrorService.js';
import { UniversalValidationError } from '../../src/handlers/tool-configs/universal/schemas.js';

describe('ErrorService Edge Cases', () => {
  beforeEach(() => {});

  it('handles null and undefined errors gracefully', () => {
    expect(() => {
      ErrorService.createUniversalError('create', 'companies', null as any);
      ErrorService.createUniversalError(
        'create',
        'companies',
        undefined as any
      );
    }).not.toThrow();
  });

  it('handles empty error messages', () => {
      'create',
      'companies',
      new Error('')
    );
    expect(result).toBeUndefined();
  });

  it('handles malformed error objects', () => {
    const malformed: unknown = { notMessage: 'test', randomField: 123 };
      'create',
      'companies',
      malformed
    );
    expect(result).toBeInstanceOf(UniversalValidationError);
    expect(result.message).toContain('Unknown error');
  });
});
