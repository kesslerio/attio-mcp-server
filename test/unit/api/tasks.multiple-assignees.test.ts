import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTask, updateTask } from '../../../src/api/operations/tasks.js';

// Mock the Attio client
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockClient = {
  post: mockPost,
  patch: mockPatch,
  defaults: {
    baseURL: 'https://api.attio.com',
    headers: { Authorization: 'Bearer test-token' },
  },
};

vi.mock('../../../src/api/attio-client.js', () => ({
  getAttioClient: () => mockClient,
  createAttioClient: () => mockClient,
}));

vi.mock('../../../src/api/lazy-client.js', () => ({
  getLazyAttioClient: () => mockClient,
}));

vi.mock('../../../src/utils/client-resolver.js', () => ({
  getValidatedAttioClient: () => mockClient,
}));

// Mock retry utility to avoid delays in tests
vi.mock('../../../src/api/operations/retry.js', () => ({
  callWithRetry: vi.fn((fn) => fn()),
}));

describe('Tasks API - Multiple Assignees Enhancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask with multiple assignees', () => {
    it('should handle single assignee via assigneeId (backward compatibility)', async () => {
      const mockTaskResponse = {
        data: {
          data: {
            id: { task_id: 'task-123' },
            content_plaintext: 'test content',
            assignees: [
              {
                referenced_actor_type: 'workspace-member',
                referenced_actor_id: 'user-1',
              },
            ],
          },
        },
      };

      mockPost.mockResolvedValue(mockTaskResponse);

      await createTask('test content', { assigneeId: 'user-1' });

      expect(mockPost).toHaveBeenCalledWith('/tasks', {
        data: expect.objectContaining({
          content: 'test content',
          assignees: [
            {
              referenced_actor_type: 'workspace-member',
              referenced_actor_id: 'user-1',
            },
          ],
        }),
      });
    });

    it('should handle multiple assignees via assignees array', async () => {
      const mockTaskResponse = {
        data: {
          data: {
            id: { task_id: 'task-123' },
            content_plaintext: 'test content',
            assignees: [
              {
                referenced_actor_type: 'workspace-member',
                referenced_actor_id: 'user-1',
              },
              {
                referenced_actor_type: 'workspace-member',
                referenced_actor_id: 'user-2',
              },
            ],
          },
        },
      };

      mockPost.mockResolvedValue(mockTaskResponse);

      await createTask('test content', { assignees: ['user-1', 'user-2'] });

      expect(mockPost).toHaveBeenCalledWith('/tasks', {
        data: expect.objectContaining({
          content: 'test content',
          assignees: [
            {
              referenced_actor_type: 'workspace-member',
              referenced_actor_id: 'user-1',
            },
            {
              referenced_actor_type: 'workspace-member',
              referenced_actor_id: 'user-2',
            },
          ],
        }),
      });
    });

    it('should merge assigneeId and assignees array without duplicates', async () => {
      const mockTaskResponse = {
        data: {
          data: {
            id: { task_id: 'task-123' },
            content_plaintext: 'test content',
            assignees: [
              {
                referenced_actor_type: 'workspace-member',
                referenced_actor_id: 'user-1',
              },
              {
                referenced_actor_type: 'workspace-member',
                referenced_actor_id: 'user-2',
              },
            ],
          },
        },
      };

      mockPost.mockResolvedValue(mockTaskResponse);

      // assigneeId 'user-1' should not be duplicated in assignees array
      await createTask('test content', {
        assigneeId: 'user-1',
        assignees: ['user-1', 'user-2'],
      });

      expect(mockPost).toHaveBeenCalledWith('/tasks', {
        data: expect.objectContaining({
          content: 'test content',
          assignees: [
            {
              referenced_actor_type: 'workspace-member',
              referenced_actor_id: 'user-1',
            },
            {
              referenced_actor_type: 'workspace-member',
              referenced_actor_id: 'user-2',
            },
          ],
        }),
      });
    });

    it('should handle enhanced linked_records with type specification', async () => {
      const mockTaskResponse = {
        data: {
          data: {
            id: { task_id: 'task-123' },
            content_plaintext: 'test content',
            linked_records: [
              {
                target_object: 'companies',
                target_record_id: 'company-1',
              },
            ],
          },
        },
      };

      mockPost.mockResolvedValue(mockTaskResponse);

      await createTask('test content', {
        linked_records: [
          {
            target_object: 'companies',
            target_record_id: 'company-1',
          },
        ],
      });

      expect(mockPost).toHaveBeenCalledWith('/tasks', {
        data: expect.objectContaining({
          content: 'test content',
          linked_records: [
            {
              target_object: 'companies',
              target_record_id: 'company-1',
            },
          ],
        }),
      });
    });
  });

  describe('updateTask with multiple assignees', () => {
    it('should update task with multiple assignees', async () => {
      const mockTaskResponse = {
        data: {
          data: {
            id: { task_id: 'task-123' },
            content_plaintext: 'test content',
            assignees: [
              {
                referenced_actor_type: 'workspace-member',
                referenced_actor_id: 'user-1',
              },
              {
                referenced_actor_type: 'workspace-member',
                referenced_actor_id: 'user-3',
              },
            ],
          },
        },
      };

      mockPatch.mockResolvedValue(mockTaskResponse);

      await updateTask('task-123', { assignees: ['user-1', 'user-3'] });

      expect(mockPatch).toHaveBeenCalledWith('/tasks/task-123', {
        data: expect.objectContaining({
          assignees: [
            {
              referenced_actor_type: 'workspace-member',
              referenced_actor_id: 'user-1',
            },
            {
              referenced_actor_type: 'workspace-member',
              referenced_actor_id: 'user-3',
            },
          ],
        }),
      });
    });

    it('should update linked_records with type specification', async () => {
      const mockTaskResponse = {
        data: {
          data: {
            id: { task_id: 'task-123' },
            content_plaintext: 'test content',
            linked_records: [
              {
                target_object: 'people',
                target_record_id: 'person-1',
              },
            ],
          },
        },
      };

      mockPatch.mockResolvedValue(mockTaskResponse);

      await updateTask('task-123', {
        linked_records: [
          {
            target_object: 'people',
            target_record_id: 'person-1',
          },
        ],
      });

      expect(mockPatch).toHaveBeenCalledWith('/tasks/task-123', {
        data: expect.objectContaining({
          linked_records: [
            {
              target_object: 'people',
              target_record_id: 'person-1',
            },
          ],
        }),
      });
    });

    it('should maintain backward compatibility with recordIds array', async () => {
      const mockTaskResponse = {
        data: {
          data: {
            id: { task_id: 'task-123' },
            content_plaintext: 'test content',
            linked_records: [
              {
                target_object: 'companies',
                target_record_id: 'record-1',
              },
            ],
          },
        },
      };

      mockPatch.mockResolvedValue(mockTaskResponse);

      await updateTask('task-123', { recordIds: ['record-1'] });

      expect(mockPatch).toHaveBeenCalledWith('/tasks/task-123', {
        data: expect.objectContaining({
          linked_records: [
            {
              target_object: 'companies',
              target_record_id: 'record-1',
            },
          ],
        }),
      });
    });
  });
});
