/**
 * Tests for data normalizer validation logic - Issue #895
 */
import { describe, test, expect } from 'vitest';
import { normalizePersonValues } from '@services/create/data-normalizers';

describe('normalizePersonValues - Issue #895 Validation', () => {
  test('should throw error when both name and email are missing', () => {
    const input = { job_title: 'Software Engineer' };

    expect(() => normalizePersonValues(input)).toThrow(
      'missing required parameter: name (cannot be derived from email_addresses when email is also missing)'
    );
  });

  test('should throw error when empty object is provided', () => {
    const input = {};

    expect(() => normalizePersonValues(input)).toThrow(
      'missing required parameter: name (cannot be derived from email_addresses when email is also missing)'
    );
  });

  test('should derive name from email when name is missing but email exists', () => {
    const input = { email_addresses: ['john.doe@example.com'] };

    const result = normalizePersonValues(input);

    expect(result.name).toEqual([
      expect.objectContaining({
        first_name: 'john',
        last_name: 'doe',
        full_name: 'john doe',
      }),
    ]);
  });

  test('should not throw when name is provided without email', () => {
    const input = { name: 'Jane Smith' };

    expect(() => normalizePersonValues(input)).not.toThrow();

    const result = normalizePersonValues(input);
    expect(result.name).toBeDefined();
    expect(result.email_addresses).toBeUndefined();
  });

  test('should accept name with email addresses', () => {
    const input = {
      name: 'Bob Wilson',
      email_addresses: ['bob@example.com'],
    };

    expect(() => normalizePersonValues(input)).not.toThrow();

    const result = normalizePersonValues(input);
    expect(result.name).toBeDefined();
    expect(result.email_addresses).toEqual(['bob@example.com']);
  });
});
