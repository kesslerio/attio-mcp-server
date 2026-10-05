import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workspaceMembersToolConfigs } from '@/handlers/tool-configs/workspace-members.js';
import { buildStructuredToolResult } from '@/handlers/tools/result-contract.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
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

  it('trims memberId before calling getWorkspaceMember', async () => {
    vi.mocked(getWorkspaceMember).mockResolvedValue(mockMember);

    await workspaceMembersToolConfigs.getWorkspaceMember.handler({
      memberId: ' d28a35f1-5788-49f9-a320-6c8c353147d8 ',
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

  it('rejects undefined args before calling getWorkspaceMember', async () => {
    await expect(
      workspaceMembersToolConfigs.getWorkspaceMember.handler()
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

  describe('structured envelopes (U4)', () => {
    const call = async (
      key: keyof typeof workspaceMembersToolConfigs,
      args: Record<string, unknown>
    ) => {
      const config = workspaceMembersToolConfigs[key];
      const raw = await (config.handler as (a: unknown) => Promise<unknown>)(
        args
      );
      const result = buildStructuredToolResult(
        config,
        raw,
        args
      ) as CallToolResult & { structuredContent: Record<string, unknown> };
      expect(
        new AjvJsonSchemaValidator().getValidator(config.outputSchema!)(
          result.structuredContent
        ).valid
      ).toBe(true);
      return result;
    };

    it('publishes the roster as a collection with the native member id', async () => {
      vi.mocked(listWorkspaceMembers).mockResolvedValue([mockMember]);

      const result = await call('listWorkspaceMembers', {});

      expect(result.structuredContent).toEqual({
        data: [mockMember],
        count: 1,
        next_cursor: null,
        pagination: { supported: false, truncated: true },
      });
      expect(JSON.parse(result.content[0].text as string)).toEqual(
        result.structuredContent
      );
      // Prose follows the machine channel rather than replacing it.
      expect(result.content[1]?.text).toContain('Found 1 workspace members');
    });

    it('keeps an empty search a collection rather than an error', async () => {
      vi.mocked(searchWorkspaceMembers).mockResolvedValue([]);

      const result = await call('searchWorkspaceMembers', { query: 'nobody' });

      expect(result.structuredContent).toEqual({
        data: [],
        count: 0,
        next_cursor: null,
        pagination: { supported: false, truncated: true },
      });
    });

    it('publishes a single member with workspace_member_id retained', async () => {
      vi.mocked(getWorkspaceMember).mockResolvedValue(mockMember);

      const result = await call('getWorkspaceMember', {
        memberId: mockMember.id.workspace_member_id,
      });

      expect(result.structuredContent).toEqual({ data: mockMember });
      expect(
        (
          result.structuredContent as {
            data: { id: { workspace_member_id: string } };
          }
        ).data.id.workspace_member_id
      ).toBe('d28a35f1-5788-49f9-a320-6c8c353147d8');
    });

    it('reports an unknown member as a structured failure, never empty success', () => {
      expect(() =>
        workspaceMembersToolConfigs.getWorkspaceMember.structuredOutput?.(
          undefined
        )
      ).toThrow('Workspace member not found');
      try {
        workspaceMembersToolConfigs.getWorkspaceMember.structuredOutput?.(null);
        expect.unreachable('expected a not-found failure');
      } catch (error) {
        expect((error as { status?: number }).status).toBe(404);
      }
    });
  });
});
