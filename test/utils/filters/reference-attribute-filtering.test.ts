/**
 * Tests for reference attribute filtering support
 * Issue #904 Phase 2: Reference attributes (owner, assignee, company, person)
 * require nested field specification in Attio API filter syntax
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { transformFiltersToApiFormat } from '@/utils/filters/translators.js';
import * as attributeTypes from '@/api/attribute-types.js';

// Mock the attribute metadata module
vi.mock('@/api/attribute-types.js', () => ({
  getAttributeTypeInfo: vi.fn(),
}));

describe('Reference Attribute Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UUID-based reference filtering', () => {
    test('should transform owner filter with UUID to record_id field', async () => {
      // Mock owner as a record-reference type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'object',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'record-reference',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'owner',
          },
          api_slug: 'owner',
          title: 'Owner',
          type: 'record-reference',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: '550e8400-e29b-41d4-a716-446655440000',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      expect(result).toEqual({
        filter: {
          owner: {
            record_id: {
              $eq: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      });
    });

    test('should transform assignee filter with UUID to record_id field', async () => {
      // Mock assignee as an actor-reference type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'actor-reference',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'tasks',
            attribute_id: 'assignee',
          },
          api_slug: 'assignee',
          title: 'Assignee',
          type: 'actor-reference',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'assignee' },
            condition: 'equals' as const,
            value: '650e8400-e29b-41d4-a716-446655440001',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'tasks'
      );

      expect(result).toEqual({
        filter: {
          assignee: {
            record_id: {
              $eq: '650e8400-e29b-41d4-a716-446655440001',
            },
          },
        },
      });
    });
  });

  describe('Name-based reference filtering', () => {
    test('should transform owner filter with name to name field', async () => {
      // Mock owner as a record-reference type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'object',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'record-reference',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'owner',
          },
          api_slug: 'owner',
          title: 'Owner',
          type: 'record-reference',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: 'Martin Kessler',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      expect(result).toEqual({
        filter: {
          owner: {
            name: {
              $eq: 'Martin Kessler',
            },
          },
        },
      });
    });

    test('should transform company filter with name to name field', async () => {
      // Mock company as a record-reference type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'object',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'record-reference',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'people',
            attribute_id: 'company',
          },
          api_slug: 'company',
          title: 'Company',
          type: 'record-reference',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'company' },
            condition: 'equals' as const,
            value: 'Acme Corp',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'people'
      );

      expect(result).toEqual({
        filter: {
          company: {
            name: {
              $eq: 'Acme Corp',
            },
          },
        },
      });
    });
  });

  describe('Workspace member reference filtering', () => {
    test('should use email field for workspace-member type', async () => {
      // Mock as workspace-member type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'workspace-member',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'tasks',
            attribute_id: 'assignee_id',
          },
          api_slug: 'assignee_id',
          title: 'Assignee',
          type: 'workspace-member',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'assignee_id' },
            condition: 'equals' as const,
            value: 'user@example.com',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'tasks'
      );

      expect(result).toEqual({
        filter: {
          assignee_id: {
            email: {
              $eq: 'user@example.com',
            },
          },
        },
      });
    });
  });

  describe('Combined filters (simple + reference)', () => {
    test('should handle stage + owner combined filters', async () => {
      // Mock different types for different attributes
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockImplementation(
        async (resourceType: string, attributeSlug: string) => {
          if (attributeSlug === 'stage') {
            return {
              fieldType: 'string',
              isArray: false,
              isRequired: false,
              isUnique: false,
              attioType: 'select',
              metadata: {
                id: {
                  workspace_id: 'test',
                  object_id: 'deals',
                  attribute_id: 'stage',
                },
                api_slug: 'stage',
                title: 'Stage',
                type: 'select',
              },
            };
          } else if (attributeSlug === 'owner') {
            return {
              fieldType: 'object',
              isArray: false,
              isRequired: false,
              isUnique: false,
              attioType: 'record-reference',
              metadata: {
                id: {
                  workspace_id: 'test',
                  object_id: 'deals',
                  attribute_id: 'owner',
                },
                api_slug: 'owner',
                title: 'Owner',
                type: 'record-reference',
              },
            };
          }
          throw new Error(`Unknown attribute: ${attributeSlug}`);
        }
      );

      const filter = {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'equals' as const,
            value: 'Demo',
          },
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: 'Martin Kessler',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      expect(result).toEqual({
        filter: {
          stage: {
            $eq: 'Demo',
          },
          owner: {
            name: {
              $eq: 'Martin Kessler',
            },
          },
        },
      });
    });

    test('should handle multiple reference attributes', async () => {
      // Mock all as record-reference types
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockImplementation(
        async (resourceType: string, attributeSlug: string) => {
          return {
            fieldType: 'object',
            isArray: false,
            isRequired: false,
            isUnique: false,
            attioType: 'record-reference',
            metadata: {
              id: {
                workspace_id: 'test',
                object_id: resourceType,
                attribute_id: attributeSlug,
              },
              api_slug: attributeSlug,
              title: attributeSlug,
              type: 'record-reference',
            },
          };
        }
      );

      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: '550e8400-e29b-41d4-a716-446655440000',
          },
          {
            attribute: { slug: 'company' },
            condition: 'equals' as const,
            value: 'Acme Corp',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      expect(result).toEqual({
        filter: {
          owner: {
            record_id: {
              $eq: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
          company: {
            name: {
              $eq: 'Acme Corp',
            },
          },
        },
      });
    });
  });

  describe('Non-reference attributes (regression test)', () => {
    test('should continue to work for simple attributes', async () => {
      // Mock as a simple select type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'select',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'select',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'stage' },
            condition: 'equals' as const,
            value: 'Demo',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      expect(result).toEqual({
        filter: {
          stage: {
            $eq: 'Demo',
          },
        },
      });
    });

    test('should work without resourceType (backward compatibility)', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains' as const,
            value: 'Test',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(filter, true, false);

      expect(result).toEqual({
        filter: {
          name: {
            $contains: 'Test',
          },
        },
      });
    });
  });

  describe('OR logic with reference attributes', () => {
    test('should handle OR filters with reference attributes', async () => {
      // Mock as record-reference type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'object',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'record-reference',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'owner',
          },
          api_slug: 'owner',
          title: 'Owner',
          type: 'record-reference',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: 'User A',
          },
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: 'User B',
          },
        ],
        matchAny: true,
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      expect(result).toEqual({
        filter: {
          $or: [
            {
              owner: {
                name: {
                  $eq: 'User A',
                },
              },
            },
            {
              owner: {
                name: {
                  $eq: 'User B',
                },
              },
            },
          ],
        },
      });
    });
  });
});
