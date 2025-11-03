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

    test('should transform owner (actor-reference) with email', async () => {
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
            value: 'martin@example.com', // Email value
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      // Actor-reference with email uses nested field specification
      expect(result).toEqual({
        filter: {
          owner: {
            email: {
              $eq: 'martin@example.com',
            },
          },
        },
      });
    });

    test('should transform owner (actor-reference) with name', async () => {
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
            value: 'Martin Kessler', // Name value
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      // Actor-reference with name uses nested field specification
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
                config: {
                  select: {
                    options: [
                      {
                        id: '1',
                        title: 'Demo',
                        value: 'demo',
                        is_archived: false,
                      },
                      {
                        id: '2',
                        title: 'Negotiation',
                        value: 'negotiation',
                        is_archived: false,
                      },
                    ],
                  },
                },
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
          config: {
            select: {
              options: [
                { id: '1', title: 'Demo', value: 'demo', is_archived: false },
              ],
            },
          },
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
            email: {
              // P1 Fix: Email detection now works in fallback (was incorrectly using name field)
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

  describe('Array value handling (preparatory for in/not_in operators)', () => {
    test('should handle array values for reference attributes', async () => {
      // NOTE: This test validates array handling in determineReferenceField(),
      // which is preparatory work for when 'in'/'not_in' operators are added
      // to FilterConditionType enum (Issue #904 P1 review comment).
      // Currently, arrays shouldn't reach this code path in production since
      // 'in'/'not_in' are not exposed in the MCP interface yet.

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
            value: ['User A', 'User B'], // Array value (for future in/not_in support)
          },
        ],
      };

      // Array handling is now supported - detects if all elements are UUIDs
      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'deals'
      );

      // Should use name field since elements are not UUIDs
      expect(result).toEqual({
        filter: {
          owner: {
            name: {
              $eq: ['User A', 'User B'],
            },
          },
        },
      });
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
            email: {
              // P1 Fix: Email detection now works in fallback (was incorrectly using name field)
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

    // P1 Fix: Actor-reference slugs with UUID in list entry context
    test('should handle owner with UUID in list entries using actor-reference structure', async () => {
      // When resourceType unavailable (list entries), owner with UUID should use
      // referenced_actor_id field (not record_id) to generate correct actor-reference structure
      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: '770e8400-e29b-41d4-a716-446655440002', // workspace member UUID
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined // resourceType unavailable → slug-based fallback
      );

      // Should generate actor-reference structure, not record_id structure
      expect(result).toEqual({
        filter: {
          owner: {
            referenced_actor_type: 'workspace-member',
            referenced_actor_id: '770e8400-e29b-41d4-a716-446655440002',
          },
        },
      });
    });

    test('should handle assignee with UUID in list entries using actor-reference structure', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'assignee' },
            condition: 'equals' as const,
            value: '880e8400-e29b-41d4-a716-446655440003', // workspace member UUID
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined // resourceType unavailable → slug-based fallback
      );

      // Should generate actor-reference structure
      expect(result).toEqual({
        filter: {
          assignee: {
            referenced_actor_type: 'workspace-member',
            referenced_actor_id: '880e8400-e29b-41d4-a716-446655440003',
          },
        },
      });
    });

    test('should handle owner with email in list entries', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: 'user@example.com', // email value
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined
      );

      // Email values use email field (not referenced_actor_id)
      expect(result).toEqual({
        filter: {
          owner: {
            email: {
              $eq: 'user@example.com',
            },
          },
        },
      });
    });

    test('should handle owner with name in list entries', async () => {
      const filter = {
        filters: [
          {
            attribute: { slug: 'owner' },
            condition: 'equals' as const,
            value: 'John Doe', // plain text name
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        undefined
      );

      // Name values use name field
      expect(result).toEqual({
        filter: {
          owner: {
            name: {
              $eq: 'John Doe',
            },
          },
        },
      });
    });
  });

  // NOTE: These tests are skipped because 'in'/'not_in' operators are not yet
  // exposed in the FilterConditionType enum. They will be enabled when Issue #904
  // adds support for these operators in the MCP interface.
  describe.skip('Array-valued reference filtering (in/not_in operators - FUTURE)', () => {
    test('should transform company reference with array of UUIDs to record_id field', async () => {
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
            condition: 'in' as const,
            value: [
              '550e8400-e29b-41d4-a716-446655440000',
              '660e8400-e29b-41d4-a716-446655440001',
            ],
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
            record_id: {
              $in: [
                '550e8400-e29b-41d4-a716-446655440000',
                '660e8400-e29b-41d4-a716-446655440001',
              ],
            },
          },
        },
      });
    });

    test('should transform company reference with array of names to name field', async () => {
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
            condition: 'in' as const,
            value: ['Tech Corp', 'Acme Inc', 'Global Systems'],
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
              $in: ['Tech Corp', 'Acme Inc', 'Global Systems'],
            },
          },
        },
      });
    });

    test('should reject mixed array (UUID + name) with validation error', async () => {
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
            condition: 'in' as const,
            value: [
              '550e8400-e29b-41d4-a716-446655440000', // UUID
              'Tech Corp', // Name
            ],
          },
        ],
      };

      // Mixed arrays should throw validation error (prevents silent failures)
      await expect(
        transformFiltersToApiFormat(filter, true, false, 'people')
      ).rejects.toThrow(FilterValidationError);

      await expect(
        transformFiltersToApiFormat(filter, true, false, 'people')
      ).rejects.toThrow(/Mixed UUID and non-UUID values not supported/);
    });

    test('should handle empty array by defaulting to name field', async () => {
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
            condition: 'in' as const,
            value: [],
          },
        ],
      };

      const result = await transformFiltersToApiFormat(
        filter,
        true,
        false,
        'people'
      );

      // Empty array defaults to name field
      expect(result).toEqual({
        filter: {
          company: {
            name: {
              $in: [],
            },
          },
        },
      });
    });

    test('should transform person reference with array of UUIDs using not_in operator', async () => {
      // Mock person as a record-reference type
      vi.mocked(attributeTypes.getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'object',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'record-reference',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'tasks',
            attribute_id: 'person',
          },
          api_slug: 'person',
          title: 'Person',
          type: 'record-reference',
        },
      });

      const filter = {
        filters: [
          {
            attribute: { slug: 'person' },
            condition: 'not_in' as const,
            value: [
              '770e8400-e29b-41d4-a716-446655440002',
              '880e8400-e29b-41d4-a716-446655440003',
            ],
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
          person: {
            record_id: {
              $not_in: [
                '770e8400-e29b-41d4-a716-446655440002',
                '880e8400-e29b-41d4-a716-446655440003',
              ],
            },
          },
        },
      });
    });
  });
});
