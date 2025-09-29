import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'node:perf_hooks';
import {
  createScopedLogger,
  SecureLogger,
  safeMcpLog,
  OperationType,
} from '@/utils/logger.js';
import {
  maskIdentifier,
  sanitizeErrorDetail,
  sanitizeLogMessage,
  sanitizeLogPayload,
} from '@/utils/log-sanitizer.js';

describe('SecureLogger', () => {
  beforeEach(() => {
    process.env.LOG_FORMAT = 'json';
  });

  afterEach(() => {
    delete process.env.LOG_FORMAT;
  });

  it('returns a SecureLogger instance from createScopedLogger', () => {
    const logger = createScopedLogger('secure-test');
    expect(logger).toBeInstanceOf(SecureLogger);
  });

  it('sanitizes sensitive structured data before logging', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createScopedLogger(
      'secure-test',
      'login',
      OperationType.API_CALL
    );

    logger.info('User login', {
      email: 'jane@example.com',
      token: 'secret_key_test_value_for_sanitization',
      session_id: '1234567890abcdef',
      profile: {
        phone: '+1 (555) 000-1111',
      },
    });

    expect(spy).toHaveBeenCalled();
    const [payload] = spy.mock.calls.at(-1) ?? [];
    expect(typeof payload).toBe('string');
    const parsed = JSON.parse(payload as string);

    expect(parsed.message).toBe('User login');
    expect(parsed.metadata.module).toBe('secure-test');
    expect(parsed.data.email).toBe('[EMAIL_REDACTED]');
    expect(parsed.data.token).toBe('[TOKEN_REDACTED]');
    expect(parsed.data.session_id).toMatch(/…/);
    expect(parsed.data.profile.phone).toBe('[PHONE_REDACTED]');

    spy.mockRestore();
  });

  it('sanitizes error messages and details', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createScopedLogger('secure-test');
    const error = new Error('Token leaked: abcdefghijklmnopqrstuvwxyz012345');
    (error as Error & { code?: string }).code = 'E_TOKEN';

    logger.error('Operation failed', error, {
      authorization: 'Bearer abcdefghijklmnopqrstuvwxyz0123456789',
    });

    const [payload] = spy.mock.calls.at(-1) ?? [];
    const parsed = JSON.parse(payload as string);
    expect(parsed.error.message).not.toContain(
      'abcdefghijklmnopqrstuvwxyz012345'
    );
    expect(parsed.error.code).toBe('E_TOKEN');
    expect(parsed.data.authorization).toBe('Bearer [TOKEN_REDACTED]');

    spy.mockRestore();
  });

  it('tracks operations with sanitized lifecycle helpers', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = createScopedLogger(
      'secure-test',
      'batch-run',
      OperationType.API_CALL
    );

    const timer = logger.operationStart(
      'fetch-records',
      OperationType.API_CALL,
      {
        authorization: 'Bearer secret-token',
      }
    );
    const duration = timer.end('completed', { count: 2 });

    logger.operationSuccess(
      'fetch-records',
      { count: 2 },
      OperationType.API_CALL,
      duration
    );
    logger.operationFailure(
      'fetch-records',
      new Error('User email leak: admin@example.com'),
      { email: 'admin@example.com' },
      OperationType.API_CALL,
      duration
    );
    logger.warn('Sensitive debug', { password: 'hunter2' });

    expect(errorSpy).toHaveBeenCalled();
    const failurePayload = JSON.parse(
      errorSpy.mock.calls.at(-1)?.[0] as string
    );
    expect(failurePayload.error.message).not.toContain('admin@example.com');
    expect(failurePayload.data.email).toBe('[EMAIL_REDACTED]');

    expect(warnSpy).toHaveBeenCalled();
    const warnPayload = JSON.parse(warnSpy.mock.calls.at(-1)?.[0] as string);
    expect(warnPayload.data.password).toBe('[REDACTED]');

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('keeps log serialization performant', () => {
    const payload = {
      id: '1234567890abcdef',
      nested: Array.from({ length: 10 }, (_, idx) => ({
        token: `token-${idx}-${'x'.repeat(24)}`,
        profile: {
          email: `user${idx}@example.com`,
          phone: '+15550001111',
        },
      })),
    };

    const iterations = 200;
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      sanitizeLogPayload(payload);
    }
    const average = (performance.now() - start) / iterations;

    expect(average).toBeLessThan(5);
  });

  it('sanitizes console safe logs', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    safeMcpLog('Bearer secret', { apiKey: 'abc1234567890abcdef123456' });
    const [payload, data] = spy.mock.calls.at(-1) ?? [];
    expect(payload).toBe('[MCP_SAFE_LOG] Bearer [TOKEN_REDACTED]');
    expect((data as { apiKey: string }).apiKey).toBe('[TOKEN_REDACTED]');
    spy.mockRestore();
  });
});

describe('Log sanitizer utilities', () => {
  it('masks identifiers consistently', () => {
    expect(maskIdentifier('1234567890')).toBe('1234…7890');
    expect(maskIdentifier('abcd')).toBe('[ID_REDACTED]');
  });

  it('handles circular references safely', () => {
    const payload: { token: string; self?: unknown } = {
      token: 'token-value-abcdefghijklmnop',
    };
    payload.self = payload;
    const sanitized = sanitizeLogPayload(payload) as {
      token: string;
      self: unknown;
    };
    expect(sanitized.token).toBe('[TOKEN_REDACTED]');
    expect(sanitized.self).toBeDefined();
  });

  it('sanitizes arbitrary error objects', () => {
    const detail = sanitizeErrorDetail({
      message: 'apiKey=abcd1234',
      email: 'example@example.com',
    });
    expect(detail?.message).not.toContain('abcd1234');
    expect(detail?.details?.email).toBe('[EMAIL_REDACTED]');
  });

  it('redacts sensitive text in messages', () => {
    const sanitized = sanitizeLogMessage(
      'Bearer abcdefghijklmnopqrstuvwxyz0123'
    );
    expect(sanitized).toBe('Bearer [TOKEN_REDACTED]');
  });
});
