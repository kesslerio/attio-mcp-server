import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workspaceMembersToolConfigs } from '@/handlers/tool-configs/workspace-members.js';
import {
  listWorkspaceMembers,
  searchWorkspaceMembers,
  getWorkspaceMember,
} from '@/objects/workspace-members.js';
import type { AttioWorkspaceMember } from '@/types/attio.js';

vi.mock('@/objects/workspace-members.js', () => ({
  listWorkspaceMembers: vi.fn(),
  searchWorkspaceMembers: vi.fn(),
  getWorkspaceMember: vi.fn(),
}));

const mockMember: AttioWorkspaceMember = {
  id: {
    workspace_id: 'workspace-123',
    workspace_member_id: 'd28a35f1-5788-49f9-a320-6c8c353147d8',
  },
  first_name: 'Martin',
  last_name: 'Kessler',
  email_address: 'martin@example.com',
  access_level: 'admin',
  created_at: '2026-04-29T00:00:00.000Z',
  updated_at: '2026-04-29T00:00:00.000Z',
};

describe('workspaceMembersToolConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes memberId as a string to getWorkspaceMember', async () => {
    vi.mocked(getWorkspaceMember).mockResolvedValue(mockMember);

    await workspaceMembersToolConfigs.getWorkspaceMember.handler({
      memberId: 'd28a35f1-5788-49f9-a320-6c8c353147d8',
    });

    expect(getWorkspaceMember).toHaveBeenCalledWith(
      'd28a35f1-5788-49f9-a320-6c8c353147d8'
    );
  });

  it('rejects missing memberId before calling getWorkspaceMember', async () => {
    await expect(
      workspaceMembersToolConfigs.getWorkspaceMember.handler({})
    ).rejects.toThrow('memberId is required');

    expect(getWorkspaceMember).not.toHaveBeenCalled();
  });

  it('rejects non-string memberId before calling getWorkspaceMember', async () => {
    await expect(
      workspaceMembersToolConfigs.getWorkspaceMember.handler({ memberId: 123 })
    ).rejects.toThrow('memberId is required');

    expect(getWorkspaceMember).not.toHaveBeenCalled();
  });

  it('passes query as a string to searchWorkspaceMembers', async () => {
    vi.mocked(searchWorkspaceMembers).mockResolvedValue([mockMember]);

    await workspaceMembersToolConfigs.searchWorkspaceMembers.handler({
      query: 'martin',
    });

    expect(searchWorkspaceMembers).toHaveBeenCalledWith('martin');
  });

  it('passes list arguments positionally to listWorkspaceMembers', async () => {
    vi.mocked(listWorkspaceMembers).mockResolvedValue([mockMember]);

    await workspaceMembersToolConfigs.listWorkspaceMembers.handler({
      search: 'martin',
      page: 2,
      pageSize: 50,
    });

    expect(listWorkspaceMembers).toHaveBeenCalledWith('martin', 2, 50);
  });

  it('preserves list defaults when no list arguments are provided', async () => {
    vi.mocked(listWorkspaceMembers).mockResolvedValue([mockMember]);

    await workspaceMembersToolConfigs.listWorkspaceMembers.handler({});

    expect(listWorkspaceMembers).toHaveBeenCalledWith(undefined, 1, 25);
  });

  it('formats get workspace member details', () => {
    const formatted =
      workspaceMembersToolConfigs.getWorkspaceMember.formatResult?.(mockMember);

    expect(formatted).toContain('Workspace Member Details:');
    expect(formatted).toContain('- Name: Martin Kessler');
    expect(formatted).toContain('- ID: d28a35f1-5788-49f9-a320-6c8c353147d8');
  });
});
