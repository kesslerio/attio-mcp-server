/**
 * Task operations for Attio
 */
import { getAttioClient } from '../attio-client.js';
import {
  AttioTask,
  AttioListResponse,
  AttioSingleResponse,
} from '../../types/attio.js';
import { callWithRetry, RetryConfig } from './retry.js';
import { TaskCreateData, TaskUpdateData } from '../../types/api-operations.js';

/**
 * Helper function to transform Attio API task response to internal format
 * Handles field name transformations for backward compatibility
 */
function transformTaskResponse(task: AttioTask): AttioTask {
  const transformedTask = task as Record<string, unknown>;
  
  // Transform content_plaintext -> content for backward compatibility
  if ('content_plaintext' in transformedTask && !('content' in transformedTask)) {
    transformedTask.content = transformedTask.content_plaintext;
  }
  
  // Transform is_completed -> status for backward compatibility
  if ('is_completed' in transformedTask && !('status' in transformedTask)) {
    transformedTask.status = transformedTask.is_completed ? 'completed' : 'pending';
  }
  
  return transformedTask as AttioTask;
}

export async function listTasks(
  status?: string,
  assigneeId?: string,
  page: number = 1,
  pageSize: number = 25,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioTask[]> {
  const api = getAttioClient();
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('pageSize', String(pageSize));
  if (status) params.append('status', status);
  if (assigneeId) params.append('assignee', assigneeId);
  const path = `/tasks?${params.toString()}`;
  return callWithRetry(async () => {
    const res = await api.get<AttioListResponse<AttioTask>>(path);
    const tasks = res.data.data || [];
    // Transform each task in the response for backward compatibility
    return tasks.map(task => transformTaskResponse(task));
  }, retryConfig);
}

export async function getTask(
  taskId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioTask> {
  const api = getAttioClient();
  const path = `/tasks/${taskId}`;
  return callWithRetry(async () => {
    const res = await api.get<AttioSingleResponse<AttioTask>>(path);
    const task = (res.data.data || res.data) as AttioTask;
    return transformTaskResponse(task);
  }, retryConfig);
}

export async function createTask(
  content: string,
  options: { assigneeId?: string; dueDate?: string; recordId?: string } = {},
  retryConfig?: Partial<RetryConfig>
): Promise<AttioTask> {
  const api = getAttioClient();
  const path = '/tasks';
  const data: TaskCreateData = { 
    content,
    format: 'plaintext'  // Required field for Attio API
  };
  if (options.assigneeId)
    data.assignee = { id: options.assigneeId, type: 'workspace-member' };
  if (options.dueDate) data.deadline_at = options.dueDate;  // Use deadline_at instead of due_date
  if (options.recordId) data.linked_records = [{ id: options.recordId }];
  return callWithRetry(async () => {
    const res = await api.post<AttioSingleResponse<AttioTask>>(path, data);
    const task = (res.data.data || res.data) as AttioTask;
    // Note: Only transform content field for create response (status not returned on create)
    return transformTaskResponse(task);
  }, retryConfig);
}

export async function updateTask(
  taskId: string,
  updates: {
    content?: string;  // Keep for backward compatibility, but will be ignored
    status?: string;
    assigneeId?: string;
    dueDate?: string;
    recordIds?: string[];
  },
  retryConfig?: Partial<RetryConfig>
): Promise<AttioTask> {
  const api = getAttioClient();
  const path = `/tasks/${taskId}`;
  const data: TaskUpdateData = {};
  // Note: content is immutable and cannot be updated - ignore if provided
  if (updates.status) {
    // Map status string to is_completed boolean
    data.is_completed = updates.status === 'completed';
  }
  if (updates.assigneeId)
    data.assignee = { id: updates.assigneeId, type: 'workspace-member' };
  if (updates.dueDate) data.deadline_at = updates.dueDate;  // Use deadline_at instead of due_date
  if (updates.recordIds)
    data.linked_records = updates.recordIds.map((id) => ({ id }));
  return callWithRetry(async () => {
    const res = await api.patch<AttioSingleResponse<AttioTask>>(path, data);
    const task = (res.data.data || res.data) as AttioTask;
    return transformTaskResponse(task);
  }, retryConfig);
}

export async function deleteTask(
  taskId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<boolean> {
  const api = getAttioClient();
  const path = `/tasks/${taskId}`;
  return callWithRetry(async () => {
    await api.delete(path);
    return true;
  }, retryConfig);
}

export async function linkRecordToTask(
  taskId: string,
  recordId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<boolean> {
  const api = getAttioClient();
  const path = `/tasks/${taskId}/linked-records`;
  return callWithRetry(async () => {
    await api.post(path, { record_id: recordId });
    return true;
  }, retryConfig);
}

export async function unlinkRecordFromTask(
  taskId: string,
  recordId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<boolean> {
  const api = getAttioClient();
  const path = `/tasks/${taskId}/linked-records/${recordId}`;
  return callWithRetry(async () => {
    await api.delete(path);
    return true;
  }, retryConfig);
}
