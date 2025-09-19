import {
  listWorkspaceMembers as apiList,
  searchWorkspaceMembers as apiSearch,
  getWorkspaceMember as apiGet,
} from '../api/operations/workspace-members.js';
import { AttioWorkspaceMember } from '../types/attio.js';
import { shouldUseMockData } from '../services/create/index.js';

export async function listWorkspaceMembers(
  search?: string,
  page = 1,
  pageSize = 25
): Promise<AttioWorkspaceMember[]> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger(
        'objects.workspace-members',
        'listWorkspaceMembers'
      ).debug('Using mock data for workspace members list');
    }

    // Generate mock workspace members
    const mockMembers: AttioWorkspaceMember[] = [
      {
        id: {
          workspace_member_id: 'mock-member-1',
          workspace_id: 'mock-workspace-id',
        },
        first_name: 'John',
        last_name: 'Doe',
        email_address: 'john.doe@example.com',
        access_level: 'admin' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: {
          workspace_member_id: 'mock-member-2',
          workspace_id: 'mock-workspace-id',
        },
        first_name: 'Jane',
        last_name: 'Smith',
        email_address: 'jane.smith@example.com',
        access_level: 'editor' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      return mockMembers.filter(
        (member) =>
          member.first_name?.toLowerCase().includes(searchLower) ||
          member.last_name?.toLowerCase().includes(searchLower) ||
          member.email_address?.toLowerCase().includes(searchLower)
      );
    }

    return mockMembers;
  }

  return apiList(search, page, pageSize);
}

export async function searchWorkspaceMembers(
  query: string
): Promise<AttioWorkspaceMember[]> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger(
        'objects.workspace-members',
        'searchWorkspaceMembers'
      ).debug('Using mock data for workspace members search');
    }

    // Use the list function with search parameter for mocks
    return listWorkspaceMembers(query);
  }

  return apiSearch(query);
}

export async function getWorkspaceMember(
  memberId: string
): Promise<AttioWorkspaceMember> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger(
        'objects.workspace-members',
        'getWorkspaceMember'
      ).debug('Using mock data for workspace member get');
    }

    // Return mock workspace member
    return {
      id: {
        workspace_member_id: memberId,
        workspace_id: 'mock-workspace-id',
      },
      first_name: 'Mock',
      last_name: 'User',
      email_address: 'mock.user@example.com',
      access_level: 'editor' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AttioWorkspaceMember;
  }

  return apiGet(memberId);
}
