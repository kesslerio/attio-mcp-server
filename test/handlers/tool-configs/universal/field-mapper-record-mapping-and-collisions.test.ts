/**
 * Split: field-mapper – record mapping & collisions
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

describe('field-mapper – record mapping & collisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('detectFieldCollisions()', () => {
    it('detects no collisions for distinct targets', async () => {
        UniversalResourceType.COMPANIES,
        { name: 'Test', industry: 'Tech' }
      );
      expect(result.hasCollisions).toBe(false);
      expect(result.errors).toHaveLength(0);
      expect(result.collisions).toEqual({});
    });

    it('detects collisions when fields map to same target', async () => {
        UniversalResourceType.COMPANIES,
        { website: 'test.com', url: 'test.com' }
      );
      expect(result.hasCollisions).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.collisions).toHaveProperty('domains');
      expect(result.collisions.domains).toContain('website');
      expect(result.collisions.domains).toContain('url');
    });

    it('ignores null-mapped fields', async () => {
        UniversalResourceType.COMPANIES,
        { name: 'Test' }
      );
      expect(result.hasCollisions).toBe(false);
    });
  });

  describe('mapRecordFields()', () => {
    it('maps all fields from record data', async () => {
        company_name: 'Test Corp',
        website: 'test.com',
      });
      expect(res.mapped.name).toBe('Test Corp');
      expect(res.mapped.domains).toEqual([{ domain: 'test.com' }]);
      expect(res.mapped.company_name).toBeUndefined();
      expect(res.mapped.website).toBeUndefined();
    });

    it('returns warnings for mapped fields', async () => {
        company_name: 'Test Corp',
        website: 'test.com',
      });
      expect(res.warnings.length).toBeGreaterThan(0);
      expect(res.warnings.some((w) => w.includes('company_name'))).toBe(true);
      expect(res.warnings.some((w) => w.includes('website'))).toBe(true);
    });

    it('detects and reports field collisions', async () => {
        website: 'test.com',
        url: 'test.com',
      });
      expect(res.errors && res.errors.length > 0).toBe(true);
      expect(res.errors?.[0]).toContain('Field collision detected');
    });

    it('preserves non-mapped fields', async () => {
        name: 'Test Corp',
        custom_field: 'custom_value',
      });
      expect(res.mapped.name).toBe('Test Corp');
      expect(res.mapped.custom_field).toBe('custom_value');
    });
  });
});
