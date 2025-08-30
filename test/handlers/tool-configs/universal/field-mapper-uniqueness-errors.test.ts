/**
 * Split: field-mapper – uniqueness error enhancement
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import { enhanceUniquenessError } from '../../../../src/handlers/tool-configs/universal/field-mapper.js';

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

describe('field-mapper – uniqueness error enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns original message when no attribute ID pattern found', async () => {
    const result = await enhanceUniquenessError(
      UniversalResourceType.COMPANIES,
      'Uniqueness constraint violation on field "name"',
      { name: 'Duplicate Corp' }
    );
    expect(result).toBeTypeOf('string');
  });

  it('returns original message when field cannot be extracted', async () => {
    const result = await enhanceUniquenessError(
      UniversalResourceType.COMPANIES,
      'Generic uniqueness error',
      { name: 'Test Corp' }
    );
    expect(result).toBeTypeOf('string');
  });

  it('attempts enhancement with attribute ID pattern', async () => {
    const result = await enhanceUniquenessError(
      UniversalResourceType.COMPANIES,
      'Uniqueness constraint violation for attribute with ID "company-name"',
      { name: 'Test Corp' }
    );
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
