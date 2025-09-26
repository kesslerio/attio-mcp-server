/**
 * Email Strategies Error Handling Tests
 * Tests strategy conversion failures and graceful degradation
 */

import { describe, test, expect } from 'vitest';
import {
  EmailRetryManager,
  StringEmailStrategy,
  ObjectEmailStrategy,
} from '../../../../src/services/create/creators/email-strategies.js';

describe('Email Strategies Error Handling', () => {
  describe('StringEmailStrategy', () => {
    test('should handle empty email arrays gracefully', () => {
      const strategy = new StringEmailStrategy();

      expect(strategy.canHandle([])).toBe(false);
      expect(() => strategy.convertToAlternativeFormat([])).not.toThrow();
    });

    test('should handle malformed email data', () => {
      const strategy = new StringEmailStrategy();
      const malformedEmails = [null, undefined, 123, {}];

      expect(strategy.canHandle(malformedEmails)).toBe(false);
    });

    test('should handle mixed data types in email array', () => {
      const strategy = new StringEmailStrategy();
      const mixedEmails = ['valid@email.com', null, 123, 'another@email.com'];

      expect(strategy.canHandle(mixedEmails)).toBe(true);
      // Should still convert despite mixed types
      expect(() =>
        strategy.convertToAlternativeFormat(mixedEmails)
      ).not.toThrow();
    });
  });

  describe('ObjectEmailStrategy', () => {
    test('should handle missing email_address field', () => {
      const strategy = new ObjectEmailStrategy();
      const invalidObjects = [{ name: 'test' }, { id: 123 }];

      expect(strategy.canHandle(invalidObjects)).toBe(false);
    });

    test('should handle array type validation correctly', () => {
      const strategy = new ObjectEmailStrategy();

      // Should reject array inputs that aren't actual arrays
      expect(strategy.canHandle('not-an-array' as any)).toBe(false);
      expect(strategy.canHandle(null as any)).toBe(false);
      expect(strategy.canHandle(undefined as any)).toBe(false);
    });

    test('should handle nested array as first element', () => {
      const strategy = new ObjectEmailStrategy();
      const nestedArrays = [[]];

      expect(strategy.canHandle(nestedArrays)).toBe(false);
    });
  });

  describe('EmailRetryManager', () => {
    test('should handle conversion failures gracefully', () => {
      const manager = new EmailRetryManager();
      const personData = {
        email_addresses: [{ malformed: 'data' }],
      };

      // Should return null when conversion fails
      const result = manager.tryConvertEmailFormat(personData);
      expect(result).toBeNull();
    });

    test('should handle empty email_addresses array', () => {
      const manager = new EmailRetryManager();
      const personData = {
        email_addresses: [],
      };

      const result = manager.tryConvertEmailFormat(personData);
      expect(result).toBeNull();
    });

    test('should handle missing email_addresses field', () => {
      const manager = new EmailRetryManager();
      const personData = {
        name: 'Test Person',
      };

      const result = manager.tryConvertEmailFormat(personData);
      expect(result).toBeNull();
    });

    test('should handle non-array email_addresses', () => {
      const manager = new EmailRetryManager();
      const personData = {
        email_addresses: 'not-an-array',
      };

      const result = manager.tryConvertEmailFormat(personData);
      expect(result).toBeNull();
    });

    test('should handle strategy that throws during conversion', () => {
      const manager = new EmailRetryManager();

      // Mock a strategy that throws
      const throwingStrategy = {
        canHandle: () => true,
        convertToAlternativeFormat: () => {
          throw new Error('Conversion failed');
        },
        getOriginalFormatDescription: () => 'throwing',
        getAlternativeFormatDescription: () => 'failed',
      };

      // Add the throwing strategy to manager
      (manager as any).strategies = [throwingStrategy];

      const personData = {
        email_addresses: ['test@email.com'],
      };

      // Should return null when strategy throws
      const result = manager.tryConvertEmailFormat(personData);
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle circular reference in person data', () => {
      const manager = new EmailRetryManager();
      const personData: any = {
        email_addresses: ['test@email.com'],
      };
      personData.self = personData; // Create circular reference

      // Should still work despite circular reference
      const result = manager.tryConvertEmailFormat(personData);
      expect(result).not.toBeNull();
      expect(result?.convertedData.email_addresses).toBeDefined();
    });

    test('should handle very large email arrays', () => {
      const manager = new EmailRetryManager();
      const largeEmailArray = Array(1000).fill('test@email.com');
      const personData = {
        email_addresses: largeEmailArray,
      };

      const result = manager.tryConvertEmailFormat(personData);
      expect(result).not.toBeNull();
      expect(Array.isArray(result?.convertedData.email_addresses)).toBe(true);
    });
  });
});
