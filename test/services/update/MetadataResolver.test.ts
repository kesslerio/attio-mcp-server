/**
 * Test suite for MetadataResolver
 *
 * Comprehensive unit tests for error path handling and graceful degradation.
 * Issue #1008: Add unit tests for MetadataResolver error paths
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock all dependencies before imports
vi.mock('@/services/CachingService.js', () => ({
  CachingService: {
    getOrLoadAttributes: vi.fn(),
  },
}));

vi.mock('@/utils/logger.js', () => ({
  debug: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/utils/metadata-utils.js', () => ({
  convertToMetadataMap: vi.fn(),
}));

vi.mock('@/services/UniversalMetadataService.js', () => ({
  UniversalMetadataService: {
    discoverAttributesForResourceType: vi.fn(),
  },
}));

// Import after mocks
import { MetadataResolver } from '@/services/update/MetadataResolver.js';
import { CachingService } from '@/services/CachingService.js';
import { debug, error as logError } from '@/utils/logger.js';
import { convertToMetadataMap } from '@/utils/metadata-utils.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import type { AttributeMetadata } from '@/services/value-transformer/types.js';
import { DEFAULT_ATTRIBUTES_CACHE_TTL } from '@/constants/universal.constants.js';

// Helper functions for test data
function createMockAttributeResponse(
  attributes: Array<Record<string, unknown>>
) {
  return { data: attributes };
}

function createMockMetadataMap(
  entries: Array<[string, Partial<AttributeMetadata>]>
): Map<string, AttributeMetadata> {
  return new Map(
    entries.map(([key, val]) => [
      key,
      {
        slug: key,
        type: 'text',
        api_slug: key,
        title: key,
        ...val,
      } as AttributeMetadata,
    ])
  );
}

function createAuthError(code: 401 | 403, message?: string): Error {
  return new Error(
    message || `${code} ${code === 401 ? 'Unauthorized' : 'Forbidden'}`
  );
}

function createValidationError(message: string): Error {
  return new Error(`Schema validation failed: ${message}`);
}

function createTransientError(
  type: 'network' | 'rate-limit' | 'service'
): Error {
  const messages = {
    network: 'Network timeout after 5000ms',
    'rate-limit': 'Rate limit exceeded',
    service: 'Service temporarily unavailable',
  };
  return new Error(messages[type]);
}

describe('MetadataResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchMetadata - Success Paths', () => {
    it('should fetch metadata from cache when available', async () => {
      const mockData = { data: [{ api_slug: 'name', title: 'Name' }] };
      const mockMetadataMap = createMockMetadataMap([['name', {}]]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: true,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      expect(result.fromCache).toBe(true);
      expect(result.metadataMap).toEqual(mockMetadataMap);
      expect(result.availableAttributes).toContain('name');
      // Verify logging happens with correct context
      expect(debug).toHaveBeenCalledWith(
        'MetadataResolver',
        'Metadata fetched',
        expect.objectContaining({
          resourceType: UniversalResourceType.COMPANIES,
          fromCache: true,
        })
      );
    });

    it('should fetch fresh metadata on cache miss', async () => {
      const mockData = { data: [{ api_slug: 'name', title: 'Name' }] };
      const mockMetadataMap = createMockMetadataMap([['name', {}]]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.TASKS
      );

      expect(result.fromCache).toBe(false);
      expect(result.metadataMap).toEqual(mockMetadataMap);
      expect(CachingService.getOrLoadAttributes).toHaveBeenCalledWith(
        expect.any(Function),
        UniversalResourceType.TASKS,
        undefined,
        DEFAULT_ATTRIBUTES_CACHE_TTL
      );
    });

    it('should handle RECORDS resource type with object slug', async () => {
      const mockData = { data: [{ api_slug: 'custom_field', title: 'Field' }] };
      const mockMetadataMap = createMockMetadataMap([['custom_field', {}]]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.RECORDS,
        { object: 'custom_object' }
      );

      expect(result.metadataMap).toEqual(mockMetadataMap);
      expect(CachingService.getOrLoadAttributes).toHaveBeenCalledWith(
        expect.any(Function),
        UniversalResourceType.RECORDS,
        'custom_object',
        DEFAULT_ATTRIBUTES_CACHE_TTL
      );
    });

    it('should handle DEALS resource type', async () => {
      const mockData = { data: [{ api_slug: 'stage', title: 'Stage' }] };
      const mockMetadataMap = createMockMetadataMap([['stage', {}]]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      await MetadataResolver.fetchMetadata(UniversalResourceType.DEALS);

      expect(CachingService.getOrLoadAttributes).toHaveBeenCalledWith(
        expect.any(Function),
        UniversalResourceType.DEALS,
        'deals',
        DEFAULT_ATTRIBUTES_CACHE_TTL
      );
    });

    it('should handle resource types without object slug', async () => {
      const mockData = { data: [{ api_slug: 'name', title: 'Name' }] };
      const mockMetadataMap = createMockMetadataMap([['name', {}]]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      await MetadataResolver.fetchMetadata(UniversalResourceType.PEOPLE);

      expect(CachingService.getOrLoadAttributes).toHaveBeenCalledWith(
        expect.any(Function),
        UniversalResourceType.PEOPLE,
        undefined,
        DEFAULT_ATTRIBUTES_CACHE_TTL
      );
    });

    it('should convert API response to metadata map correctly', async () => {
      const mockData = {
        data: [
          { api_slug: 'name', title: 'Name', type: 'text' },
          { api_slug: 'email', title: 'Email', type: 'email-address' },
        ],
      };
      const mockMetadataMap = createMockMetadataMap([
        ['name', { type: 'text' }],
        ['email', { type: 'email-address' }],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      expect(convertToMetadataMap).toHaveBeenCalledWith(mockData);
      expect(result.metadataMap.size).toBe(2);
    });

    it('should extract attribute slugs from metadata', async () => {
      const mockData = { data: [{ api_slug: 'name', title: 'Company Name' }] };
      const mockMetadataMap = createMockMetadataMap([
        ['name', { title: 'Company Name', slug: 'name' }],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      // Should contain all slug variations (lowercase)
      expect(result.availableAttributes).toContain('name');
      expect(result.availableAttributes).toContain('company name');
    });
  });

  describe('fetchMetadata - Authentication Errors (Re-throw)', () => {
    it('should re-throw errors with auth status codes (401/403)', async () => {
      const error401 = createAuthError(401);
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValue(error401);

      await expect(
        MetadataResolver.fetchMetadata(UniversalResourceType.COMPANIES)
      ).rejects.toThrow(error401);

      // Verify critical auth errors are logged before re-throwing
      expect(logError).toHaveBeenCalledWith(
        'MetadataResolver',
        'Authentication error fetching metadata',
        error401,
        expect.objectContaining({
          resourceType: UniversalResourceType.COMPANIES,
        })
      );

      // Test 403 as well
      vi.clearAllMocks();
      const error403 = createAuthError(403);
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValue(error403);

      await expect(
        MetadataResolver.fetchMetadata(UniversalResourceType.TASKS)
      ).rejects.toThrow(error403);
    });

    it('should re-throw errors with auth keywords (Unauthorized/Forbidden)', async () => {
      const unauthorizedError = new Error('Unauthorized access');
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValue(
        unauthorizedError
      );

      await expect(
        MetadataResolver.fetchMetadata(UniversalResourceType.PEOPLE)
      ).rejects.toThrow(unauthorizedError);

      // Test Forbidden keyword
      vi.clearAllMocks();
      const forbiddenError = new Error('Forbidden resource');
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValue(
        forbiddenError
      );

      await expect(
        MetadataResolver.fetchMetadata(UniversalResourceType.LISTS)
      ).rejects.toThrow(forbiddenError);
    });
  });

  describe('fetchMetadata - Schema Validation Errors (Re-throw)', () => {
    it('should re-throw errors with "validation" keyword', async () => {
      const validationError = createValidationError('invalid attribute type');
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValue(
        validationError
      );

      await expect(
        MetadataResolver.fetchMetadata(UniversalResourceType.TASKS)
      ).rejects.toThrow(validationError);

      // Verify schema errors are logged before re-throwing
      expect(logError).toHaveBeenCalledWith(
        'MetadataResolver',
        'Schema validation error fetching metadata',
        validationError,
        expect.objectContaining({
          resourceType: UniversalResourceType.TASKS,
        })
      );
    });

    it('should re-throw errors with "schema" keyword', async () => {
      const schemaError = new Error('schema mismatch detected');
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValue(
        schemaError
      );

      await expect(
        MetadataResolver.fetchMetadata(UniversalResourceType.DEALS)
      ).rejects.toThrow(schemaError);
    });
  });

  describe('fetchMetadata - Graceful Degradation (Non-critical Errors)', () => {
    it.each([
      ['network errors', createTransientError('network')],
      ['rate limit errors', createTransientError('rate-limit')],
      ['service errors', createTransientError('service')],
      ['unknown errors', new Error('Something unexpected')],
      ['string errors', 'Random error string'],
      ['null errors', null],
    ])('should return empty metadata for %s', async (_, error) => {
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValue(error);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      expect(result).toEqual({
        metadataMap: new Map(),
        availableAttributes: [],
        fromCache: false,
      });
    });

    it('should log graceful degradation with correct context', async () => {
      const networkError = createTransientError('network');
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValue(
        networkError
      );

      await MetadataResolver.fetchMetadata(UniversalResourceType.COMPANIES);

      // Verify logging for graceful degradation
      expect(logError).toHaveBeenCalledWith(
        'MetadataResolver',
        'Non-critical metadata fetch error, using empty metadata',
        networkError,
        expect.objectContaining({
          resourceType: UniversalResourceType.COMPANIES,
        })
      );

      expect(debug).toHaveBeenCalledWith(
        'MetadataResolver',
        'Graceful degradation with empty metadata',
        expect.objectContaining({
          resourceType: UniversalResourceType.COMPANIES,
        })
      );
    });
  });

  describe('fetchMetadata - Cache Integration', () => {
    it('should pass correct parameters to CachingService', async () => {
      const mockData = { data: [{ api_slug: 'name', title: 'Name' }] };
      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(new Map());

      await MetadataResolver.fetchMetadata(UniversalResourceType.COMPANIES);

      expect(CachingService.getOrLoadAttributes).toHaveBeenCalledWith(
        expect.any(Function),
        UniversalResourceType.COMPANIES,
        undefined,
        DEFAULT_ATTRIBUTES_CACHE_TTL
      );
    });

    it('should use DEFAULT_ATTRIBUTES_CACHE_TTL from constants', async () => {
      const mockData = { data: [] };
      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(new Map());

      await MetadataResolver.fetchMetadata(UniversalResourceType.TASKS);

      expect(CachingService.getOrLoadAttributes).toHaveBeenCalledWith(
        expect.any(Function),
        UniversalResourceType.TASKS,
        undefined, // TASKS doesn't have an object slug
        DEFAULT_ATTRIBUTES_CACHE_TTL
      );
    });

    it('should invoke dataLoader callback when cache misses', async () => {
      // Capture the dataLoader function
      let capturedLoader: (() => Promise<Record<string, unknown>>) | null =
        null;

      vi.mocked(CachingService.getOrLoadAttributes).mockImplementation(
        async (loader) => {
          capturedLoader = loader;
          const data = await loader();
          return { data, fromCache: false };
        }
      );

      // Import and mock UniversalMetadataService dynamically
      const { UniversalMetadataService } =
        await import('@/services/UniversalMetadataService.js');
      const mockResponse = { data: [] };
      vi.mocked(
        UniversalMetadataService.discoverAttributesForResourceType
      ).mockResolvedValue(mockResponse);

      vi.mocked(convertToMetadataMap).mockReturnValue(new Map());

      await MetadataResolver.fetchMetadata(UniversalResourceType.TASKS);

      expect(capturedLoader).not.toBeNull();
      // Verify the service was called (options may be undefined or an object)
      expect(
        UniversalMetadataService.discoverAttributesForResourceType
      ).toHaveBeenCalled();
      expect(
        UniversalMetadataService.discoverAttributesForResourceType
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractObjectSlug - Public Utility', () => {
    it('should extract object from recordData for RECORDS type', () => {
      const result = MetadataResolver.extractObjectSlug(
        UniversalResourceType.RECORDS,
        { object: 'custom_object' }
      );
      expect(result).toBe('custom_object');
    });

    it('should extract object_api_slug as fallback for RECORDS type', () => {
      const result = MetadataResolver.extractObjectSlug(
        UniversalResourceType.RECORDS,
        { object_api_slug: 'api_object' }
      );
      expect(result).toBe('api_object');
    });

    it('should return "records" default when no object in recordData', () => {
      const result = MetadataResolver.extractObjectSlug(
        UniversalResourceType.RECORDS,
        {}
      );
      expect(result).toBe('records');
    });

    it('should prefer object over object_api_slug for RECORDS type', () => {
      const result = MetadataResolver.extractObjectSlug(
        UniversalResourceType.RECORDS,
        { object: 'primary', object_api_slug: 'fallback' }
      );
      expect(result).toBe('primary');
    });

    it('should return "deals" for DEALS type', () => {
      const result = MetadataResolver.extractObjectSlug(
        UniversalResourceType.DEALS
      );
      expect(result).toBe('deals');
    });

    it.each([
      [UniversalResourceType.COMPANIES],
      [UniversalResourceType.PEOPLE],
      [UniversalResourceType.TASKS],
      [UniversalResourceType.LISTS],
    ])('should return undefined for %s type', (resourceType) => {
      const result = MetadataResolver.extractObjectSlug(resourceType);
      expect(result).toBeUndefined();
    });

    it('should handle undefined recordData for RECORDS type', () => {
      const result = MetadataResolver.extractObjectSlug(
        UniversalResourceType.RECORDS
      );
      expect(result).toBe('records');
    });
  });

  describe('fetchMetadata - Edge Cases', () => {
    it('should handle empty attributes array from API', async () => {
      const mockData = { data: [] };
      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(new Map());

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      expect(result.metadataMap.size).toBe(0);
      expect(result.availableAttributes).toEqual([]);
      expect(result.fromCache).toBe(false);
    });

    it('should handle attributes with missing api_slug', async () => {
      const mockData = { data: [{ title: 'Name' }] };
      const mockMetadataMap = createMockMetadataMap([
        ['name', { api_slug: undefined as unknown as string }],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      // Should gracefully handle missing fields with valid structure
      expect(result.metadataMap.size).toBe(1);
      expect(result.fromCache).toBe(false);
      expect(result.availableAttributes.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed success and error scenarios sequentially', async () => {
      const mockData = { data: [{ api_slug: 'name', title: 'Name' }] };
      const mockMetadataMap = createMockMetadataMap([['name', {}]]);

      // First call succeeds
      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValueOnce({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result1 = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );
      expect(result1.metadataMap.size).toBe(1);

      // Second call fails with network error (graceful degradation)
      vi.mocked(CachingService.getOrLoadAttributes).mockRejectedValueOnce(
        createTransientError('network')
      );

      const result2 = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );
      expect(result2.metadataMap.size).toBe(0);
    });
  });

  describe('fetchMetadata - Attribute Slug Extraction (Private)', () => {
    it('should extract api_slug from metadata', async () => {
      const mockData = { data: [] };
      const mockMetadataMap = createMockMetadataMap([
        ['name', { api_slug: 'name' }],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      expect(result.availableAttributes).toContain('name');
    });

    it('should extract title from metadata', async () => {
      const mockData = { data: [] };
      const mockMetadataMap = createMockMetadataMap([
        ['company_name', { title: 'Company Name' }],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      expect(result.availableAttributes).toContain('company name');
    });

    it('should extract slug from metadata', async () => {
      const mockData = { data: [] };
      const mockMetadataMap = createMockMetadataMap([
        ['email', { slug: 'email_address' }],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.PEOPLE
      );

      expect(result.availableAttributes).toContain('email_address');
    });

    it('should deduplicate slug variations', async () => {
      const mockData = { data: [] };
      const mockMetadataMap = new Map<string, AttributeMetadata>([
        [
          'name',
          {
            api_slug: 'Name',
            title: 'name',
            slug: 'NAME',
            type: 'text',
          } as AttributeMetadata,
        ],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      // Should only have one 'name' entry (deduplicated and lowercased)
      const nameCount = result.availableAttributes.filter(
        (s) => s === 'name'
      ).length;
      expect(nameCount).toBe(1);
    });

    it('should handle attributes with only some slug fields', async () => {
      const mockData = { data: [] };
      const mockMetadataMap = new Map<string, AttributeMetadata>([
        [
          'field1',
          {
            api_slug: 'field1',
            title: undefined as unknown as string,
            slug: undefined as unknown as string,
            type: 'text',
          } as AttributeMetadata,
        ],
        [
          'field2',
          {
            api_slug: undefined as unknown as string,
            title: 'Field 2',
            slug: undefined as unknown as string,
            type: 'text',
          } as AttributeMetadata,
        ],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      // Should extract available slugs
      expect(result.availableAttributes).toContain('field1');
      expect(result.availableAttributes).toContain('field 2');
    });

    it('should filter out non-string slug values', async () => {
      const mockData = { data: [] };
      const mockMetadataMap = new Map<string, AttributeMetadata>([
        [
          'valid',
          {
            api_slug: 'valid',
            title: 'Valid Field',
            slug: null as unknown as string,
            type: 'text',
          } as AttributeMetadata,
        ],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      // Should only include string slugs
      expect(result.availableAttributes).toContain('valid');
      expect(result.availableAttributes).toContain('valid field');
    });

    it('should lowercase all extracted slugs', async () => {
      const mockData = { data: [] };
      const mockMetadataMap = createMockMetadataMap([
        ['field', { api_slug: 'FIELD', title: 'Field Name', slug: 'Field' }],
      ]);

      vi.mocked(CachingService.getOrLoadAttributes).mockResolvedValue({
        data: mockData,
        fromCache: false,
      });
      vi.mocked(convertToMetadataMap).mockReturnValue(mockMetadataMap);

      const result = await MetadataResolver.fetchMetadata(
        UniversalResourceType.COMPANIES
      );

      // All slugs should be lowercased
      expect(result.availableAttributes).toContain('field');
      expect(result.availableAttributes).toContain('field name');
      expect(
        result.availableAttributes.every((s) => s === s.toLowerCase())
      ).toBe(true);
    });
  });
});
