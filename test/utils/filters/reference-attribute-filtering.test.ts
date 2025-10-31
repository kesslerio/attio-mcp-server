/**
 * Tests for reference attribute filtering support
 * Issue #904 Phase 2: Reference attributes (owner, assignee, company, person)
 * require nested field specification in Attio API filter syntax
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { transformFiltersToApiFormat } from '@/utils/filters/translators.js';
import * as attributeTypes from '@/api/attribute-types.js';
import {
  FilterValidationError,
  FilterErrorCategory,
} from '@/errors/api-errors.js';

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

    test('should transform assignee filter with UUID for actor-reference', async () => {
      // Mock assignee as an actor-reference type (workspace member reference)
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
            value: '550e8400-e29b-41d4-a716-446655440000', // Actor-reference requires UUID
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'tasks'
      );

      // Actor-reference uses direct property matching (no operator nesting)
      expect(result).toEqual({
        filter: {
          assignee: {
            referenced_actor_type: 'workspace-member',
            referenced_actor_id: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
      });
    });
  });

  describe('Name-based reference filtering', () => {
    test('should transform company filter with name to name field', async () => {
      // Mock company as a record-reference type (can use name field)
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

    test('should transform owner (actor-reference) with UUID', async () => {
      // Mock owner as an actor-reference type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'actor-reference',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'owner',
          },
          api_slug: 'owner',
          title: 'Owner',
          type: 'actor-reference',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: '550e8400-e29b-41d4-a716-446655440000', // Actor-reference requires UUID
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      // Actor-reference uses direct property matching (no operator nesting)
      expect(result).toEqual({
        filter: {
          owner: {
            referenced_actor_type: 'workspace-member',
            referenced_actor_id: '550e8400-e29b-41d4-a716-446655440000',
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
              attioType: 'actor-reference', // owner is workspace member reference
              metadata: {
                id: {
                  workspace_id: 'test',
                  object_id: 'deals',
                  attribute_id: 'owner',
                },
                api_slug: 'owner',
                title: 'Owner',
                type: 'actor-reference',
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
            value: '550e8400-e29b-41d4-a716-446655440000', // Actor-reference requires UUID
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
            // Actor-reference uses direct property matching (no operator nesting)
            referenced_actor_type: 'workspace-member',
            referenced_actor_id: '550e8400-e29b-41d4-a716-446655440000',
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

  describe('Slug-based fallback (no resourceType)', () => {
    test('should accept name for owner slug and use name field', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: 'Martin Kessler', // Now allowed: fallback uses name
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined
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

    test('should use name field for owner slug with email value (no resourceType)', async () => {
      // Without resourceType, can't detect actor-reference type
      // Falls back to heuristic: non-UUID values use name field
      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: 'martin@example.com',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined
      );

      expect(result).toEqual({
        filter: {
          owner: {
            name: {
              // Heuristic fallback: non-UUID values use name field
              $eq: 'martin@example.com',
            },
          },
        },
      });
    });

    test('should require email for workspace member slugs (assignee_id)', async () => {
      // assignee_id is a workspace-member slug that ALWAYS requires email
      const filter = {
        filters: [
          {
            attribute: { slug: 'assignee_id' },
            condition: 'equals' as const,
            value: '550e8400-e29b-41d4-a716-446655440000', // Invalid - not email
          },
        ],
      };

      await expect(() =>
        transformFiltersToApiFormat(filter, true, false, undefined)
      ).rejects.toThrow(FilterValidationError);

      await expect(() =>
        transformFiltersToApiFormat(filter, true, false, undefined)
      ).rejects.toThrow(/Invalid email format.*assignee_id/);
    });

    test('should not apply reference handling to non-reference slugs', async () => {
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
        undefined
      );

      expect(result).toEqual({
        filter: {
          stage: {
            $eq: 'Demo',
          },
        },
      });
    });
  });

  describe('Array value validation', () => {
    test('should reject array values for reference attributes', async () => {
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
            value: ['User A', 'User B'], // Array value - should be rejected
          },
        ],
      };

      await expect(() =>
        transformFiltersToApiFormat(filter, true, false, 'deals')
      ).rejects.toThrow(FilterValidationError);

      await expect(() =>
        transformFiltersToApiFormat(filter, true, false, 'deals')
      ).rejects.toThrow(/Array values are not supported/);
    });
  });

  describe('Email validation for workspace-member fields', () => {
    test('should validate email format for workspace_member attribute', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'workspace_member' },
            condition: 'equals' as const,
            value: 'not-an-email', // Invalid email
          },
        ],
      };

      await expect(() =>
        transformFiltersToApiFormat(filter, true, false, 'tasks')
      ).rejects.toThrow(FilterValidationError);

      await expect(() =>
        transformFiltersToApiFormat(filter, true, false, 'tasks')
      ).rejects.toThrow(/Invalid email format/);
    });

    test('should accept valid email for workspace_member attribute', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'workspace_member' },
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
          workspace_member: {
            email: {
              $eq: 'user@example.com',
            },
          },
        },
      });
    });

    test('should validate email format for assignee_id attribute', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'assignee_id' },
            condition: 'equals' as const,
            value: 'invalid@',
          },
        ],
      };

      await expect(() =>
        transformFiltersToApiFormat(filter, true, false, 'tasks')
      ).rejects.toThrow(FilterValidationError);

      await expect(() =>
        transformFiltersToApiFormat(filter, true, false, 'tasks')
      ).rejects.toThrow(/Invalid email format/);
    });
  });

  describe('Additional reference types in list-entry context', () => {
    test('should handle assignee in list entries without resourceType', async () => {
      // Without resourceType, assignee slug uses heuristic detection
      // (assignee_id would require email, but assignee uses heuristic)
      const filter = {
        filters: [
          {
            attribute: { slug: 'assignee' },
            condition: 'equals' as const,
            value: 'jane@example.com',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined
      );

      expect(result).toEqual({
        filter: {
          assignee: {
            name: {
              // Heuristic fallback: non-UUID values use name field
              $eq: 'jane@example.com',
            },
          },
        },
      });
    });

    test('should handle company in list entries without resourceType', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'company' },
            condition: 'equals' as const,
            value: 'Tech Corp',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined
      );

      expect(result).toEqual({
        filter: {
          company: {
            name: {
              $eq: 'Tech Corp',
            },
          },
        },
      });
    });

    test('should handle person in list entries without resourceType', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'person' },
            condition: 'equals' as const,
            value: 'John Smith',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined
      );

      expect(result).toEqual({
        filter: {
          person: {
            name: {
              $eq: 'John Smith',
            },
          },
        },
      });
    });

    test('should handle primary_contact with UUID in list entries', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'primary_contact' },
            condition: 'equals' as const,
            value: '550e8400-e29b-41d4-a716-446655440000',
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined
      );

      expect(result).toEqual({
        filter: {
          primary_contact: {
            record_id: {
              $eq: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      });
    });
  });
});
