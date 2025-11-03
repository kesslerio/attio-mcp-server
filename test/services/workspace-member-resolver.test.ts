/**
 * Unit tests for Workspace Member Resolver Service
 *
 * Tests auto-resolution of email addresses and names to workspace member UUIDs
 * for actor-reference attribute filtering.
 *
 * Part of PR #904 Phase 2: Actor-Reference Auto-Resolution
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  resolveWorkspaceMemberUUID,
  createWorkspaceMemberCache,
} from '../../src/services/workspace-member-resolver.js';
import { FilterValidationError } from '../../src/errors/api-errors.js';
import type { AttioWorkspaceMember } from '../../src/types/attio.js';

// Mock the workspace members module
vi.mock('../../src/objects/workspace-members.js', () => ({
  searchWorkspaceMembers: vi.fn(),
}));

import { searchWorkspaceMembers } from '../../src/objects/workspace-members.js';

describe('Workspace Member Resolver Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveWorkspaceMemberUUID', () => {
    describe('Successful Resolution', () => {
      test('should resolve email to UUID', async () => {
        // Mock successful search with single result
        const mockMember: AttioWorkspaceMember = {
          id: {
            workspace_member_id: 'd28a35f1-5788-49f9-a320-6c8c353147d8',
            workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
          },
          email_address: 'martin@shapescale.com',
          first_name: 'Martin',
          last_name: 'Kessler',
          access_level: 'admin',
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
        };

        vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

        const uuid = await resolveWorkspaceMemberUUID('martin@shapescale.com');

        expect(uuid).toBe('d28a35f1-5788-49f9-a320-6c8c353147d8');
        expect(searchWorkspaceMembers).toHaveBeenCalledWith(
          'martin@shapescale.com'
        );
        expect(searchWorkspaceMembers).toHaveBeenCalledTimes(1);
      });

      test('should resolve name to UUID', async () => {
        const mockMember: AttioWorkspaceMember = {
          id: {
            workspace_member_id: '7c1f9f3a-a404-44d9-8359-1e8f0ab760e6',
            workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
          },
          email_address: 'xavier@shapescale.com',
          first_name: 'Xavier',
          last_name: 'Ducourneau',
          access_level: 'admin',
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
        };

        vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

        const uuid = await resolveWorkspaceMemberUUID('Xavier Ducourneau');

        expect(uuid).toBe('7c1f9f3a-a404-44d9-8359-1e8f0ab760e6');
        expect(searchWorkspaceMembers).toHaveBeenCalledWith(
          'Xavier Ducourneau'
        );
      });

      test('should handle names with special characters', async () => {
        const mockMember: AttioWorkspaceMember = {
          id: {
            workspace_member_id: 'test-uuid-123',
            workspace_id: 'workspace-123',
          },
          email_address: 'jose@example.com',
          first_name: 'José',
          last_name: "O'Brien-Smith",
          access_level: 'user',
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
        };

        vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

        const uuid = await resolveWorkspaceMemberUUID("José O'Brien-Smith");

        expect(uuid).toBe('test-uuid-123');
      });

      test('should filter fuzzy search results to exact email match', async () => {
        // Simulate Attio API returning all members with same domain
        const mockMembers: AttioWorkspaceMember[] = [
          {
            id: {
              workspace_member_id: '4ad85b41-bbe6-4ae7-a4cc-4c1ca0b53cbc',
              workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
            },
            email_address: 'alex@shapescale.com',
            first_name: 'Alex',
            last_name: 'Wayenberg',
            access_level: 'suspended',
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          },
          {
            id: {
              workspace_member_id: '61678ae0-3049-43b6-97fe-aea91e4254e5',
              workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
            },
            email_address: 'lilla@shapescale.com',
            first_name: 'Lilla',
            last_name: 'Laczo',
            access_level: 'admin',
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          },
          {
            id: {
              workspace_member_id: 'd28a35f1-5788-49f9-a320-6c8c353147d8',
              workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
            },
            email_address: 'martin@shapescale.com',
            first_name: 'Martin',
            last_name: 'Kessler',
            access_level: 'admin',
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          },
          {
            id: {
              workspace_member_id: '7c1f9f3a-a404-44d9-8359-1e8f0ab760e6',
              workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
            },
            email_address: 'xavier@shapescale.com',
            first_name: 'Xavier',
            last_name: 'Ducourneau',
            access_level: 'admin',
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          },
          {
            id: {
              workspace_member_id: 'ae9339e1-2eea-4d85-af9e-c6206fe78fee',
              workspace_id: 'fa02d59a-674a-4e08-9fbe-4c82cbbe80d7',
            },
            email_address: 'kate@shapescale.com',
            first_name: 'Kate',
            last_name: 'Wayenberg',
            access_level: 'admin',
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          },
        ];

        vi.mocked(searchWorkspaceMembers).mockResolvedValue(mockMembers);

        // Should filter to exact email match
        const uuid = await resolveWorkspaceMemberUUID('martin@shapescale.com');

        expect(uuid).toBe('d28a35f1-5788-49f9-a320-6c8c353147d8');
        expect(searchWorkspaceMembers).toHaveBeenCalledWith(
          'martin@shapescale.com'
        );
      });
    });

    describe('Cache Behavior', () => {
      test('should use cache on subsequent calls', async () => {
        const mockMember: AttioWorkspaceMember = {
          id: {
            workspace_member_id: 'uuid-123',
            workspace_id: 'workspace-123',
          },
          email_address: 'kate@shapescale.com',
          first_name: 'Kate',
          last_name: 'Wayenberg',
          access_level: 'admin',
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
        };

        vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

        const cache = createWorkspaceMemberCache();

        // First call - should hit API
        const uuid1 = await resolveWorkspaceMemberUUID(
          'kate@shapescale.com',
          cache
        );
        expect(uuid1).toBe('uuid-123');
        expect(searchWorkspaceMembers).toHaveBeenCalledTimes(1);

        // Second call - should use cache
        const uuid2 = await resolveWorkspaceMemberUUID(
          'kate@shapescale.com',
          cache
        );
        expect(uuid2).toBe('uuid-123');
        expect(searchWorkspaceMembers).toHaveBeenCalledTimes(1); // Still 1, not 2!
      });

      test('should normalize cache keys (case-insensitive)', async () => {
        const mockMember: AttioWorkspaceMember = {
          id: {
            workspace_member_id: 'uuid-456',
            workspace_id: 'workspace-456',
          },
          email_address: 'alex@shapescale.com',
          first_name: 'Alex',
          last_name: 'Wayenberg',
          access_level: 'suspended',
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
        };

        vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

        const cache = createWorkspaceMemberCache();

        // Different case variations should hit same cache entry
        await resolveWorkspaceMemberUUID('alex@shapescale.com', cache);
        await resolveWorkspaceMemberUUID('ALEX@SHAPESCALE.COM', cache);
        await resolveWorkspaceMemberUUID('Alex@ShapeScale.com', cache);

        expect(searchWorkspaceMembers).toHaveBeenCalledTimes(1);
      });

      test('should handle whitespace in cache keys', async () => {
        const mockMember: AttioWorkspaceMember = {
          id: {
            workspace_member_id: 'uuid-789',
            workspace_id: 'workspace-789',
          },
          email_address: 'lilla@shapescale.com',
          first_name: 'Lilla',
          last_name: 'Laczo',
          access_level: 'admin',
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
        };

        vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

        const cache = createWorkspaceMemberCache();

        // Trailing/leading whitespace should be normalized
        await resolveWorkspaceMemberUUID('  lilla@shapescale.com  ', cache);
        await resolveWorkspaceMemberUUID('lilla@shapescale.com', cache);

        expect(searchWorkspaceMembers).toHaveBeenCalledTimes(1);
      });
    });

    describe('Error Handling', () => {
      test('should throw FilterValidationError when member not found', async () => {
        vi.mocked(searchWorkspaceMembers).mockResolvedValue([]);

        await expect(
          resolveWorkspaceMemberUUID('nonexistent@example.com')
        ).rejects.toThrow(FilterValidationError);

        await expect(
          resolveWorkspaceMemberUUID('nonexistent@example.com')
        ).rejects.toThrow(
          'Workspace member not found: "nonexistent@example.com"'
        );
      });

      test('should throw FilterValidationError when multiple matches found', async () => {
        const mockMembers: AttioWorkspaceMember[] = [
          {
            id: {
              workspace_member_id: 'uuid-1',
              workspace_id: 'workspace-1',
            },
            email_address: 'john.smith@example.com',
            first_name: 'John',
            last_name: 'Smith',
            access_level: 'user',
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          },
          {
            id: {
              workspace_member_id: 'uuid-2',
              workspace_id: 'workspace-1',
            },
            email_address: 'john.doe@example.com',
            first_name: 'John',
            last_name: 'Doe',
            access_level: 'user',
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          },
          {
            id: {
              workspace_member_id: 'uuid-3',
              workspace_id: 'workspace-1',
            },
            email_address: 'john.johnson@example.com',
            first_name: 'John',
            last_name: 'Johnson',
            access_level: 'user',
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          },
        ];

        vi.mocked(searchWorkspaceMembers).mockResolvedValue(mockMembers);

        await expect(resolveWorkspaceMemberUUID('John')).rejects.toThrow(
          FilterValidationError
        );

        await expect(resolveWorkspaceMemberUUID('John')).rejects.toThrow(
          /Ambiguous workspace member: "John" matches 3 members/
        );

        await expect(resolveWorkspaceMemberUUID('John')).rejects.toThrow(
          /John Smith.*john.smith@example.com/
        );
      });

      test('should limit ambiguous matches list to 5 members', async () => {
        const mockMembers: AttioWorkspaceMember[] = Array.from(
          { length: 10 },
          (_, i) => ({
            id: {
              workspace_member_id: `uuid-${i}`,
              workspace_id: 'workspace-1',
            },
            email_address: `user${i}@example.com`,
            first_name: 'Test',
            last_name: `User${i}`,
            access_level: 'user' as const,
            avatar_url: null,
            created_at: '2023-01-01T00:00:00.000Z',
          })
        );

        vi.mocked(searchWorkspaceMembers).mockResolvedValue(mockMembers);

        const error = await resolveWorkspaceMemberUUID('Test').catch((e) => e);

        expect(error).toBeInstanceOf(FilterValidationError);
        expect(error.message).toContain('matches 10 members');
        expect(error.message).toContain('... and more'); // Truncation indicator
      });

      test('should handle API errors gracefully', async () => {
        vi.mocked(searchWorkspaceMembers).mockRejectedValue(
          new Error('Network timeout')
        );

        await expect(
          resolveWorkspaceMemberUUID('test@example.com')
        ).rejects.toThrow(FilterValidationError);

        await expect(
          resolveWorkspaceMemberUUID('test@example.com')
        ).rejects.toThrow(
          /Failed to resolve workspace member.*Network timeout/
        );
      });
    });

    describe('Edge Cases', () => {
      test('should handle empty first/last names', async () => {
        const mockMember: AttioWorkspaceMember = {
          id: {
            workspace_member_id: 'uuid-no-name',
            workspace_id: 'workspace-1',
          },
          email_address: 'nofirst@example.com',
          first_name: undefined,
          last_name: undefined,
          access_level: 'user',
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
        };

        vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

        const uuid = await resolveWorkspaceMemberUUID('nofirst@example.com');

        expect(uuid).toBe('uuid-no-name');
      });

      test('should handle partial names', async () => {
        const mockMember: AttioWorkspaceMember = {
          id: {
            workspace_member_id: 'uuid-partial',
            workspace_id: 'workspace-1',
          },
          email_address: 'partial@example.com',
          first_name: 'OnlyFirst',
          last_name: undefined,
          access_level: 'user',
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
        };

        vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

        const uuid = await resolveWorkspaceMemberUUID('OnlyFirst');

        expect(uuid).toBe('uuid-partial');
      });
    });
  });

  describe('createWorkspaceMemberCache', () => {
    test('should create an empty Map', () => {
      const cache = createWorkspaceMemberCache();

      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(0);
    });

    test('should create independent cache instances', () => {
      const cache1 = createWorkspaceMemberCache();
      const cache2 = createWorkspaceMemberCache();

      cache1.set('test@example.com', 'uuid-1');

      expect(cache1.size).toBe(1);
      expect(cache2.size).toBe(0);
      expect(cache1).not.toBe(cache2);
    });
  });
});
