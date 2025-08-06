/**
 * Task operations for Attio
 */

import { TaskCreateData, TaskUpdateData } from '../../types/api-operations.js';
import {
  AttioListResponse,
  AttioSingleResponse,
  AttioTask,
} from '../../types/attio.js';
import { getAttioClient } from '../attio-client.js';
import { callWithRetry, RetryConfig } from './retry.js';

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
    return res.data.data || [];
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
    return (res.data.data || res.data) as AttioTask;
  }, retryConfig);
}

export async function createTask(
  content: string,
  options: { assigneeId?: string; dueDate?: string; recordId?: string } = {},
  retryConfig?: Partial<RetryConfig>
): Promise<AttioTask> {
  const api = getAttioClient();
  const path = '/tasks';
  const data: TaskCreateData = { content };
  if (options.assigneeId)
    data.assignee = { id: options.assigneeId, type: 'workspace-member' };
  if (options.dueDate) data.due_date = options.dueDate;
  if (options.recordId) data.linked_records = [{ id: options.recordId }];
  return callWithRetry(async () => {
    const res = await api.post<AttioSingleResponse<AttioTask>>(path, data);
    return (res.data.data || res.data) as AttioTask;
  }, retryConfig);
}

export async function updateTask(
  taskId: string,
  updates: {
    content?: string;
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
  if (updates.content) data.content = updates.content;
  if (updates.status) data.status = updates.status;
  if (updates.assigneeId)
    data.assignee = { id: updates.assigneeId, type: 'workspace-member' };
  if (updates.dueDate) data.due_date = updates.dueDate;
  if (updates.recordIds)
    data.linked_records = updates.recordIds.map((id) => ({ id }));
  return callWithRetry(async () => {
    const res = await api.patch<AttioSingleResponse<AttioTask>>(path, data);
    return (res.data.data || res.data) as AttioTask;
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
