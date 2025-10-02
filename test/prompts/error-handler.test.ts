import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createErrorResult } from '../../src/prompts/error-handler';

describe('prompts/error-handler', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('omits stack traces from serialized error responses', () => {
    const internalError = new Error('Internal failure');
    internalError.stack = 'Sensitive stack trace that must stay internal';

    const clientError = new Error('Safe message');
    const result = createErrorResult(clientError, 'Safe message', 500, {
      logError: internalError,
    });

    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('Sensitive stack trace');
    expect(result.error.details).toBeDefined();
    const requestId = result.error.details?.requestId;
    expect(typeof requestId).toBe('string');
    if (typeof requestId === 'string') {
      expect(requestId).toHaveLength(36);
    }
    expect(result.error.message).toBe('Safe message');
  });
});
