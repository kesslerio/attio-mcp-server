/**
 * Tests for batch validation utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ErrorType } from '../../src/utils/error-handler.js';

// Mock environment variables for testing
vi.mock('../../src/config/security-limits.js', async () => {
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
      expect(result.isValid).toBe(true);
    });

    it('should reject batch sizes exceeding the limit', () => {
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
      expect(result.errorType).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.details?.actualSize).toBe(101);
      expect(result.details?.maxSize).toBe(100);
    });

    it('should apply stricter limits for delete operations', () => {
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed (50)');
    });

    it('should apply stricter limits for search operations', () => {
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed (50)');
    });

    it('should reject null or undefined items', () => {
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Batch items must be a non-empty array');
    });

    it('should reject empty arrays', () => {
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Batch operation requires at least one item');
    });

    it('should handle unknown resource types', () => {
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed (100)');
    });
  });

  describe('validatePayloadSize', () => {
    it('should accept payloads within size limits', () => {
      expect(result.isValid).toBe(true);
    });

    it('should reject oversized payloads', () => {
      // Create a large payload (over 10MB)
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
    });

    it('should check individual record sizes when requested', () => {
      // Create a record that's over 1MB
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Record at index 0');
      expect(result.error).toContain('Single record size');
    });

    it('should handle arrays of valid records', () => {
        { name: 'company1', website: 'https://example1.com' },
        { name: 'company2', website: 'https://example2.com' },
        { name: 'company3', website: 'https://example3.com' },
      ];
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      expect(result.isValid).toBe(true);
    });

    it('should reject overly long search queries', () => {
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Search query length');
      expect(result.error).toContain('exceeds maximum allowed');
    });

    it('should accept valid filter objects', () => {
        status: 'active',
        created_after: '2024-01-01',
        tags: ['important', 'client'],
      };
      expect(result.isValid).toBe(true);
    });

    it('should reject overly complex filter objects', () => {
      // Create a filter object over 10KB
        data: 'x'.repeat(11 * 1024), // 11KB
      };
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Filter object size');
    });
  });

  describe('validateBatchOperation', () => {
    it('should validate both size and payload', () => {
        items,
        operationType: 'create',
        resourceType: 'companies',
        checkPayload: true,
      });
      expect(result.isValid).toBe(true);
    });

    it('should fail on size validation first', () => {
        items,
        operationType: 'create',
        resourceType: 'companies',
        checkPayload: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
    });

    it('should skip payload check when not requested', () => {
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

      expect(chunks.length).toBe(3); // 100, 100, 50
      expect(chunks[0].length).toBe(100);
      expect(chunks[1].length).toBe(100);
      expect(chunks[2].length).toBe(50);
    });

    it('should handle arrays smaller than chunk size', () => {

      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBe(50);
    });

    it('should handle empty arrays', () => {
      expect(chunks.length).toBe(0);
    });

    it('should use resource-specific limits', () => {

      // Delete operations have a limit of 50
      expect(chunks.length).toBe(2);
      expect(chunks[0].length).toBe(50);
      expect(chunks[1].length).toBe(10);
    });
  });

  describe('createSafeBatchError', () => {
    it('should return empty string for valid results', () => {
      expect(error).toBe('');
    });

    it('should return the error message for invalid results', () => {
        isValid: false,
        error: 'Batch size exceeded',
      };
      expect(error).toBe('Batch size exceeded');
    });

    it('should provide fallback message when error is missing', () => {
      expect(error).toBe('Batch validation failed');
    });
  });

  describe('DoS Protection Scenarios', () => {
    it('should prevent memory exhaustion from large batch sizes', () => {
      expect(result.isValid).toBe(false);
      expect(result.details?.actualSize).toBe(10000);
    });

    it('should prevent payload bombs', () => {
      // Simulate a payload bomb with deeply nested large objects
        if (depth === 0) return { data: 'x'.repeat(100000) }; // 100KB at leaf
        return {
          nested: createNestedObject(depth - 1),
          data: 'x'.repeat(100000), // 100KB at each level
        };
      };

      expect(result.isValid).toBe(false);
    });

    it('should handle malicious search queries', () => {
      // Attempt to create a regex DoS pattern

      // Should fail due to length, not pattern matching
      if (maliciousQuery.length > 1024) {
        expect(result.isValid).toBe(false);
      }
    });

    it('should enforce limits even with valid-looking data', () => {
      // Create many small records that together exceed limits
        id: 'rec-123',
        name: 'Valid Company Name',
        website: 'https://example.com',
        description: 'A legitimate company description',
      });

        items: records,
        operationType: 'update',
        resourceType: 'companies',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
    });
  });
});
