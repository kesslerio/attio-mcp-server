/**
 * Split: field-mapper – mappings and basic utilities
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import {
  FIELD_MAPPINGS,
  mapFieldName,
  getValidResourceTypes,
  getValidFields,
} from '../../../../src/handlers/tool-configs/universal/field-mapper.js';

// Mocks matching original suite
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

describe('field-mapper – mappings and basics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('FIELD_MAPPINGS constant', () => {
    it('contains mappings for all resource types', () => {
      expect(FIELD_MAPPINGS).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.COMPANIES]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.PEOPLE]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.DEALS]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.TASKS]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.RECORDS]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.NOTES]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.LISTS]).toBeDefined();
    });

    it('has proper structure per mapping', () => {
      Object.values(FIELD_MAPPINGS).forEach((mapping: any) => {
        expect(mapping).toHaveProperty('fieldMappings');
        expect(mapping).toHaveProperty('validFields');
        expect(mapping).toHaveProperty('commonMistakes');
        expect(Array.isArray(mapping.validFields)).toBe(true);
        expect(typeof mapping.fieldMappings).toBe('object');
        expect(typeof mapping.commonMistakes).toBe('object');
      });
    });

    it('maps common company field variations', () => {
      const company = FIELD_MAPPINGS[UniversalResourceType.COMPANIES];
      expect(company.fieldMappings.website).toBe('domains');
      expect(company.fieldMappings.url).toBe('domains');
      expect(company.fieldMappings.company_name).toBe('name');
    });

    it('maps common people field variations', () => {
      const people = FIELD_MAPPINGS[UniversalResourceType.PEOPLE];
      expect(people.fieldMappings.first_name).toBe('name');
      expect(people.fieldMappings.last_name).toBe('name');
      expect(people.fieldMappings.email).toBe('email_addresses');
    });

    it('maps common task field variations', () => {
      const tasks = FIELD_MAPPINGS[UniversalResourceType.TASKS];
      // Title mapping removed to prevent collision with content field (Issue #568)
      expect(tasks.fieldMappings.title).toBeUndefined();
      expect(tasks.fieldMappings.status).toBe('is_completed');
      expect(tasks.fieldMappings.due_date).toBe('deadline_at');
    });
  });

  describe('mapFieldName()', () => {
    it('returns original field when no mapping exists', async () => {
      const result = await mapFieldName(
        UniversalResourceType.COMPANIES,
        'unknown_field'
      );
      expect(result).toBe('unknown_field');
    });

    it('maps incorrect field names', async () => {
      const result = await mapFieldName(
        UniversalResourceType.COMPANIES,
        'website'
      );
      expect(result).toBe('domains');
    });

    it('respects available attributes (keeps original if present)', async () => {
      const result = await mapFieldName(
        UniversalResourceType.COMPANIES,
        'website',
        ['website', 'domains']
      );
      expect(result).toBe('website');
    });

    it('maps when original not present in attributes', async () => {
      const result = await mapFieldName(
        UniversalResourceType.COMPANIES,
        'website',
        ['domains']
      );
      expect(result).toBe('domains');
    });

    it('handles case-insensitive mapping', async () => {
      const result = await mapFieldName(
        UniversalResourceType.COMPANIES,
        'WEBSITE'
      );
      expect(result).toBe('domains');
    });

    it('returns original when mapped field missing in attributes', async () => {
      const result = await mapFieldName(
        UniversalResourceType.COMPANIES,
        'website',
        ['name']
      );
      expect(result).toBe('website');
    });
  });

  describe('getValidResourceTypes()', () => {
    it('returns string of valid resource types', () => {
      const result = getValidResourceTypes();
      expect(typeof result).toBe('string');
      expect(result).toContain('companies');
      expect(result).toContain('people');
      expect(result).toContain('deals');
      expect(result).toContain('tasks');
      expect(result).toContain('records');
      expect(result).toContain('notes');
      expect(result).toContain('lists');
    });
  });

  describe('getValidFields()', () => {
    it('returns valid fields for resource type', () => {
      const result = getValidFields(UniversalResourceType.COMPANIES);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('name');
      expect(result).toContain('domains');
    });

    it('differs across resource types', () => {
      const companyFields = getValidFields(UniversalResourceType.COMPANIES);
      const peopleFields = getValidFields(UniversalResourceType.PEOPLE);
      expect(companyFields).not.toEqual(peopleFields);
      expect(peopleFields).toContain('email_addresses');
    });
  });
});
