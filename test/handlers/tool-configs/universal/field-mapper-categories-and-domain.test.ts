/**
 * Split: field-mapper – categories and domain checks
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

// Matches original mocks
vi.mock('../../../../src/api/attio-client.js', () => ({
  getAttioClient: vi.fn(() => ({
    objects: {
      companies: {
        get: vi.fn(() =>
          Promise.resolve({
            data: {
              id: { record_id: 'mock-company-id' },
              values: { domains: ['example.com'] },
            },
          })
        ),
      },
    },
    post: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
  })),
}));
vi.mock('../../../../src/handlers/tool-configs/universal/config.js', () => ({
  strictModeFor: vi.fn(() => false),
}));

describe('field-mapper – categories and domain checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCategories()', () => {
    it('validates category strings', () => {
      expect(result.isValid).toBeTypeOf('boolean');
    });

    it('validates category arrays', () => {
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('handles empty input', () => {
      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('processCategories()', () => {
    it('processes string categories with warnings', () => {
        UniversalResourceType.COMPANIES,
        'categories',
        'Technology'
      );
      expect(Array.isArray(result.processedValue)).toBe(true);
      if ((result.processedValue as any).length > 0) {
        expect(typeof (result.processedValue as any)[0]).toBe('string');
      }
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('processes array categories', () => {
        UniversalResourceType.COMPANIES,
        'categories',
        ['Technology', 'Software']
      );
      expect(Array.isArray(result.processedValue)).toBe(true);
      expect((result.processedValue as any).length).toBe(2);
    });

    it('handles empty input gracefully', () => {
        UniversalResourceType.COMPANIES,
        'categories',
        ''
      );
      expect(typeof result.processedValue).toBe('string');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getValidCategories()', () => {
    it('returns array of valid category names', () => {
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((c) => typeof c === 'string')).toBe(true);
    });
  });

  describe('checkDomainConflict()', () => {
    it('checks domain conflicts', async () => {
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('exists');
      expect(typeof result.exists).toBe('boolean');
    });

    it('handles empty domain', async () => {
      expect(typeof result.exists).toBe('boolean');
    });

    it('returns additional info when conflict exists (if any)', async () => {
      if (result.exists) {
        expect(result).toHaveProperty('existingCompany');
      }
    });
  });
});
