import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../../src/utils/logger.js', () => {
  const logger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  return {
    createScopedLogger: () => logger,
    CURRENT_LOG_LEVEL: 0,
    LogLevel: {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      NONE: 4,
    },
  };
});

import {
  sanitizeStringValue,
  sanitizeValue,
  sanitizeValidationMetadata,
  formatSanitizedActualValue,
  isPotentialPIIField,
} from '../../../../../src/handlers/tool-configs/universal/core/pii-sanitizer.js';

describe('pii-sanitizer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts email addresses from strings', () => {
    const sanitized = sanitizeStringValue('Contact john@example.com asap');
    expect(sanitized).toBe('Contact [EMAIL] asap');
  });

  it('detects potential PII fields by keyword', () => {
    expect(isPotentialPIIField('Email_Address')).toBe(true);
    expect(isPotentialPIIField('custom_notes')).toBe(false);
  });

  it('sanitizes nested objects and preserves non-PII fields', () => {
    const sanitized = sanitizeValue({
      email: 'john@example.com',
      profile: {
        phone_number: '+1 (555) 010-0101',
        notes: 'internal note',
      },
    });

    expect(sanitized).toEqual({
      email: '[REDACTED]',
      profile: {
        phone_number: '[REDACTED]',
        notes: 'internal note',
      },
    });
  });

  it('sanitizes validation metadata warnings and actual values', () => {
    const sanitized = sanitizeValidationMetadata({
      warnings: ['Email john@example.com is invalid'],
      suggestions: ['Use work email'],
      actualValues: {
        email: 'john@example.com',
        custom_field: 'keep me',
      },
    });

    expect(sanitized).toEqual({
      warnings: ['Email [EMAIL] is invalid'],
      suggestions: ['Use work email'],
      actualValues: {
        email: '[REDACTED]',
        custom_field: 'keep me',
      },
    });
  });

  it('formats sanitized actual values to strings', () => {
    const formatted = formatSanitizedActualValue([{ value: 'example.com' }]);

    expect(formatted).toBe('example.com');
  });
});
