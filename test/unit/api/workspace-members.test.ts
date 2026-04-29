import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getWorkspaceMember } from '@/api/operations/workspace-members.js';
import type { AttioWorkspaceMember } from '@/types/attio.js';

const mockGet = vi.fn();
const mockClient = {
  get: mockGet,
};

vi.mock('@/utils/client-resolver.js', () => ({
  getValidatedAttioClient: () => mockClient,
}));

vi.mock('@/api/lazy-client.js', () => ({
  getLazyAttioClient: () => mockClient,
}));

vi.mock('@/api/operations/retry.js', () => ({
  callWithRetry: vi.fn((fn) => fn()),
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

describe('workspace member API operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkspaceMember', () => {
    it('calls the documented workspace member path with the UUID string', async () => {
      mockGet.mockResolvedValue({ data: { data: mockMember } });

      await getWorkspaceMember('d28a35f1-5788-49f9-a320-6c8c353147d8');

      expect(mockGet).toHaveBeenCalledWith(
        '/workspace_members/d28a35f1-5788-49f9-a320-6c8c353147d8'
      );
    });

    it('returns the workspace member response data unchanged', async () => {
      mockGet.mockResolvedValue({ data: { data: mockMember } });

      const result = await getWorkspaceMember(
        'd28a35f1-5788-49f9-a320-6c8c353147d8'
      );

      expect(result).toBe(mockMember);
    });

    it('throws when the response does not include a workspace member', async () => {
      mockGet.mockResolvedValue({ data: {} });

      await expect(
        getWorkspaceMember('d28a35f1-5788-49f9-a320-6c8c353147d8')
      ).rejects.toThrow(
        "Workspace member 'd28a35f1-5788-49f9-a320-6c8c353147d8' not found in current workspace"
      );
    });
  });
});
