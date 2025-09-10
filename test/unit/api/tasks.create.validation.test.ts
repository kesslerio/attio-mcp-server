import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTask } from '../../../src/api/operations/tasks.js';

// Mock the Attio client
const mockPost = vi.fn();
vi.mock('../../../src/api/attio-client.js', () => ({
  getAttioClient: () => ({
    post: mockPost,
    defaults: {
      baseURL: 'https://api.attio.com',
      headers: { Authorization: 'Bearer test-token' },
    },
  }),
}));

// Mock retry utility to avoid delays in tests
vi.mock('../../../src/api/operations/retry.js', () => ({
  callWithRetry: vi.fn((fn) => fn()),
}));

describe('tasks.createTask validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parameter validation', () => {
    it('throws when recordId provided without targetObject', async () => {
      await expect(
        createTask('content', {
          recordId: '11111111-1111-1111-1111-111111111111',
        })
      ).rejects.toThrow(/both 'recordId' and 'targetObject'/i);
    });

    it('throws when targetObject provided without recordId', async () => {
      await expect(
        createTask('content', { targetObject: 'companies' as any })
      ).rejects.toThrow(/both 'recordId' and 'targetObject'/i);
    });

    it('accepts neither recordId nor targetObject (unlinked task)', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            id: 'task-123',
            content_plaintext: 'test content',
            assignee_id: null,
            status: 'pending',
          },
        },
      });

      const result = await createTask('test content');
      expect(result.id).toBe('task-123');
      expect(result.content).toBe('test content');
      expect(mockPost).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'test content',
            format: 'plaintext',
            linked_records: [],
          }),
        })
      );
    });

    it('accepts both recordId and targetObject (linked task)', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            id: 'task-456',
            content_plaintext: 'linked task',
            assignee_id: null,
            status: 'pending',
          },
        },
      });

      const result = await createTask('linked task', {
        recordId: '11111111-1111-1111-1111-111111111111',
        targetObject: 'companies',
      });

      expect(result.id).toBe('task-456');
      expect(mockPost).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'linked task',
            format: 'plaintext',
            linked_records: [
              {
                target_object: 'companies',
                target_record_id: '11111111-1111-1111-1111-111111111111',
              },
            ],
          }),
        })
      );
    });
  });

  describe('Response handling', () => {
    it('handles nested data response structure', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            id: 'task-nested',
            content_plaintext: 'nested response',
            status: 'pending',
          },
        },
      });

      const result = await createTask('test');
      expect(result.id).toBe('task-nested');
      expect(result.content).toBe('nested response');
    });

    it('handles direct data response structure', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 'task-direct',
          content_plaintext: 'direct response',
          status: 'pending',
        },
      });

      const result = await createTask('test');
      expect(result.id).toBe('task-direct');
      expect(result.content).toBe('direct response');
    });

    it('transforms is_completed to status for backward compatibility', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            id: 'task-completed',
            content_plaintext: 'completed task',
            is_completed: true,
          },
        },
      });

      const result = await createTask('test');
      expect(result.status).toBe('completed');
    });

    it('throws error for invalid response structure', async () => {
      mockPost.mockResolvedValue({
        data: null,
      });

      await expect(createTask('test')).rejects.toThrow(
        'Invalid API response structure'
      );
    });

    it('throws error for null response', async () => {
      mockPost.mockResolvedValue(null);

      await expect(createTask('test')).rejects.toThrow(
        'Invalid API response: no response data received'
      );
    });
  });

  describe('Edge cases', () => {
    it('handles empty content', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            id: 'task-empty',
            content_plaintext: '',
            status: 'pending',
          },
        },
      });

      const result = await createTask('');
      expect(result.id).toBe('task-empty');
      expect(result.content).toBe('');
    });

    it('includes deadline_at when dueDate provided', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            id: 'task-deadline',
            content_plaintext: 'task with deadline',
            deadline_at: '2024-12-31T23:59:59Z',
          },
        },
      });

      const deadline = '2024-12-31T23:59:59Z';
      await createTask('test', { dueDate: deadline });

      expect(mockPost).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'test',
            format: 'plaintext',
            deadline_at: deadline,
          }),
        })
      );
    });

    it('includes assignees when assigneeId provided', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            id: 'task-assigned',
            content_plaintext: 'assigned task',
            assignee_id: 'user-123',
          },
        },
      });

      await createTask('test', { assigneeId: 'user-123' });

      expect(mockPost).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'test',
            format: 'plaintext',
            assignees: [
              {
                referenced_actor_type: 'workspace-member',
                referenced_actor_id: 'user-123',
              },
            ],
          }),
        })
      );
    });

    it('handles network errors gracefully', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      await expect(createTask('test')).rejects.toThrow('Network error');
    });
  });
});
