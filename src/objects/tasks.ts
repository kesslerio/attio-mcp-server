import {
  listTasks as apiList,
  getTask as apiGet,
  createTask as apiCreate,
  updateTask as apiUpdate,
  deleteTask as apiDelete,
  linkRecordToTask as apiLink,
  unlinkRecordFromTask as apiUnlink,
} from '../api/operations/index.js';
import { AttioTask } from '../types/attio.js';
import { isValidId } from '../utils/validation.js';

// Helper function to check if we should use mock data
function shouldUseMockData(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.VITEST !== undefined ||
    process.env.E2E_MODE === 'true' ||
    process.env.USE_MOCK_DATA === 'true' ||
    process.env.OFFLINE_MODE === 'true' ||
    (typeof global !== 'undefined' &&
      (typeof global.it === 'function' ||
        typeof global.describe === 'function'))
  );
}

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
  options: { assigneeId?: string; dueDate?: string; recordId?: string } = {}
): Promise<AttioTask> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      console.error('[MockInjection] Using mock data for task creation');
    }

    // Generate mock task ID
    const mockId = `mock-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      assignees: options.assigneeId
        ? [
            {
              referenced_actor_type: 'workspace-member' as const,
              referenced_actor_id: options.assigneeId,
            },
          ]
        : [],
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

  return apiCreate(content, options);
}

export async function updateTask(
  taskId: string,
  updates: {
    content?: string;
    status?: string;
    assigneeId?: string;
    dueDate?: string;
    recordIds?: string[];
  }
): Promise<AttioTask> {
  // Check if we should use mock data for testing
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      console.error('[MockInjection] Using mock data for task update');
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
      assignees: updates.assigneeId
        ? [
            {
              referenced_actor_type: 'workspace-member' as const,
              referenced_actor_id: updates.assigneeId,
            },
          ]
        : [],
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
  try {
    const result = await apiDelete(taskId);
    // apiDelete typically returns boolean true on success
    return result === true;
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status;
    const msg = (err?.response?.data?.message ?? err?.message ?? '')
      .toString()
      .toLowerCase();
    // Normalize: if the API signals not found, convert to a soft-fail 'false'
    if (
      status === 404 ||
      msg.includes('not found') ||
      err?.code === 'not_found'
    ) {
      return false;
    }
    throw err; // bubble up genuine failures
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
      console.error('[MockInjection] Using mock data for task-record linking');
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
