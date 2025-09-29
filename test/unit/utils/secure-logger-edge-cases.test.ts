import { describe, expect, it } from 'vitest';
import {
  sanitizeLogPayload,
  sanitizeLogMessage,
  maskIdentifier,
} from '@/utils/log-sanitizer.js';

describe('SecureLogger Edge Cases', () => {
  describe('Depth Limiting', () => {
    it('handles deeply nested objects (10+ levels)', () => {
      // Create a 25-level deep nested object
      let deepObj: Record<string, unknown> = { value: 'deep' };
      for (let i = 0; i < 24; i++) {
        deepObj = { nested: deepObj };
      }

      const sanitized = sanitizeLogPayload(deepObj);

      // Should sanitize without stack overflow
      expect(sanitized).toBeDefined();

      // Navigate to depth limit (20 levels)
      let current: unknown = sanitized;
      for (let i = 0; i < 20; i++) {
        expect(current).toHaveProperty('nested');
        current = (current as Record<string, unknown>).nested;
      }

      // At depth 21, should hit limit - the parent object contains the string
      expect(current).toEqual({ nested: '[DEPTH_LIMIT_EXCEEDED]' });
    });

    it('handles arrays within deeply nested objects', () => {
      let deepObj: Record<string, unknown> = { items: ['a', 'b', 'c'] };
      for (let i = 0; i < 22; i++) {
        deepObj = { nested: deepObj };
      }

      const sanitized = sanitizeLogPayload(deepObj);
      expect(sanitized).toBeDefined();

      // Should not crash and should apply depth limiting
      let current: unknown = sanitized;
      for (let i = 0; i < 20; i++) {
        if (
          typeof current === 'object' &&
          current !== null &&
          'nested' in current
        ) {
          current = (current as Record<string, unknown>).nested;
        }
      }

      // Beyond depth 20 should be limited
      expect(current).toEqual({ nested: '[DEPTH_LIMIT_EXCEEDED]' });
    });
  });

  describe('Circular Reference Handling', () => {
    it('handles simple circular references', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj;

      const sanitized = sanitizeLogPayload(obj);

      expect(sanitized).toHaveProperty('name');
      expect(sanitized).toHaveProperty('self');
      // Circular reference should point to the same sanitized object
      expect((sanitized as Record<string, unknown>).self).toBe(sanitized);
    });

    it('handles complex circular reference graphs', () => {
      const objA: Record<string, unknown> = { name: 'A' };
      const objB: Record<string, unknown> = { name: 'B' };
      const objC: Record<string, unknown> = { name: 'C' };

      objA.b = objB;
      objB.c = objC;
      objC.a = objA; // Create cycle

      const sanitized = sanitizeLogPayload(objA);

      expect(sanitized).toBeDefined();
      expect((sanitized as Record<string, unknown>).name).toBe('A');

      const sanitizedB = (sanitized as Record<string, unknown>).b as Record<
        string,
        unknown
      >;
      expect(sanitizedB.name).toBe('B');

      const sanitizedC = sanitizedB.c as Record<string, unknown>;
      expect(sanitizedC.name).toBe('C');

      // The circular reference should be handled
      expect(sanitizedC.a).toBe(sanitized);
    });

    it('handles arrays with circular references', () => {
      const arr: unknown[] = ['item1', 'item2'];
      arr.push(arr); // Circular array

      const sanitized = sanitizeLogPayload(arr);

      expect(Array.isArray(sanitized)).toBe(true);
      expect((sanitized as unknown[])[0]).toBe('item1');
      expect((sanitized as unknown[])[1]).toBe('item2');
      // Third element should be the sanitized array itself (same reference)
      const thirdElement = (sanitized as unknown[])[2];
      expect(Array.isArray(thirdElement)).toBe(true);
      expect((thirdElement as unknown[])[0]).toBe('item1');
    });
  });

  describe('Unicode and Emoji Handling', () => {
    it('sanitizes emails with Unicode domains', () => {
      const payload = {
        email: 'user@münchen.de',
        message: 'Testing Unicode',
      };

      const sanitized = sanitizeLogPayload(payload);

      // Email key triggers redaction, even if pattern doesn't match Unicode domain
      expect((sanitized as Record<string, unknown>).email).toBe('[REDACTED]');
      expect((sanitized as Record<string, unknown>).message).toBe(
        'Testing Unicode'
      );
    });

    it('handles emoji in log messages', () => {
      // Use a token-like pattern that will actually match TOKEN_REGEX (24+ chars)
      const message =
        'User 👤 logged in with token 🔑 abc123def456ghi789jkl012mno345';

      const sanitized = sanitizeLogMessage(message);

      // Should preserve emojis while sanitizing tokens
      expect(sanitized).toContain('👤');
      expect(sanitized).toContain('🔑');
      expect(sanitized).toContain('[TOKEN_REDACTED]');
      expect(sanitized).not.toContain('abc123def456ghi789jkl012mno345');
    });

    it('handles multi-byte characters in identifiers', () => {
      const id = '北京-1234-abcd-5678';

      const masked = maskIdentifier(id);

      // Should handle multi-byte characters gracefully
      expect(masked).toMatch(/^北京-1…5678$/);
    });

    it('preserves Unicode in non-sensitive fields', () => {
      const payload = {
        name: '田中太郎',
        description: 'Test with 中文字符 and emoji 🎉',
        age: 30,
      };

      const sanitized = sanitizeLogPayload(payload);

      expect((sanitized as Record<string, unknown>).name).toBe('田中太郎');
      expect((sanitized as Record<string, unknown>).description).toBe(
        'Test with 中文字符 and emoji 🎉'
      );
    });
  });

  describe('Edge Case Data Types', () => {
    it('handles BigInt values', () => {
      const payload = {
        bigNumber: BigInt('9007199254740991'),
        user_id: BigInt('1234567890123456'),
      };

      const sanitized = sanitizeLogPayload(payload);

      // BigInt values are masked when they look like IDs
      expect((sanitized as Record<string, unknown>).bigNumber).toMatch(
        /^9007…0991$/
      );
      // BigInt with _id suffix should be masked
      expect((sanitized as Record<string, unknown>).user_id).toMatch(
        /^1234…3456$/
      );
    });

    it('handles Date objects', () => {
      const date = new Date('2025-01-15T10:30:00.000Z');
      const payload = { timestamp: date };

      const sanitized = sanitizeLogPayload(payload);

      // Date should be converted to ISO string
      expect((sanitized as Record<string, unknown>).timestamp).toBe(
        '2025-01-15T10:30:00.000Z'
      );
    });

    it('handles URL objects', () => {
      const url = new URL(
        'https://api.example.com/users?token=secret123&id=456'
      );
      const payload = { endpoint: url };

      const sanitized = sanitizeLogPayload(payload);

      // URL query params should be redacted
      const sanitizedUrl = (sanitized as Record<string, unknown>)
        .endpoint as string;
      expect(sanitizedUrl).toContain('https://api.example.com/users');
      expect(sanitizedUrl).toContain('?[REDACTED]');
      expect(sanitizedUrl).not.toContain('secret123');
    });

    it('handles RegExp objects', () => {
      const payload = { pattern: /test-\d+/gi };

      const sanitized = sanitizeLogPayload(payload);

      // RegExp should be converted to string
      expect((sanitized as Record<string, unknown>).pattern).toBe(
        '/test-\\d+/gi'
      );
    });

    it('handles Buffer/Binary data', () => {
      const buffer = Buffer.from('sensitive data');
      const payload = { data: buffer };

      const sanitized = sanitizeLogPayload(payload);

      // Binary data should be redacted
      expect((sanitized as Record<string, unknown>).data).toBe(
        '[BINARY_REDACTED]'
      );
    });

    it('handles null and undefined', () => {
      const payload = {
        nullValue: null,
        undefinedValue: undefined,
        nestedNull: { inner: null },
      };

      const sanitized = sanitizeLogPayload(payload);

      expect((sanitized as Record<string, unknown>).nullValue).toBeNull();
      expect(
        (sanitized as Record<string, unknown>).undefinedValue
      ).toBeUndefined();
      expect(
        (
          (sanitized as Record<string, unknown>).nestedNull as Record<
            string,
            unknown
          >
        ).inner
      ).toBeNull();
    });
  });

  describe('Performance Edge Cases', () => {
    it('handles large arrays efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: `id-${i}`,
        value: i,
      }));

      const start = performance.now();
      const sanitized = sanitizeLogPayload(largeArray);
      const duration = performance.now() - start;

      expect(Array.isArray(sanitized)).toBe(true);
      expect((sanitized as unknown[]).length).toBe(10000);
      // Should complete in reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 10k items
    });

    it('handles objects with many keys efficiently', () => {
      const manyKeys: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        manyKeys[`key_${i}`] = `value_${i}`;
      }

      const start = performance.now();
      const sanitized = sanitizeLogPayload(manyKeys);
      const duration = performance.now() - start;

      expect(Object.keys(sanitized as Record<string, unknown>).length).toBe(
        1000
      );
      // Should complete in reasonable time
      expect(duration).toBeLessThan(50); // 50ms for 1k keys
    });
  });
});
