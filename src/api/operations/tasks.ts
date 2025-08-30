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
    // Enhanced response handling with more robust structure detection
    let task: AttioTask;

    // Try different response structure patterns
    if (res?.data?.data) {
      task = res.data.data;
    } else if (res?.data && typeof res.data === 'object' && 'id' in res.data) {
      // Direct task object in data
      task = res.data as unknown as AttioTask;
    } else {
      throw new Error('Invalid API response structure: missing task data');
    }

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
    format: 'plaintext', // Required field for Attio API
  };

  if (options.dueDate) {
    taskData.deadline_at = options.dueDate;
  }
  // Do not include linked_records here; use /linked-records endpoint after create if needed

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
  const requestPayload = {
    data: {
      ...taskData,
      is_completed: false, // Always false for new tasks
      assignees,
      deadline_at: taskData.deadline_at || null, // Explicitly null if not provided
    },
  };

  return callWithRetry(async () => {
    logTaskDebug(
      'createTask',
      'Prepared create payload',
      sanitizePayload({ path, payload: requestPayload })
    );
    // Debug logging for request
    debug(
      'tasks.createTask',
      'Sending request',
      {
        path,
        payload: requestPayload,
        apiInstanceExists: !!api,
        apiClientDetails: {
          baseURL: api.defaults?.baseURL || 'NOT_SET',
          hasAuth: !!api.defaults?.headers?.Authorization,
          authPreview: api.defaults?.headers?.Authorization
            ? String(api.defaults.headers.Authorization).substring(0, 20) +
              '...'
            : 'NOT_SET',
        },
      },
      'createTask',
      OperationType.API_CALL
    );

    let res;
    try {
      debug(
        'tasks.createTask',
        'About to call api.post',
        {
          apiHasInterceptors: !!api.interceptors?.response,
          baseURL: api.defaults?.baseURL,
          apiInstance: !!api,
          hasAxiosDefaults: !!api.defaults,
          hasAxiosBaseURL: !!api.defaults?.baseURL,
        },
        'createTask',
        OperationType.API_CALL
      );
      // Try direct axios call to isolate interceptor issues
      debug(
        'tasks.createTask',
        'Making direct API call',
        {
          url: `${api.defaults?.baseURL}${path}`,
          method: 'POST',
          hasInterceptors: !!api.interceptors?.response,
          interceptorCount: 'unknown',
        },
        'createTask',
        OperationType.API_CALL
      );

      // TEMPORARY FIX: Try to isolate the undefined response issue
      try {
        debug(
          'tasks.createTask',
          'About to make axios call',
          {
            apiExists: !!api,
            pathSet: !!path,
            payloadSet: !!requestPayload,
            axiosPost: typeof api.post,
          },
          'createTask',
          OperationType.API_CALL
        );

        const axiosResponse = api.post<AttioSingleResponse<AttioTask>>(
          path,
          requestPayload
        );

        debug(
          'tasks.createTask',
          'Axios call initiated',
          {
            promiseCreated: !!axiosResponse,
            promiseType: typeof axiosResponse,
            isPromise: axiosResponse instanceof Promise,
          },
          'createTask',
          OperationType.API_CALL
        );

        res = await axiosResponse;

        debug(
          'tasks.createTask',
          'Promise awaited',
          {
            resultReceived: !!res,
            resultType: typeof res,
            resultIsNull: res === null,
            resultIsUndefined: res === undefined,
          },
          'createTask',
          OperationType.API_CALL
        );
      } catch (promiseError) {
        debug(
          'tasks.createTask',
          'Promise rejected',
          {
            error: promiseError,
            errorType: typeof promiseError,
          },
          'createTask',
          OperationType.API_CALL
        );
        throw promiseError;
      }

      debug(
        'tasks.createTask',
        'Direct API call completed',
        {
          hasResult: !!res,
          resultType: typeof res,
          isObject: res !== null && typeof res === 'object',
        },
        'createTask',
        OperationType.API_CALL
      );
      debug(
        'tasks.createTask',
        'api.post returned',
        {
          responseReceived: true,
          hasResponse: !!res,
          responseStatus: res?.status,
          responseType: typeof res,
          responseHasData: !!res?.data,
          responseDataType: typeof res?.data,
          responseKeys: res ? Object.keys(res) : [],
          responseData: res?.data ? 'DATA_PRESENT' : 'NO_DATA',
          responseStatusText: res?.statusText,
          responseHeaders: res?.headers ? 'HEADERS_PRESENT' : 'NO_HEADERS',
        },
        'createTask',
        OperationType.API_CALL
      );
    } catch (err) {
      debug(
        'tasks.createTask',
        'api.post threw error',
        {
          error: err,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorType: typeof err,
          isAxiosError: err && typeof err === 'object' && 'isAxiosError' in err,
          hasResponse: err && typeof err === 'object' && 'response' in err,
          responseStatus:
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { status?: unknown } }).response?.status
              : null,
        },
        'createTask',
        OperationType.API_CALL
      );
      throw err;
    }

    // Handle response validation
    if (!res) {
      // This is the critical issue - API call returning undefined
      debug(
        'tasks.createTask',
        'CRITICAL: api.post returned undefined',
        {
          path,
          requestPayload: JSON.stringify(requestPayload),
          apiClient: {
            hasBaseURL: !!api.defaults?.baseURL,
            baseURL: api.defaults?.baseURL,
            hasAuth: !!api.defaults?.headers?.Authorization,
            hasInterceptors: !!api.interceptors?.response,
          },
        },
        'createTask',
        OperationType.API_CALL
      );
      throw new Error(
        'Invalid API response: no response data received - api.post returned undefined'
      );
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

    // Enhanced response handling with more robust structure detection
    let task: AttioTask;

    // Try different response structure patterns
    if (res?.data?.data) {
      task = res.data.data;
    } else if (res?.data && typeof res.data === 'object' && 'id' in res.data) {
      // Direct task object in data
      task = res.data as unknown as AttioTask;
    } else {
      // Enhanced error with response structure details for debugging
      debug(
        'tasks.createTask',
        'Response structure analysis - no valid task found',
        {
          hasResponse: !!res,
          responseKeys: res ? Object.keys(res) : [],
          hasData: !!res?.data,
          dataKeys: res?.data ? Object.keys(res.data) : [],
          dataType: typeof res?.data,
        },
        'createTask',
        OperationType.API_CALL
      );
      throw new Error(
        `Invalid API response structure: missing task data. Response structure: ${JSON.stringify(
          {
            hasResponse: !!res,
            responseKeys: res ? Object.keys(res) : [],
            hasData: !!res?.data,
            dataKeys: res?.data ? Object.keys(res.data) : [],
          }
        )}`
      );
    }

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
    (data as any).assignees = [
      {
        referenced_actor_type: 'workspace-member',
        referenced_actor_id: updates.assigneeId,
      },
    ];
  }
  if (updates.dueDate) data.deadline_at = updates.dueDate; // Use deadline_at instead of due_date
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
    // Enhanced response handling with more robust structure detection
    let task: AttioTask;

    // Try different response structure patterns
    if (res?.data?.data) {
      task = res.data.data;
    } else if (res?.data && typeof res.data === 'object' && 'id' in res.data) {
      // Direct task object in data
      task = res.data as unknown as AttioTask;
    } else {
      throw new Error('Invalid API response structure: missing task data');
    }

    const transformed = transformTaskResponse(task);
    logTaskDebug(
      'updateTask',
      'Update response shape',
      inspectTaskRecordShape(transformed)
    );
    debug(
      'tasks.updateTask',
      'PATCH response received',
      { status: (res as any)?.status, hasData: !!res?.data },
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
      } catch (e) {
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
