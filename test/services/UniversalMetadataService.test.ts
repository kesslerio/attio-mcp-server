/**
 * Test suite for UniversalMetadataService
 *
 * Tests universal metadata and attribute operations extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getAttioClient } from '../../src/api/attio-client.js';
import { getAttioClient } from '../../src/api/attio-client.js';
import { getListAttributes } from '../../src/objects/lists.js';
import { getListAttributes } from '../../src/objects/lists.js';
import { UniversalMetadataService } from '../../src/services/UniversalMetadataService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';

// Mock the Attio client
vi.mock('../../src/api/attio-client.js', () => ({
  getAttioClient: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// Mock resource-specific attribute functions
vi.mock('../../src/objects/companies/index.js', () => ({
  getCompanyAttributes: vi.fn(),
  discoverCompanyAttributes: vi.fn(),
}));

vi.mock('../../src/objects/lists.js', () => ({
  getListAttributes: vi.fn(),
}));

import { getAttioClient } from '../../src/api/attio-client.js';
import {
  getCompanyAttributes,
  discoverCompanyAttributes,
} from '../../src/objects/companies/index.js';
import { getListAttributes } from '../../src/objects/lists.js';

describe('UniversalMetadataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverAttributesForResourceType', () => {
    it('should discover attributes for non-task resource types', async () => {
        {
          id: 'attr1',
          title: 'Test Attribute',
          api_slug: 'test_attribute',
          type: 'text',
        },
        {
          id: 'attr2',
          title: 'Another Attribute',
          api_slug: 'another_attribute',
          type: 'number',
        },
      ];

        get: vi.fn().mockResolvedValue({
          data: { data: mockAttributes },
        }),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

        await UniversalMetadataService.discoverAttributesForResourceType(
          UniversalResourceType.COMPANIES
        );

      expect(mockClient.get).toHaveBeenCalledWith(
        '/objects/companies/attributes'
      );
      expect(result).toEqual({
        attributes: mockAttributes,
        mappings: {
          'Test Attribute': 'test_attribute',
          'Another Attribute': 'another_attribute',
        },
        count: 2,
        resource_type: UniversalResourceType.COMPANIES,
      });
    });

    it('should handle task resource type with special discovery', async () => {
        await UniversalMetadataService.discoverAttributesForResourceType(
          UniversalResourceType.TASKS
        );

      expect(result).toHaveProperty('attributes');
      expect(result).toHaveProperty('mappings');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty(
        'resource_type',
        UniversalResourceType.TASKS
      );
      expect(result).toHaveProperty('api_endpoint', '/tasks');
      expect(result).toHaveProperty('supports_objects_api', false);

      // Check that task attributes are properly defined
      expect(Array.isArray(result.attributes)).toBe(true);
      expect((result.attributes as any[]).length).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
        get: vi.fn().mockRejectedValue(new Error('API Error')),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

      await expect(
        UniversalMetadataService.discoverAttributesForResourceType(
          UniversalResourceType.PEOPLE
        )
      ).rejects.toThrow('Failed to discover people attributes: API Error');
    });
  });

  describe('discoverTaskAttributes', () => {
    it('should return task-specific attributes', async () => {

      expect(result).toHaveProperty('attributes');
      expect(result).toHaveProperty('mappings');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty(
        'resource_type',
        UniversalResourceType.TASKS
      );

      // Verify specific task attributes are present

      expect(attributeSlugs).toContain('content');
      expect(attributeSlugs).toContain('status');
      expect(attributeSlugs).toContain('assignee');
      expect(attributeSlugs).toContain('due_date');
      expect(attributeSlugs).toContain('linked_records');
    });

    it('should create proper title to api_slug mappings', async () => {

      expect(mappings).toHaveProperty('Content', 'content');
      expect(mappings).toHaveProperty('Status', 'status');
      expect(mappings).toHaveProperty('Assignee', 'assignee');
      expect(mappings).toHaveProperty('Due Date', 'due_date');
    });
  });

  describe('getAttributesForRecord', () => {
    it('should get attributes for a specific record', async () => {
        name: 'Test Company',
        email: 'test@example.com',
        status: 'active',
      };

        get: vi.fn().mockResolvedValue({
          data: { data: { values: mockValues } },
        }),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

        UniversalResourceType.COMPANIES,
        'comp_123'
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        '/objects/companies/records/comp_123'
      );
      expect(result).toEqual(mockValues);
    });

    it('should handle missing record data', async () => {
        get: vi.fn().mockResolvedValue({
          data: { data: {} },
        }),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

        UniversalResourceType.PEOPLE,
        'person_456'
      );

      expect(result).toEqual({});
    });

    it('should handle API errors', async () => {
        get: vi.fn().mockRejectedValue(new Error('Record not found')),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

      await expect(
        UniversalMetadataService.getAttributesForRecord(
          UniversalResourceType.LISTS,
          'list_789'
        )
      ).rejects.toThrow('Failed to get record attributes: Record not found');
    });
  });

  describe('filterAttributesByCategory', () => {
    it('should return all attributes when no categories specified', () => {
        UniversalMetadataService.filterAttributesByCategory(attributes);
      expect(result).toEqual(attributes);
    });

    it('should filter array of attributes by category', () => {
        { name: 'attr1', category: 'contact' },
        { name: 'attr2', category: 'business' },
        { name: 'attr3', category: 'contact' },
      ];

        attributes,
        ['contact']
      );

      expect(result).toEqual([
        { name: 'attr1', category: 'contact' },
        { name: 'attr3', category: 'contact' },
      ]);
    });

    it('should filter object with attributes array', () => {
        attributes: [
          { name: 'attr1', type: 'contact' },
          { name: 'attr2', type: 'business' },
        ],
        count: 2,
      };

        attributes,
        ['contact']
      );

      expect(result).toEqual({
        attributes: [{ name: 'attr1', type: 'contact' }],
        count: 1,
      });
    });

    it('should handle multiple category field names', () => {
        { name: 'attr1', category: 'contact' },
        { name: 'attr2', type: 'business' },
        { name: 'attr3', attribute_type: 'social' },
        { name: 'attr4', group: 'contact' },
      ];

        attributes,
        ['contact', 'business']
      );

      expect(result).toEqual([
        { name: 'attr1', category: 'contact' },
        { name: 'attr2', type: 'business' },
        { name: 'attr4', group: 'contact' },
      ]);
    });
  });

  describe('getAttributes', () => {
    it('should get company attributes with record ID', async () => {
        company: 'Test Company',
        attributes: ['name', 'website'],
      };
      vi.mocked(getCompanyAttributes).mockResolvedValue(mockResult);

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(getCompanyAttributes).toHaveBeenCalledWith('comp_123');
      expect(result).toEqual(mockResult);
    });

    it('should discover company attributes without record ID', async () => {
      vi.mocked(discoverCompanyAttributes).mockResolvedValue(mockResult);

        resource_type: UniversalResourceType.COMPANIES,
      });

      expect(discoverCompanyAttributes).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should get list attributes', async () => {
      vi.mocked(getListAttributes).mockResolvedValue(mockResult);

        resource_type: UniversalResourceType.LISTS,
      });

      expect(getListAttributes).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should apply category filtering', async () => {
        standard: ['attr1'],
        custom: ['attr2'],
        all: [
          { name: 'attr1', category: 'contact', isCustom: false },
          { name: 'attr2', category: 'other', isCustom: true },
        ],
      };
      vi.mocked(discoverCompanyAttributes).mockResolvedValue(mockResult);

        resource_type: UniversalResourceType.COMPANIES,
        categories: ['contact'],
      });

      expect(result).toEqual({
        attributes: [{ name: 'attr1', category: 'contact', isCustom: false }],
        count: 1,
      });
    });

    it('should throw error for unsupported resource type', async () => {
      await expect(
        UniversalMetadataService.getAttributes({
          resource_type: 'unsupported' as any,
        })
      ).rejects.toThrow(
        'Unsupported resource type for get attributes: unsupported'
      );
    });
  });

  describe('discoverAttributes', () => {
    it('should discover company attributes', async () => {
      vi.mocked(discoverCompanyAttributes).mockResolvedValue(mockResult);

        UniversalResourceType.COMPANIES
      );

      expect(discoverCompanyAttributes).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should discover list attributes', async () => {
      vi.mocked(getListAttributes).mockResolvedValue(mockResult);

        UniversalResourceType.LISTS
      );

      expect(getListAttributes).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should discover task attributes', async () => {
        UniversalResourceType.TASKS
      );

      expect(result).toHaveProperty('attributes');
      expect(result).toHaveProperty(
        'resource_type',
        UniversalResourceType.TASKS
      );
    });

    it('should throw error for unsupported resource type', async () => {
      await expect(
        UniversalMetadataService.discoverAttributes('unsupported' as any)
      ).rejects.toThrow(
        'Unsupported resource type for discover attributes: unsupported'
      );
    });
  });

  describe('Integration with other resource types', () => {
    it('should handle people resource type for getAttributes', async () => {
        get: vi.fn().mockResolvedValue({
          data: { data: { values: { name: 'John Doe' } } },
        }),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person_123',
      });

      expect(result).toEqual({ name: 'John Doe' });
    });

    it('should handle records resource type for discovery', async () => {
        get: vi.fn().mockResolvedValue({
          data: { data: mockAttributes },
        }),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

        UniversalResourceType.RECORDS,
        { objectSlug: 'companies' }
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        '/objects/companies/attributes'
      );
      expect(result).toHaveProperty('attributes', mockAttributes);
    });

    it('should handle deals resource type', async () => {
        { id: 'deal_attr', api_slug: 'deal_attr', title: 'Deal Attribute' },
      ];
        get: vi.fn().mockResolvedValue({
          data: { data: mockAttributes },
        }),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

        UniversalResourceType.DEALS
      );

      expect(mockClient.get).toHaveBeenCalledWith('/objects/deals/attributes');
      expect(result).toHaveProperty('attributes', mockAttributes);
    });
  });
});
