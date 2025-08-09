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
  
  // Build task data according to TaskCreateData interface
  const taskData: TaskCreateData = { 
    content,
    format: 'plaintext'  // Required field for Attio API
  };
  
  // Add optional fields only if provided
  if (options.assigneeId) {
    taskData.assignee = { id: options.assigneeId, type: 'workspace-member' };
  }
  
  if (options.dueDate) {
    taskData.deadline_at = options.dueDate;
  }
  
  // Add linked records if provided
  if (options.recordId) {
    taskData.linked_records = [{ id: options.recordId }];
  }
  
  // Build the full request payload with all required fields for the API
  // The API requires these fields to be present even if empty
  const requestPayload = {
    data: {
      ...taskData,
      is_completed: false,  // Always false for new tasks
      assignees: taskData.assignee ? [taskData.assignee] : [],  // Convert to array format
      linked_records: taskData.linked_records || [],
      deadline_at: taskData.deadline_at || null  // Explicitly null if not provided
    }
  };
  
  return callWithRetry(async () => {
    // Debug logging for request
    if (process.env.NODE_ENV === 'development') {
      console.log('[createTask] Sending request to:', path);
      console.log('[createTask] Request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('[createTask] API instance exists?', !!api);
    }
    
    let res;
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[createTask] About to call api.post');
      }
      res = await api.post<AttioSingleResponse<AttioTask>>(path, requestPayload);
      if (process.env.NODE_ENV === 'development') {
        console.log('[createTask] api.post returned:', res);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[createTask] api.post threw error:', err);
      }
      throw err;
    }
    
    // Debug logging to identify the response structure
    if (process.env.NODE_ENV === 'development') {
      console.log('[createTask] Raw res object:', res);
      console.log('[createTask] API response:', JSON.stringify(res, null, 2));
    }
    
    // Handle different response structures
    let task: AttioTask;
    if (res && typeof res === 'object' && 'data' in res) {
      // Axios response object - extract the data property
      const responseData = res.data;
      if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        // API response wrapped in data field
        task = responseData.data as AttioTask;
      } else {
        // Direct response data
        task = responseData as AttioTask;
      }
    } else {
      throw new Error(`Unexpected response structure from tasks API: ${JSON.stringify(res)}`);
    }
    
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
