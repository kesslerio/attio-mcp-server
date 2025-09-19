import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listWorkspaceMembers,
  searchWorkspaceMembers,
  getWorkspaceMember,
} from '../../../src/objects/workspace-members.js';
import { WorkspaceMemberMockFactory } from '../../utils/mock-factories/WorkspaceMemberMockFactory.js';

// Helper function for checking example.com email domain
function isExampleDotComEmail(email?: string) {
  if (!email) return false;
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).toLowerCase();
  return domain === 'example.com';
}

// Mock the shouldUseMockData function to always return true for unit tests
vi.mock('../../../src/services/create/index.js', () => ({
  shouldUseMockData: () => true,
}));

describe('Workspace Members Objects Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listWorkspaceMembers', () => {
    it('should return mock workspace members', async () => {
      const result = await listWorkspaceMembers();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify structure of first member
      const firstMember = result[0];
      expect(firstMember).toHaveProperty('id');
      expect(firstMember.id).toHaveProperty('workspace_member_id');
      expect(firstMember).toHaveProperty('first_name');
      expect(firstMember).toHaveProperty('last_name');
      expect(firstMember).toHaveProperty('email_address');
      expect(firstMember).toHaveProperty('access_level');
    });

    it('should filter results when search is provided', async () => {
      const result = await listWorkspaceMembers('john');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should contain members matching the search
      const hasMatchingMember = result.some(
        (member) =>
          member.first_name?.toLowerCase().includes('john') ||
          member.last_name?.toLowerCase().includes('john') ||
          member.email_address?.toLowerCase().includes('john')
      );
      expect(hasMatchingMember).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const result = await listWorkspaceMembers(undefined, 1, 10);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('searchWorkspaceMembers', () => {
    it('should search workspace members by query', async () => {
      const result = await searchWorkspaceMembers('jane');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return filtered results for search query', async () => {
      // Note: Searching for 'example.com' as email domain filter (not URL validation)
      const result = await searchWorkspaceMembers('example.com');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should contain members with matching email domain
      const hasMatchingEmail = result.some((member) =>
        isExampleDotComEmail(member.email_address)
      );
      expect(hasMatchingEmail).toBe(true);
    });
  });

  describe('getWorkspaceMember', () => {
    it('should return a single workspace member', async () => {
      const memberId = 'test-member-id';
      const result = await getWorkspaceMember(memberId);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result.id.workspace_member_id).toBe(memberId);
      expect(result).toHaveProperty('first_name');
      expect(result).toHaveProperty('last_name');
      expect(result).toHaveProperty('email_address');
      expect(result).toHaveProperty('access_level');
    });

    it('should return workspace member with correct structure', async () => {
      const result = await getWorkspaceMember('test-id');

      expect(result.id).toHaveProperty('workspace_member_id');
      expect(result.id).toHaveProperty('workspace_id');
      expect(typeof result.first_name).toBe('string');
      expect(typeof result.last_name).toBe('string');
      expect(typeof result.email_address).toBe('string');
      expect(['admin', 'editor', 'viewer', 'guest']).toContain(
        result.access_level
      );
      expect(typeof result.created_at).toBe('string');
      expect(typeof result.updated_at).toBe('string');
    });
  });
});
