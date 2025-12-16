/**
 * Unit tests for WorkspaceSchemaService
 *
 * Tests schema fetching, option truncation, graceful error handling, and complex type structures.
 *
 * @see Issue #983
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkspaceSchemaService } from '@/services/skill-generator/WorkspaceSchemaService.js';
import type { AttioAttributeMetadata } from '@/api/attribute-types.js';
import type { AttributeOptionsResult } from '@/services/metadata/AttributeOptionsService.js';

// Mock dependencies
vi.mock('@/api/attribute-types.js');
vi.mock('@/services/metadata/AttributeOptionsService.js');
vi.mock('@/utils/logger.js');

// Import mocked modules
const { getObjectAttributeMetadata } = await import('@/api/attribute-types.js');
const { AttributeOptionsService } = await import(
  '@/services/metadata/AttributeOptionsService.js'
);

describe('WorkspaceSchemaService', () => {
  let service: WorkspaceSchemaService;

  beforeEach(() => {
    service = new WorkspaceSchemaService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchSchema', () => {
    it('should fetch schema for single object', async () => {
      // Mock attribute metadata
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'name',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'name',
            title: 'Name',
            type: 'text',
            is_writable: true,
            is_required: true,
            is_unique: false,
            is_multiselect: false,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(['companies'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      expect(result.metadata.objects).toEqual(['companies']);
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0].objectSlug).toBe('companies');
      expect(result.objects[0].displayName).toBe('Companies');
      expect(result.objects[0].attributes).toHaveLength(1);
      expect(result.objects[0].attributes[0].apiSlug).toBe('name');
      expect(result.objects[0].attributes[0].displayName).toBe('Name');
      expect(result.objects[0].attributes[0].type).toBe('text');
    });

    it('should fetch schema for multiple objects', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'name',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'name',
            title: 'Name',
            type: 'text',
            is_writable: true,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(
        ['companies', 'people', 'deals'],
        {
          maxOptionsPerAttribute: 20,
          includeArchived: false,
          optionFetchDelayMs: 0,
        }
      );

      expect(result.objects).toHaveLength(3);
      expect(result.objects[0].objectSlug).toBe('companies');
      expect(result.objects[1].objectSlug).toBe('people');
      expect(result.objects[2].objectSlug).toBe('deals');
    });

    it('should continue processing when one object fails', async () => {
      vi.mocked(getObjectAttributeMetadata)
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(
          new Map([
            [
              'name',
              {
                id: {
                  workspace_id: 'ws1',
                  object_id: 'obj1',
                  attribute_id: 'attr1',
                },
                api_slug: 'name',
                title: 'Name',
                type: 'text',
                is_writable: true,
              },
            ],
          ])
        );

      const result = await service.fetchSchema(['companies', 'people'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      // Should have 1 object (people), companies failed
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0].objectSlug).toBe('people');
    });
  });

  describe('select/status attributes', () => {
    it('should fetch options for select attributes', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'industry',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'industry',
            title: 'Industry',
            type: 'select',
            is_writable: true,
            is_multiselect: false,
          },
        ],
      ]);

      const mockOptions: AttributeOptionsResult = {
        options: [
          { id: 'opt1', title: 'Technology', value: 'technology' },
          { id: 'opt2', title: 'Healthcare', value: 'healthcare' },
          { id: 'opt3', title: 'Finance', value: 'finance' },
        ],
        attributeType: 'select',
      };

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue(
        mockOptions
      );

      const result = await service.fetchSchema(['companies'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const industryAttr = result.objects[0].attributes.find(
        (a) => a.apiSlug === 'industry'
      );

      expect(industryAttr?.options).toHaveLength(3);
      expect(industryAttr?.options?.[0].value).toBe('technology');
      expect(industryAttr?.optionsTruncated).toBe(false);
      expect(industryAttr?.totalOptions).toBe(3);
    });

    it('should respect optionFetchDelayMs when provided', async () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      try {
        const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
          [
            'industry',
            {
              id: {
                workspace_id: 'ws1',
                object_id: 'obj1',
                attribute_id: 'attr1',
              },
              api_slug: 'industry',
              title: 'Industry',
              type: 'select',
              is_writable: true,
            },
          ],
        ]);

        const mockOptions: AttributeOptionsResult = {
          options: [{ id: 'opt1', title: 'Technology', value: 'technology' }],
          attributeType: 'select',
        };

        vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);
        vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue(
          mockOptions
        );

        const fetchPromise = service.fetchSchema(['companies'], {
          maxOptionsPerAttribute: 20,
          includeArchived: false,
          optionFetchDelayMs: 123,
        });

        await vi.runAllTimersAsync();
        await fetchPromise;

        expect(setTimeoutSpy.mock.calls.some((call) => call[1] === 123)).toBe(
          true
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should truncate options when exceeding maxOptionsPerAttribute', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'industry',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'industry',
            title: 'Industry',
            type: 'select',
            is_writable: true,
          },
        ],
      ]);

      const mockOptions: AttributeOptionsResult = {
        options: Array.from({ length: 30 }, (_, i) => ({
          id: `opt${i}`,
          title: `Option ${i}`,
          value: `option_${i}`,
        })),
        attributeType: 'select',
      };

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue(
        mockOptions
      );

      const result = await service.fetchSchema(['companies'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const industryAttr = result.objects[0].attributes.find(
        (a) => a.apiSlug === 'industry'
      );

      expect(industryAttr?.options).toHaveLength(20);
      expect(industryAttr?.optionsTruncated).toBe(true);
      expect(industryAttr?.totalOptions).toBe(30);
    });

    it('should extract option_id from nested ID objects (Attio API format)', async () => {
      // Mock Attio API response with nested ID structure
      const nestedIdOptions: AttributeOptionsResult = {
        options: [
          {
            id: {
              workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
              object_id: 'acb37e8a-bed6-4895-934a-a9e1b2cbfdbe',
              attribute_id: '73170445-aa15-49c3-8173-7868f639e049',
              option_id: 'ae15f49d-0f4e-4841-8117-bf6c0a20e8a4',
            },
            title: 'Existing Customer',
            value: 'existing_customer',
            is_archived: false,
          },
          {
            id: {
              workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
              object_id: 'acb37e8a-bed6-4895-934a-a9e1b2cbfdbe',
              attribute_id: '73170445-aa15-49c3-8173-7868f639e049',
              option_id: '8f6ac4eb-6ab6-40be-909a-29042d3674e7',
            },
            title: 'Potential Customer',
            value: 'potential_customer',
            is_archived: false,
          },
        ],
        attributeType: 'select',
      };

      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'lead_type',
          {
            id: {
              workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
              object_id: 'acb37e8a-bed6-4895-934a-a9e1b2cbfdbe',
              attribute_id: '73170445-aa15-49c3-8173-7868f639e049',
            },
            api_slug: 'lead_type',
            title: 'Type',
            type: 'select',
            is_multiselect: true,
            is_writable: true,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue(
        nestedIdOptions
      );

      const result = await service['fetchObjectSchema']('companies', {
        maxOptionsPerAttribute: 10,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const leadTypeAttr = result.attributes.find(
        (a) => a.apiSlug === 'lead_type'
      );

      // Verify option_id was extracted correctly (not '[object Object]')
      expect(leadTypeAttr?.options).toHaveLength(2);
      expect(leadTypeAttr?.options?.[0].id).toBe(
        'ae15f49d-0f4e-4841-8117-bf6c0a20e8a4'
      );
      expect(leadTypeAttr?.options?.[1].id).toBe(
        '8f6ac4eb-6ab6-40be-909a-29042d3674e7'
      );
      expect(leadTypeAttr?.options?.[0].title).toBe('Existing Customer');
      expect(leadTypeAttr?.options?.[1].title).toBe('Potential Customer');
    });

    it('should continue when options fetch fails', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'industry',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'industry',
            title: 'Industry',
            type: 'select',
            is_writable: true,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(AttributeOptionsService.getOptions).mockRejectedValue(
        new Error('Options not found')
      );

      const result = await service.fetchSchema(['companies'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const industryAttr = result.objects[0].attributes.find(
        (a) => a.apiSlug === 'industry'
      );

      // Attribute should still exist, but without options
      expect(industryAttr).toBeDefined();
      expect(industryAttr?.options).toBeUndefined();
    });
  });

  describe('complex types', () => {
    it('should add structure for location attributes', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'primary_location',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'primary_location',
            title: 'Primary Location',
            type: 'location',
            is_writable: true,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(['companies'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const locationAttr = result.objects[0].attributes.find(
        (a) => a.apiSlug === 'primary_location'
      );

      expect(locationAttr?.complexTypeStructure).toBeDefined();
      expect(locationAttr?.complexTypeStructure).toHaveProperty('line_1');
      expect(locationAttr?.complexTypeStructure).toHaveProperty('locality');
      expect(locationAttr?.complexTypeStructure).toHaveProperty('region');
      expect(locationAttr?.complexTypeStructure).toHaveProperty('postcode');
    });

    it('should add structure for personal-name attributes', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'name',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'name',
            title: 'Name',
            type: 'personal-name',
            is_writable: true,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(['people'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const nameAttr = result.objects[0].attributes.find(
        (a) => a.apiSlug === 'name'
      );

      expect(nameAttr?.complexTypeStructure).toBeDefined();
      expect(nameAttr?.complexTypeStructure).toHaveProperty('first_name');
      expect(nameAttr?.complexTypeStructure).toHaveProperty('last_name');
      expect(nameAttr?.complexTypeStructure).toHaveProperty('full_name');
    });
  });

  describe('attribute metadata', () => {
    it('should capture multi-select flag', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'tags',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'tags',
            title: 'Tags',
            type: 'select',
            is_writable: true,
            is_multiselect: true,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(['companies'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const tagsAttr = result.objects[0].attributes[0];
      expect(tagsAttr.isMultiselect).toBe(true);
    });

    it('should capture unique flag', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'domains',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'domains',
            title: 'Domains',
            type: 'domain',
            is_writable: true,
            is_unique: true,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(['companies'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const domainsAttr = result.objects[0].attributes[0];
      expect(domainsAttr.isUnique).toBe(true);
    });

    it('should capture required flag', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map([
        [
          'name',
          {
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'attr1',
            },
            api_slug: 'name',
            title: 'Name',
            type: 'text',
            is_writable: true,
            is_required: true,
          },
        ],
      ]);

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(['companies'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      const nameAttr = result.objects[0].attributes[0];
      expect(nameAttr.isRequired).toBe(true);
    });
  });

  describe('display names', () => {
    it('should use standard display names for Phase 1 objects', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map();
      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(
        ['companies', 'people', 'deals'],
        {
          maxOptionsPerAttribute: 20,
          includeArchived: false,
          optionFetchDelayMs: 0,
        }
      );

      expect(result.objects[0].displayName).toBe('Companies');
      expect(result.objects[1].displayName).toBe('People');
      expect(result.objects[2].displayName).toBe('Deals');
    });

    it('should capitalize custom object names', async () => {
      const mockMetadata: Map<string, AttioAttributeMetadata> = new Map();
      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);

      const result = await service.fetchSchema(['properties'], {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
        optionFetchDelayMs: 0,
      });

      expect(result.objects[0].displayName).toBe('Properties');
    });
  });
});
