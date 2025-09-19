import {
  listTasks as apiList,
  getTask as apiGet,
  createTask as apiCreate,
  updateTask as apiUpdate,
  linkRecordToTask as apiLink,
  unlinkRecordFromTask as apiUnlink,
} from '../api/operations/index.js';
import { AttioTask } from '../types/attio.js';
import { isValidId } from '../utils/validation.js';
import { shouldUseMockData } from '../services/create/index.js';
import { deleteTask as apiDelete } from '../api/operations/index.js';
import {
  getErrorStatus,
  getErrorMessage,
  getErrorCode,
} from '../types/error-interfaces.js';

// Input validation helper function is now imported from ../utils/validation.js for consistency

export async function listTasks(
  status?: string,
  assigneeId?: string,
  page = 1,
  pageSize = 25
): Promise<AttioTask[]> {
  return apiList(status, assigneeId, page, pageSize);
}

export async function getTask(taskId: string): Promise<AttioTask> {
  return apiGet(taskId);
}

export async function createTask(
  content: string,
  options: {
    assigneeId?: string;
    assignees?: string[];
    dueDate?: string;
    recordId?: string;
    targetObject?: 'companies' | 'people' | 'records';
    linked_records?: Array<{
      target_object: 'companies' | 'people' | 'deals';
      target_record_id: string;
    }>;
  } = {}
): Promise<AttioTask> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.tasks', 'createTask').debug(
        'Using mock data for task creation'
      );
    }

    // Generate mock task ID
    const mockId = `mock-task-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Return mock task response
    return {
      id: {
        task_id: mockId,
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      content: content,
      content_plaintext: content,
      status: 'open' as const,
      deadline_at: options.dueDate
        ? new Date(options.dueDate).toISOString()
        : null,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignees: (() => {
        // Merge assigneeId and assignees arrays, with assignees taking precedence
        const allAssignees = [...(options.assignees || [])];
        if (options.assigneeId && !allAssignees.includes(options.assigneeId)) {
          allAssignees.push(options.assigneeId);
        }
        return allAssignees.map((id) => ({
          referenced_actor_type: 'workspace-member' as const,
          referenced_actor_id: id,
        }));
      })(),
      linked_records: options.recordId
        ? [
            {
              id: options.recordId,
              object_id: 'companies',
              title: 'Mock Record',
            },
          ]
        : [],
    } as unknown as AttioTask;
  }

  return apiCreate(content, {
    ...options,
    // Convert assignees array to single assigneeId for backward compatibility with API
    assigneeId: options.assignees?.length
      ? options.assignees[0]
      : options.assigneeId,
  });
}

export async function updateTask(
  taskId: string,
  updates: {
    content?: string;
    status?: string;
    assigneeId?: string;
    assignees?: string[];
    dueDate?: string;
    recordIds?: string[];
    linked_records?: Array<{
      target_object: 'companies' | 'people' | 'deals';
      target_record_id: string;
    }>;
  }
): Promise<AttioTask> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.tasks', 'updateTask').debug(
        'Using mock data for task update'
      );
    }

    // Return mock task update response
    return {
      id: {
        task_id: taskId,
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      content_plaintext: updates.content || 'Mock updated task content',
      deadline_at: updates.dueDate
        ? new Date(updates.dueDate).toISOString()
        : null,
      is_completed: updates.status === 'completed',
      status: updates.status || 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignees: (() => {
        // Merge assigneeId and assignees arrays, with assignees taking precedence
        const allAssignees = [...(updates.assignees || [])];
        if (updates.assigneeId && !allAssignees.includes(updates.assigneeId)) {
          allAssignees.push(updates.assigneeId);
        }
        return allAssignees.map((id) => ({
          referenced_actor_type: 'workspace-member' as const,
          referenced_actor_id: id,
        }));
      })(),
      linked_records: updates.recordIds
        ? updates.recordIds.map((recordId) => ({
            id: recordId,
            object_id: 'companies',
            title: 'Mock Linked Record',
          }))
        : [],
    } as unknown as AttioTask;
  }

  return apiUpdate(taskId, updates);
}

export async function deleteTask(taskId: string): Promise<boolean> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    // Validate task ID
    if (!isValidId(taskId)) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.tasks', 'deleteTask').debug(
        'Using mock data for task deletion'
      );
    }

    // Return mock success response
    return true;
  }

  // Delegate to API operations implementation (handles retries and envelopes)
  try {
    return await apiDelete(taskId);
  } catch (err: unknown) {
    const status = getErrorStatus(err);
    const code = getErrorCode(err);
    const msg = (getErrorMessage(err) ?? '').toLowerCase();
    // Normalize soft "not found" to boolean false so the service maps it to a structured 404
    if (status === 404 || code === 'not_found' || msg.includes('not found'))
      return false;
    throw err;
  }
}

export async function linkRecordToTask(
  taskId: string,
  recordId: string
): Promise<boolean> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    // Validate task ID
    if (!isValidId(taskId)) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Validate record ID
    if (!isValidId(recordId)) {
      throw new Error(`Record not found: ${recordId}`);
    }

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.tasks', 'linkTaskRecord').debug(
        'Using mock data for task-record linking'
      );
    }

    // Return mock success response
    return true;
  }

  return apiLink(taskId, recordId);
}

export async function unlinkRecordFromTask(
  taskId: string,
  recordId: string
): Promise<boolean> {
  return apiUnlink(taskId, recordId);
}
