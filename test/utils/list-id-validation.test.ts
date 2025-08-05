/**
 * Tests for list ID validation to prevent injection attacks
 */
import { isValidId, isValidListId } from '../../src/utils/validation';

describe('List ID Validation', () => {
  describe('isValidListId', () => {
    it('should accept valid list IDs', () => {
      const validListIds = [
        'list_abc123',
        'list_xyz789',
        'list_valid123',
        'list_users',
        'list_a1b2c3',
      ];

      validListIds.forEach((id) => {
        expect(isValidListId(id)).toBe(true);
      });
    });

    it('should reject malformed list IDs', () => {
      const invalidListIds = [
        '', // empty string
        'list', // missing underscore and ID part
        'list_', // missing ID part
        '_abc123', // missing list prefix
        'list abc123', // contains space
        'list-abc123', // uses hyphen instead of underscore
        'LIST_abc123', // uppercase prefix
      ];

      invalidListIds.forEach((id) => {
        expect(isValidListId(id)).toBe(false);
      });
    });

    it('should reject list IDs with potential injection characters', () => {
      const dangerousListIds = [
        'list_123"', // double quote
        "list_123'", // single quote
        'list_123;', // semicolon
        'list_123--', // SQL comment
        'list_123/*comment*/', // SQL block comment
        'list_123\n', // newline
        'list_123\r', // carriage return
        'list_123\\0', // null byte
        'list_123\\b', // backspace
        'list_123${var}', // template literal injection
        'list_123<script>', // XSS attempt
        'list_123../../etc', // path traversal
        'list_123||cmd', // command injection
        'list_123&&#', // HTML entities
        'list_123=1', // equal sign (potential for parameter pollution)
      ];

      dangerousListIds.forEach((id) => {
        expect(isValidListId(id)).toBe(false);
        expect(isValidListId(id)).toBe(false);
      });
    });

    it('should reject excessively long list IDs', () => {
      // Create a list ID that's too long (over 50 chars)
      const tooLongId = 'list_' + 'a'.repeat(50);
      expect(isValidListId(tooLongId)).toBe(false);
    });
  });

  describe('isValidId', () => {
    it('should accept valid generic IDs', () => {
      const validIds = [
        'abc123',
        'user_123',
        'company-xyz',
        'record_123_456',
        'a1b2c3',
      ];

      validIds.forEach((id) => {
        expect(isValidId(id)).toBe(true);
      });
    });

    it('should reject malformed generic IDs', () => {
      const invalidIds = [
        '', // empty string
        'a', // too short
        'ab', // too short
        'user 123', // contains space
        'user.123', // contains period
        '123#abc', // contains hash
      ];

      invalidIds.forEach((id) => {
        expect(isValidId(id)).toBe(false);
      });
    });

    it('should reject generic IDs with potential injection characters', () => {
      const dangerousIds = [
        'id"123', // double quote
        "id'123", // single quote
        'id;123', // semicolon
        'id--123', // SQL comment
        'id/*123*/', // SQL block comment
        'id\n123', // newline
        'id\r123', // carriage return
        'id\\0123', // null byte
        'id${var}', // template literal injection
        'id<script>', // XSS attempt
        'id../../etc', // path traversal
        'id||cmd', // command injection
      ];

      dangerousIds.forEach((id) => {
        expect(isValidId(id)).toBe(false);
      });
    });

    it('should reject excessively long generic IDs', () => {
      // Create an ID that's too long (over 100 chars)
      const tooLongId = 'a'.repeat(101);
      expect(isValidId(tooLongId)).toBe(false);
    });
  });
});
