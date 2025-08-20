/**
 * Unit Tests for Email Object Format Fix
 *
 * Verifies the fix for "[object object]" email validation errors
 * Issue #518: Resolve dotenv banner contamination for MCP protocol compliance
 */

import { describe, it, expect } from 'vitest';
import { PeopleDataNormalizer } from '../../src/utils/normalization/people-normalization.js';
import { ValidationService } from '../../src/services/ValidationService.js';
import { InputSanitizer } from '../../src/handlers/tool-configs/universal/schemas.js';

describe('Email Object Format Fix - Issue #518', () => {
  describe('InputSanitizer fix', () => {
    it('should not convert email_addresses arrays to "[object object]" strings', () => {
      const input = {
        name: 'Test User',
        email_addresses: [{ email_address: 'test@example.com' }],
      };

      const sanitized = InputSanitizer.sanitizeObject(input);

      expect(sanitized).toEqual({
        name: 'Test User',
        email_addresses: [{ email_address: 'test@example.com' }],
      });

      // Verify it's NOT the buggy "[object object]" string
      expect(sanitized.email_addresses).not.toBe('[object object]');
      expect(Array.isArray(sanitized.email_addresses)).toBe(true);
    });

    it('should still normalize string email fields', () => {
      const input = {
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM', // String field should still be normalized
      };

      const sanitized = InputSanitizer.sanitizeObject(input);

      expect(sanitized).toEqual({
        name: 'Test User',
        email: 'test@example.com', // Should be lowercased
      });
    });
  });

  describe('PeopleDataNormalizer email object formats', () => {
    it('should handle {email_address: "..."} format in arrays', () => {
      const input = {
        name: 'Test User',
        email_addresses: [{ email_address: 'test@example.com' }],
      };

      const normalized = PeopleDataNormalizer.normalizePeopleData(input);

      expect(normalized.email_addresses).toEqual([
        { email_address: 'test@example.com' },
      ]);
    });

    it('should handle {value: "..."} format in arrays', () => {
      const input = {
        name: 'Test User',
        email_addresses: [{ value: 'test@example.com' }],
      };

      const normalized = PeopleDataNormalizer.normalizePeopleData(input);

      expect(normalized.email_addresses).toEqual([
        { email_address: 'test@example.com' },
      ]);
    });

    it('should handle {email: "..."} format in arrays', () => {
      const input = {
        name: 'Test User',
        email_addresses: [{ email: 'test@example.com' }],
      };

      const normalized = PeopleDataNormalizer.normalizePeopleData(input);

      expect(normalized.email_addresses).toEqual([
        { email_address: 'test@example.com' },
      ]);
    });

    it('should preserve email_type and type fields from objects', () => {
      const input = {
        name: 'Test User',
        email_addresses: [
          { email_address: 'work@example.com', email_type: 'work' },
          { value: 'personal@example.com', type: 'personal' },
        ],
      };

      const normalized = PeopleDataNormalizer.normalizePeopleData(input);

      expect(normalized.email_addresses).toEqual([
        { email_address: 'work@example.com', email_type: 'work' },
        { email_address: 'personal@example.com', email_type: 'personal' },
      ]);
    });
  });

  describe('Full validation pipeline', () => {
    it('should complete full pipeline without "[object object]" errors', () => {
      const testCases = [
        { email_addresses: ['test@example.com'] },
        { email_addresses: [{ email_address: 'test@example.com' }] },
        { email_addresses: [{ value: 'test@example.com' }] },
        { email_addresses: [{ email: 'test@example.com' }] },
      ];

      for (const testCase of testCases) {
        expect(() => {
          const normalized = PeopleDataNormalizer.normalizePeopleData(testCase);
          ValidationService.validateEmailAddresses(normalized);
        }).not.toThrow();
      }
    });

    it('should still validate and reject invalid emails properly', () => {
      const input = {
        name: 'Test User',
        email_addresses: [{ email_address: 'invalid-email' }],
      };

      expect(() => {
        const normalized = PeopleDataNormalizer.normalizePeopleData(input);
        ValidationService.validateEmailAddresses(normalized);
      }).toThrow('Invalid email format: "invalid-email"');
    });
  });

  describe('Regression prevention', () => {
    it('should maintain backward compatibility with string arrays', () => {
      const input = {
        name: 'Test User',
        email_addresses: ['test@example.com', 'work@example.com'],
      };

      const normalized = PeopleDataNormalizer.normalizePeopleData(input);

      expect(normalized.email_addresses).toEqual([
        { email_address: 'test@example.com' },
        { email_address: 'work@example.com' },
      ]);

      expect(() => {
        ValidationService.validateEmailAddresses(normalized);
      }).not.toThrow();
    });

    it('should handle mixed formats in the same array', () => {
      const input = {
        name: 'Test User',
        email_addresses: [
          'string@example.com',
          { email_address: 'object@example.com' },
          { value: 'value@example.com' },
        ],
      };

      const normalized = PeopleDataNormalizer.normalizePeopleData(input);

      expect(normalized.email_addresses).toEqual([
        { email_address: 'string@example.com' },
        { email_address: 'object@example.com' },
        { email_address: 'value@example.com' },
      ]);

      expect(() => {
        ValidationService.validateEmailAddresses(normalized);
      }).not.toThrow();
    });
  });
});
