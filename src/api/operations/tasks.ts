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
import { debug, OperationType } from '../../utils/logger.js';
import {
  logTaskDebug,
  sanitizePayload,
  inspectTaskRecordShape,
} from '../../utils/task-debug.js';

/**
 * Helper function to transform Attio API task response to internal format
 * Handles field name transformations for backward compatibility
 */
function transformTaskResponse(task: AttioTask): AttioTask {
  const transformedTask = task as Record<string, unknown>;

  // Transform content_plaintext -> content for backward compatibility
  if (
    'content_plaintext' in transformedTask &&
    !('content' in transformedTask)
  ) {
    transformedTask.content = transformedTask.content_plaintext;
  }

  // Transform is_completed -> status for backward compatibility
  if ('is_completed' in transformedTask && !('status' in transformedTask)) {
    transformedTask.status = transformedTask.is_completed
      ? 'completed'
      : 'pending';
  }

  return transformedTask as AttioTask;
}

/**
 * Helper function to extract task data from API response
 * Handles different response structure patterns
 */
function extractTaskFromResponse(res: Record<string, unknown>): AttioTask {
  // Try different response structure patterns
  const data = res?.data as Record<string, unknown>;
  if (data?.data) {
    return data.data as AttioTask;
  } else if (data && typeof data === 'object' && 'id' in data) {
    // Direct task object in data
    return data as unknown as AttioTask;
  } else {
    throw new Error('Invalid API response structure: missing task data');
  }
}

/**
 * Helper function to convert date string to ISO 8601 format for Attio API
 * Handles various input formats and converts them to proper ISO datetime
 */
function formatDateForAttio(dateStr: string): string {
  // If already in ISO format, return as-is
  if (dateStr.includes('T') && dateStr.includes('Z')) {
    return dateStr;
  }
  
  // Handle YYYY-MM-DD format by adding time component
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return `${dateStr}T00:00:00Z`;
  }
  
  // Try parsing other formats and convert to ISO
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  return date.toISOString();
}

/**
 * Helper function to validate linking parameters
 * Both recordId and targetObject must be provided together, or neither
 */
function validateLinkingParameters(recordId?: string, targetObject?: string): void {
  const hasRecordId = !!recordId;
  const hasTargetObject = !!targetObject;
  
  if (hasRecordId !== hasTargetObject) {
    debug(
      'tasks.validateLinkingParameters',
      'Invalid task linking parameters',
      { recordId, targetObject },
      'validateLinkingParameters',
      OperationType.VALIDATION
    );
    throw new Error(
      `Invalid task linking: both 'recordId' and 'targetObject' must be provided together, or neither. ` +
      `Received recordId: ${recordId ? 'present' : 'missing'}, targetObject: ${targetObject ? 'present' : 'missing'}`
    );
  }
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
    const tasks = res?.data?.data || [];
    // Transform each task in the response for backward compatibility
    return tasks.map((task) => transformTaskResponse(task));
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
    const task = extractTaskFromResponse(res as unknown as Record<string, unknown>);
    return transformTaskResponse(task);
  }, retryConfig);
}

