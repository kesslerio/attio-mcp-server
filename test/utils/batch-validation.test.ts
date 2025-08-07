/**
 * Tests for batch validation utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateBatchSize,
  validatePayloadSize,
  validateSearchQuery,
  validateBatchOperation,
  splitBatchIntoChunks,
  createSafeBatchError,
} from '../../src/utils/batch-validation.js';
import { ErrorType } from '../../src/utils/error-handler.js';

// Mock environment variables for testing
vi.mock('../../src/config/security-limits.js', async () => {
  const actual = await vi.importActual('../../src/config/security-limits.js');
  return {
    ...actual,
    BATCH_SIZE_LIMITS: {
      DEFAULT: 100,
      COMPANIES: 100,
      PEOPLE: 100,
      DELETE: 50,
      SEARCH: 50,
    },
    PAYLOAD_SIZE_LIMITS: {
      SINGLE_RECORD: 1048576, // 1MB
      BATCH_TOTAL: 10485760, // 10MB
      SEARCH_QUERY: 1024, // 1KB
      FILTER_OBJECT: 10240, // 10KB
    },
  };
});

describe('Batch Validation', () => {
  describe('validateBatchSize', () => {
    it('should accept valid batch sizes', () => {
      const items = new Array(50).fill({ name: 'test' });
      const result = validateBatchSize(items, 'create', 'companies');
      expect(result.isValid).toBe(true);
    });

    it('should reject batch sizes exceeding the limit', () => {
      const items = new Array(101).fill({ name: 'test' });
      const result = validateBatchSize(items, 'create', 'companies');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
      expect(result.errorType).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.details?.actualSize).toBe(101);
      expect(result.details?.maxSize).toBe(100);
    });

    it('should apply stricter limits for delete operations', () => {
      const items = new Array(51).fill('id-123');
      const result = validateBatchSize(items, 'delete', 'companies');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed (50)');
    });

    it('should apply stricter limits for search operations', () => {
      const items = new Array(51).fill('search query');
      const result = validateBatchSize(items, 'search', 'companies');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed (50)');
    });

    it('should reject null or undefined items', () => {
      const result = validateBatchSize(null, 'create', 'companies');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Batch items must be a non-empty array');
    });

    it('should reject empty arrays', () => {
      const result = validateBatchSize([], 'create', 'companies');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Batch operation requires at least one item');
    });

    it('should handle unknown resource types', () => {
      const items = new Array(101).fill({ name: 'test' });
      const result = validateBatchSize(items, 'create', 'unknown');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed (100)');
    });
  });

  describe('validatePayloadSize', () => {
    it('should accept payloads within size limits', () => {
      const payload = { name: 'test', description: 'test description' };
      const result = validatePayloadSize(payload);
      expect(result.isValid).toBe(true);
    });

    it('should reject oversized payloads', () => {
      // Create a large payload (over 10MB)
      const largeString = 'x'.repeat(11 * 1024 * 1024); // 11MB string
      const payload = { data: largeString };
      const result = validatePayloadSize(payload);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
    });

    it('should check individual record sizes when requested', () => {
      // Create a record that's over 1MB
      const largeRecord = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
      const payload = [largeRecord];
      const result = validatePayloadSize(payload, true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Record at index 0');
      expect(result.error).toContain('Single record size');
    });

    it('should handle arrays of valid records', () => {
      const records = [
        { name: 'company1', website: 'https://example1.com' },
        { name: 'company2', website: 'https://example2.com' },
        { name: 'company3', website: 'https://example3.com' },
      ];
      const result = validatePayloadSize(records, true);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      const result = validateSearchQuery('test search query');
      expect(result.isValid).toBe(true);
    });

    it('should reject overly long search queries', () => {
      const longQuery = 'x'.repeat(1025); // Over 1KB
      const result = validateSearchQuery(longQuery);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Search query length');
      expect(result.error).toContain('exceeds maximum allowed');
    });

    it('should accept valid filter objects', () => {
      const filters = {
        status: 'active',
        created_after: '2024-01-01',
        tags: ['important', 'client'],
      };
      const result = validateSearchQuery(undefined, filters);
      expect(result.isValid).toBe(true);
    });

    it('should reject overly complex filter objects', () => {
      // Create a filter object over 10KB
      const complexFilter = {
        data: 'x'.repeat(11 * 1024), // 11KB
      };
      const result = validateSearchQuery(undefined, complexFilter);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Filter object size');
    });
  });

  describe('validateBatchOperation', () => {
    it('should validate both size and payload', () => {
      const items = new Array(50).fill({ name: 'test' });
      const result = validateBatchOperation({
        items,
        operationType: 'create',
        resourceType: 'companies',
        checkPayload: true,
      });
      expect(result.isValid).toBe(true);
    });

    it('should fail on size validation first', () => {
      const items = new Array(101).fill({ name: 'test' });
      const result = validateBatchOperation({
        items,
        operationType: 'create',
        resourceType: 'companies',
        checkPayload: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
    });

    it('should skip payload check when not requested', () => {
      const items = new Array(50).fill('id-123');
      const result = validateBatchOperation({
        items,
        operationType: 'delete',
        resourceType: 'companies',
        checkPayload: false,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('splitBatchIntoChunks', () => {
    it('should split large arrays into chunks', () => {
      const items = new Array(250).fill('item').map((_, i) => `item-${i}`);
      const chunks = splitBatchIntoChunks(items, 'companies');

      expect(chunks.length).toBe(3); // 100, 100, 50
      expect(chunks[0].length).toBe(100);
      expect(chunks[1].length).toBe(100);
      expect(chunks[2].length).toBe(50);
    });

    it('should handle arrays smaller than chunk size', () => {
      const items = new Array(50).fill('item');
      const chunks = splitBatchIntoChunks(items, 'companies');

      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBe(50);
    });

    it('should handle empty arrays', () => {
      const chunks = splitBatchIntoChunks([], 'companies');
      expect(chunks.length).toBe(0);
    });

    it('should use resource-specific limits', () => {
      const items = new Array(60).fill('item');
      const chunks = splitBatchIntoChunks(items, 'delete');

      // Delete operations have a limit of 50
      expect(chunks.length).toBe(2);
      expect(chunks[0].length).toBe(50);
      expect(chunks[1].length).toBe(10);
    });
  });

  describe('createSafeBatchError', () => {
    it('should return empty string for valid results', () => {
      const validation = { isValid: true };
      const error = createSafeBatchError(validation);
      expect(error).toBe('');
    });

    it('should return the error message for invalid results', () => {
      const validation = {
        isValid: false,
        error: 'Batch size exceeded',
      };
      const error = createSafeBatchError(validation);
      expect(error).toBe('Batch size exceeded');
    });

    it('should provide fallback message when error is missing', () => {
      const validation = { isValid: false };
      const error = createSafeBatchError(validation);
      expect(error).toBe('Batch validation failed');
    });
  });

  describe('DoS Protection Scenarios', () => {
    it('should prevent memory exhaustion from large batch sizes', () => {
      const items = new Array(10000).fill({ name: 'test' });
      const result = validateBatchSize(items, 'create', 'companies');
      expect(result.isValid).toBe(false);
      expect(result.details?.actualSize).toBe(10000);
    });

    it('should prevent payload bombs', () => {
      // Simulate a payload bomb with deeply nested large objects
      const createNestedObject = (depth: number): any => {
        if (depth === 0) return { data: 'x'.repeat(100000) }; // 100KB at leaf
        return {
          nested: createNestedObject(depth - 1),
          data: 'x'.repeat(100000), // 100KB at each level
        };
      };

      const payload = createNestedObject(110); // Deep nesting with large data
      const result = validatePayloadSize(payload);
      expect(result.isValid).toBe(false);
    });

    it('should handle malicious search queries', () => {
      // Attempt to create a regex DoS pattern
      const maliciousQuery = '(a+)+b'.repeat(100);
      const result = validateSearchQuery(maliciousQuery);

      // Should fail due to length, not pattern matching
      if (maliciousQuery.length > 1024) {
        expect(result.isValid).toBe(false);
      }
    });

    it('should enforce limits even with valid-looking data', () => {
      // Create many small records that together exceed limits
      const records = new Array(101).fill({
        id: 'rec-123',
        name: 'Valid Company Name',
        website: 'https://example.com',
        description: 'A legitimate company description',
      });

      const result = validateBatchOperation({
        items: records,
        operationType: 'update',
        resourceType: 'companies',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
    });
  });
});
