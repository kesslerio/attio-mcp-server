/**
 * Task operations for Attio
 */
import { callWithRetry, RetryConfig } from './retry.js';
import { debug, OperationType } from '../../utils/logger.js';
import { getAttioClient } from '../attio-client.js';
import { TaskCreateData, TaskUpdateData } from '../../types/api-operations.js';

/**
 * Helper function to transform Attio API task response to internal format
 * Handles field name transformations for backward compatibility
 */
function transformTaskResponse(task: AttioTask): AttioTask {

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
 * Returns null for invalid or empty inputs to prevent API errors
 */
function formatDateForAttio(dateStr: string): string | null {
  // Validate input - return null for invalid values to prevent API errors
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '' || 
      dateStr === 'undefined' || dateStr === 'null') {
    return null;
  }
  
  
  // If already in ISO format, validate and return as-is
  if (trimmedDate.includes('T') && trimmedDate.includes('Z')) {
    if (isNaN(testDate.getTime())) {
      return null;
    }
    return trimmedDate;
  }
  
  // Handle YYYY-MM-DD format by adding time component
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    if (isNaN(testDate.getTime())) {
      return null;
    }
    return `${trimmedDate}T00:00:00Z`;
  }
  
  // Try parsing other formats and convert to ISO
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date.toISOString();
}

/**
 * Helper function to validate linking parameters
 * Both recordId and targetObject must be provided together, or neither
 */
function validateLinkingParameters(recordId?: string, targetObject?: string): void {
  
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
  params.append('page', String(page));
  params.append('pageSize', String(pageSize));
  if (status) params.append('status', status);
  if (assigneeId) params.append('assignee', assigneeId);
  return callWithRetry(async () => {
    // Transform each task in the response for backward compatibility
    return tasks.map((task) => transformTaskResponse(task));
  }, retryConfig);
}

export async function getTask(
  taskId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioTask> {
  return callWithRetry(async () => {
    return transformTaskResponse(task);
  }, retryConfig);
}

export async function createTask(
  content: string,
  options: { assigneeId?: string; dueDate?: string; recordId?: string; targetObject?: 'companies' | 'people' | 'records' } = {},
  retryConfig?: Partial<RetryConfig>
): Promise<AttioTask> {

  // Validate linking parameters: both recordId and targetObject required, or neither
  validateLinkingParameters(options.recordId, options.targetObject);

  // Build task data according to TaskCreateData interface
  const taskData: TaskCreateData = {
    content,
    format: 'plaintext', // Required field for Attio API
  };

  // Only include deadline_at if a valid date is provided
  if (options.dueDate && options.dueDate.trim() && options.dueDate !== 'undefined') {
    if (formattedDate === null) {
      debug(
        'tasks.createTask',
        'Invalid date format provided',
        { dueDate: options.dueDate },
        'createTask',
        OperationType.VALIDATION
      );
      throw new Error(`Invalid date format for task deadline: ${options.dueDate}`);
    }
    taskData.deadline_at = formattedDate;
  }

  // Build the full request payload with all required fields for the API
  // Assignees: Attio v2 expects referenced actor references
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
    ? [{ target_object: options.targetObject, target_record_id: options.recordId }]
    : [];

  // Build the request payload conditionally including deadline_at only when present
  const dataPayload: Record<string, unknown> = {
    content: taskData.content,
    format: taskData.format,
    is_completed: false, // Always false for new tasks
    assignees,
    linked_records: linkedRecords, // Always include as array (empty when not linking)
  };
  
  // Always include deadline_at in payload - Attio API expects this field to be present
  // Use null when no deadline is provided (API validation requires field presence)
  dataPayload.deadline_at = taskData.deadline_at || null;

    data: dataPayload,
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


    // Note: Only transform content field for create response (status not returned on create)
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
    if (formattedDate === null) {
      debug(
        'tasks.updateTask',
        'Invalid date format provided',
        { dueDate: updates.dueDate },
        'updateTask',
        OperationType.VALIDATION
      );
      throw new Error(`Invalid date format for task deadline: ${updates.dueDate}`);
    }
    data.deadline_at = formattedDate;
  }
  
  // Include linked_records in PATCH request (per Attio API docs)
  if (updates.recordIds && updates.recordIds.length) {
    (data as Record<string, unknown>).linked_records = updates.recordIds.map(recordId => ({
      target_object: 'companies', // Default to companies - this should be improved to detect object type
      target_record_id: recordId,
    }));
  }

  // Wrap in Attio envelope as per API requirements
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

      path,
      requestPayload
    );

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

    return transformed;
  }, retryConfig);
}

export async function deleteTask(
  taskId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<boolean> {
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
  return callWithRetry(async () => {
    await api.delete(path);
    return true;
  }, retryConfig);
}