export async function createTask(
  content: string,
  options: { assigneeId?: string; dueDate?: string; recordId?: string; targetObject?: 'companies' | 'people' | 'records' } = {},
  retryConfig?: Partial<RetryConfig>
): Promise<AttioTask> {
  const api = getAttioClient();
  const path = '/tasks';

  // Validate linking parameters: both recordId and targetObject required, or neither
  validateLinkingParameters(options.recordId, options.targetObject);

  // Build task data according to TaskCreateData interface
  const taskData: TaskCreateData = {
    content,
    format: 'plaintext', // Required field for Attio API
    deadline_at: undefined, // Always include deadline_at field, default to undefined
  };

  // Set deadline_at if provided and not empty/invalid
  if (options.dueDate && options.dueDate.trim() && options.dueDate !== 'undefined') {
    try {
      taskData.deadline_at = formatDateForAttio(options.dueDate);
    } catch (err) {
      debug(
        'tasks.createTask',
        'Invalid date format provided',
        { dueDate: options.dueDate, error: err instanceof Error ? err.message : String(err) },
        'createTask',
        OperationType.VALIDATION
      );
      throw new Error(`Invalid date format for task deadline: ${options.dueDate}`);
    }
  }

  // Build the full request payload with all required fields for the API
  // Assignees: Attio v2 expects referenced actor references
  const assignees = options.assigneeId
    ? [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: options.assigneeId,
        },
      ]
    : [];

  // Always include linked_records as an array (Attio API requires the field)
  // If omitted, Attio returns 400 with validation error:
  // validation_errors: path ["data","linked_records"], expected "array", received "undefined"
  // When linking, use target_object and target_record_id format
  const linkedRecords = options.recordId && options.targetObject
    ? [{ target_object: options.targetObject, target_record_id: options.recordId }]
    : [];

  const requestPayload = {
    data: {
      ...taskData,
      is_completed: false, // Always false for new tasks
      assignees,
      deadline_at: taskData.deadline_at, // Always include deadline_at field (undefined or formatted date)
      linked_records: linkedRecords, // Always include as array (empty when not linking)
    },
  };

  return callWithRetry(async () => {
    logTaskDebug(
      'createTask',
      'Prepared create payload',
      sanitizePayload({ path, payload: requestPayload })
    );
    
    debug(
      'tasks.createTask',
      'Creating task',
      { path, hasLinkedRecords: linkedRecords.length > 0 },
      'createTask',
      OperationType.API_CALL
    );

    let res;
    try {
      res = await api.post<AttioSingleResponse<AttioTask>>(path, requestPayload);
    } catch (err) {
      debug(
        'tasks.createTask',
        'API call failed',
        {
          errorMessage: err instanceof Error ? err.message : String(err),
          isAxiosError: err && typeof err === 'object' && 'isAxiosError' in err,
        },
        'createTask',
        OperationType.API_CALL
      );
      throw err;
    }

    // Handle response validation
    if (!res) {
      debug(
        'tasks.createTask', 
        'API response is null/undefined',
        { path },
        'createTask',
        OperationType.API_CALL
      );
      throw new Error('Invalid API response: no response data received');
    }

    // Debug logging to identify the response structure
    debug(
      'tasks.createTask',
      'Response structure analysis',
      {
        hasData: !!res,
        responseType: typeof res,
        hasDataProperty: res && typeof res === 'object' && 'data' in res,
      },
      'createTask',
      OperationType.API_CALL
    );

    const task = extractTaskFromResponse(res as unknown as Record<string, unknown>);

    // Note: Only transform content field for create response (status not returned on create)
    const transformed = transformTaskResponse(task);
    logTaskDebug(
      'createTask',
      'Create response shape',
      inspectTaskRecordShape(transformed)
    );
    return transformed;
  }, retryConfig);
}

export async function updateTask(
  taskId: string,
  updates: {
    content?: string; // Keep for backward compatibility, but will be ignored
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
  // Assignees: API expects an array in the request envelope
  if (updates.assigneeId) {
    (data as Record<string, unknown>).assignees = [
      {
        referenced_actor_type: 'workspace-member',
        referenced_actor_id: updates.assigneeId,
      },
    ];
  }
  if (updates.dueDate) {
    try {
      data.deadline_at = formatDateForAttio(updates.dueDate);
    } catch (err) {
      debug(
        'tasks.updateTask',
        'Invalid date format provided',
        { dueDate: updates.dueDate, error: err instanceof Error ? err.message : String(err) },
        'updateTask',
        OperationType.VALIDATION
      );
      throw new Error(`Invalid date format for task deadline: ${updates.dueDate}`);
    }
  }
  // Do not include linked_records in PATCH; call /linked-records after update

  // Wrap in Attio envelope as per API requirements
  const requestPayload = { data };
  return callWithRetry(async () => {
    // Debug request for tracing
    debug(
      'tasks.updateTask',
      'PATCH payload',
      { path, payload: requestPayload },
      'updateTask',
      OperationType.API_CALL
    );
    logTaskDebug(
      'updateTask',
      'Prepared update payload',
      sanitizePayload({ path, payload: requestPayload })
    );

    const res = await api.patch<AttioSingleResponse<AttioTask>>(
      path,
      requestPayload
    );
    const task = extractTaskFromResponse(res as unknown as Record<string, unknown>);

    const transformed = transformTaskResponse(task);
    logTaskDebug(
      'updateTask',
      'Update response shape',
      inspectTaskRecordShape(transformed)
    );
    debug(
      'tasks.updateTask',
      'PATCH response received',
      { status: (res as unknown as Record<string, unknown>)?.status, hasData: !!res?.data },
      'updateTask',
      OperationType.API_CALL
    );
    // If linking records was requested, call the linked-records endpoint per Attio v2
    if (updates.recordIds && updates.recordIds.length) {
      try {
        for (const rid of updates.recordIds) {
          if (!rid) continue;
          await api.post(`/tasks/${taskId}/linked-records`, { record_id: rid });
        }
      } catch {
        // Non-blocking: log and continue
        logTaskDebug('updateTask', 'linked-records post failed', {
          taskId,
          count: updates.recordIds.length,
        });
      }
    }

    return transformed;
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
