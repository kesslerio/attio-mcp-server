/**
 * Tests for JSON serialization utilities
 * These tests focus on handling problematic JSON cases that cause issues in Claude Desktop
 */
import { describe, it, expect, beforeEach } from 'vitest';

    it('should handle circular references', () => {
      const obj: unknown = { a: 1, b: 'string' };
      obj.circular = obj; // Create circular reference

      expect(result).toContain('[Circular]');

      // Validate that the result is parseable JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle nested circular references', () => {
      const obj: unknown = { a: 1, b: { c: 2 } };
      obj.b.parent = obj; // Create nested circular reference

      expect(result).toContain('[Circular]');

      // Validate that the result is parseable JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle functions', () => {
        a: 1,
        fn: function test() {
          return 'test';
        },
        arrow: () => 'arrow',
      };

      // Note: fast-safe-stringify excludes functions from JSON output by default
      expect(result).not.toContain('fn');
      expect(result).not.toContain('arrow');

      // Validate that the result is parseable JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle undefined values', () => {


      // undefined should be converted to null
      expect(parsed).toEqual({ a: 1, b: null, c: 'test' });
    });

    it('should handle symbols', () => {

      // Note: fast-safe-stringify excludes symbols from JSON output by default
      expect(result).not.toContain('sym');

      // Validate that the result is parseable JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle Error objects', () => {

      expect(result).toContain('"name": "Error"');
      expect(result).toContain('"message": "Test error"');

      // Validate that the result is parseable JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle deep objects without exceeding max depth', () => {
      const deepObj: unknown = { value: 1 };
      let current = deepObj;

      // Create an object that's 30 levels deep
      for (let i = 0; i < 30; i++) {
        current.next = { value: i + 2 };
        current = current.next;
      }

      // fast-safe-stringify doesn't have a built-in maxDepth feature
      // but our implementation handles this with a custom replacer
      expect(result).not.toContain('[Max Depth Reached]');

      // Validate that the result is parseable JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should truncate very long strings', () => {

      expect(result).toContain('... [truncated]');
      expect(result.length).toBeLessThan(longString.length);

      // Validate that the result is parseable JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('validateJsonString', () => {
    it('should validate correct JSON strings', () => {

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ a: 1, b: 'string', c: true });
    });

    it('should detect invalid JSON strings', () => {

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('hasCircularReferences', () => {
    it('should detect direct circular references', () => {
      const obj: unknown = { a: 1 };
      obj.self = obj;

      expect(hasCircularReferences(obj)).toBe(true);
    });

    it('should detect nested circular references', () => {
      const obj: unknown = { a: 1, b: { c: 2 } };
      obj.b.parent = obj;

      expect(hasCircularReferences(obj)).toBe(true);
    });

    it('should return false for objects without circular references', () => {

      expect(hasCircularReferences(obj)).toBe(false);
    });
  });

  describe('createSafeCopy', () => {
    it('should create a safe copy of an object with circular references', () => {
      const obj: unknown = { a: 1, b: 'string' };
      obj.circular = obj;


      expect(result.a).toBe(1);
      expect(result.b).toBe('string');
      expect(result.circular).toBe('[Circular]');
    });
  });

  describe('sanitizeMcpResponse', () => {
    it('should sanitize MCP responses with circular references', () => {
      const response: unknown = {
        content: [{ type: 'text', text: 'Test response' }],
      };
      response.circularRef = response;


      expect(result.content[0].text).toBe('Test response');
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should handle non-object responses', () => {

      expect(result.isError).toBe(true);
      expect(result.error.code).toBe(500);
    });
  });

  // Real-world MCP response test cases
  describe('Real-world MCP response scenarios', () => {
    it('should handle complex nested response objects', () => {
      // Simulate a complex response with various problematic patterns
        content: [
          {
            type: 'text',
            text: 'Response with special characters: "quotes", \\backslashes\\, \n\rnewlines',
          },
        ],
        metadata: {
          timing: {
            start: new Date(),
            end: new Date(),
            duration: () => '100ms', // Function that would normally cause JSON issues
          },
          source: {
            api: 'Attio',
            details: {
              response: Buffer.from('test'), // Non-serializable Buffer
              validUntil: Symbol('expiry'), // Symbol that would cause issues
            },
          },
        },
      };


      // Should be valid JSON
      expect(() => JSON.parse(serialized)).not.toThrow();
      expect(serialized).toContain('Response with special characters');
    });
  });
});
