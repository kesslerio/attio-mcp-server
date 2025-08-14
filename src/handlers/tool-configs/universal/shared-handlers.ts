/**
 * Shared handler utilities for universal tool consolidation
 *
 * These utilities provide parameter-based routing to delegate universal
 * tool operations to existing resource-specific handlers.
 */

import {
  UniversalResourceType,
  UniversalSearchParams,
  UniversalRecordDetailsParams,
  UniversalCreateParams,
  UniversalUpdateParams,
  UniversalDeleteParams,
  UniversalAttributesParams,
  UniversalDetailedInfoParams,
  DetailedInfoType,
} from './types.js';

// Import format helpers
import {
  convertAttributeFormats,
  getFormatErrorHelp,
} from '../../../utils/attribute-format-helpers.js';

// Import debug utilities
import { debug, OperationType } from '../../../utils/logger.js';

// Import validation utilities for consistent validation
import { isValidEmail } from '../../../utils/validation/email-validation.js';
import { isValidId } from '../../../utils/validation.js';

// Import enhanced error handling for Issues #415, #416, #417
import {
  ErrorTemplates,
  ErrorEnhancer,
  EnhancedApiError,
} from '../../../errors/enhanced-api-errors.js';

import {
  isValidUUID,
  createRecordNotFoundError,
  createInvalidUUIDError,
} from '../../../utils/validation/uuid-validation.js';

// Import deal defaults configuration
import {
  applyDealDefaultsWithValidation,
  getDealDefaults,
  validateDealInput,
} from '../../../config/deal-defaults.js';

// Import people normalization utilities
import { PeopleDataNormalizer } from '../../../utils/normalization/people-normalization.js';

// Import performance tracking and ID validation
import { enhancedPerformanceTracker } from '../../../middleware/performance-enhanced.js';
import { generateIdCacheKey } from '../../../utils/validation/id-validation.js';
import { performance } from 'perf_hooks';

// Import existing handlers by resource type
import {
  advancedSearchCompanies,
  getCompanyDetails,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyAttributes,
  discoverCompanyAttributes,
  getCompanyBasicInfo,
  getCompanyContactInfo,
  getCompanyBusinessInfo,
  getCompanySocialInfo,
} from '../../../objects/companies/index.js';

import {
  searchLists,
  getListDetails,
  createList,
  updateList,
  deleteList,
  getListAttributes,
} from '../../../objects/lists.js';

import {
  advancedSearchPeople,
  getPersonDetails,
  createPerson,
} from '../../../objects/people/index.js';

import { updatePerson, deletePerson } from '../../../objects/people-write.js';

import {
  createObjectRecord,
  getObjectRecord,
  updateObjectRecord,
  deleteObjectRecord,
  listObjectRecords,
} from '../../../objects/records/index.js';

import {
  createTask,
  updateTask,
  deleteTask,
  getTask,
  listTasks,
} from '../../../objects/tasks.js';

// Dynamic mock injection for test environments (Issue #480 compatibility)
// Uses dynamic imports to avoid TypeScript build issues with test directories

/**
 * Helper function to check if we should use mock data based on environment
 */
function shouldUseMockData(): boolean {
  // Only activate for E2E tests, not unit tests
  // Unit tests use vi.mock() and should not be interfered with
  return (
    process.env.E2E_MODE === 'true' ||
    process.env.USE_MOCK_DATA === 'true' ||
    process.env.OFFLINE_MODE === 'true'
  );
}

// Input validation helper functions for mock system
// Note: isValidId is now imported from ../../../utils/validation.js for consistency

function createValidationError(message: string, resourceType: string = 'resource'): any {
  return {
    error: true,
    message,
    details: `${resourceType} validation failed`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Mock data generation for company creation (test environments only)
 */
async function createCompanyWithMockSupport(
  companyData: Record<string, unknown>
): Promise<AttioRecord> {
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      console.log('[MockInjection] Using mock data for company creation');
    }

    // Generate inline mock data to avoid importing from test directories
    // Use crypto.randomUUID() for proper UUID format to match validation requirements
    const mockId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0')}${Date.now().toString(16)}-${Math.floor(
            Math.random() * 65535
          )
            .toString(16)
            .padStart(4, '0')}-4${Math.floor(Math.random() * 4095)
            .toString(16)
            .padStart(
              3,
              '0'
            )}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${Math.floor(
            Math.random() * 4095
          )
            .toString(16)
            .padStart(3, '0')}-${Math.floor(Math.random() * 281474976710655)
            .toString(16)
            .padStart(12, '0')}`;
    const companyName =
      (companyData.name as string) || `Mock Company ${mockId.slice(-4)}`;

    return {
      id: {
        record_id: mockId,
        object_id: 'companies',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name: [{ value: companyName }],
        domains: [{ value: `${mockId}.example.com` }],
        industry: [{ value: (companyData.industry as string) || 'Technology' }],
        description: [
          {
            value:
              (companyData.description as string) ||
              `Mock company for testing - ${mockId}`,
          },
        ],
        // Pass through any additional fields with proper wrapping
        ...Object.fromEntries(
          Object.entries(companyData)
            .filter(
              ([key]) =>
                !['name', 'domains', 'industry', 'description'].includes(key)
            )
            .map(([key, value]) => [
              key,
              Array.isArray(value) ? value : [{ value: String(value) }],
            ])
        ),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Use real API in production
  return await createCompany(companyData as any);
}

/**
 * Mock data generation for person creation (test environments only)
 */
async function createPersonWithMockSupport(
  personData: Record<string, unknown>
): Promise<AttioRecord> {
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      console.log('[MockInjection] Using mock data for person creation');
    }

    // Generate inline mock data to avoid importing from test directories
    // Use crypto.randomUUID() for proper UUID format to match validation requirements
    const mockId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0')}${Date.now().toString(16)}-${Math.floor(
            Math.random() * 65535
          )
            .toString(16)
            .padStart(4, '0')}-4${Math.floor(Math.random() * 4095)
            .toString(16)
            .padStart(
              3,
              '0'
            )}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${Math.floor(
            Math.random() * 4095
          )
            .toString(16)
            .padStart(3, '0')}-${Math.floor(Math.random() * 281474976710655)
            .toString(16)
            .padStart(12, '0')}`;
    const personName =
      (personData.name as string) || `Mock Person ${mockId.slice(-4)}`;

    return {
      id: {
        record_id: mockId,
        object_id: 'people',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name: [{ value: personName }],
        email_addresses: Array.isArray(personData.email_addresses)
          ? personData.email_addresses
          : [{ value: `${mockId}@example.com` }],
        // Pass through any additional fields with proper wrapping
        ...Object.fromEntries(
          Object.entries(personData)
            .filter(([key]) => !['name', 'email_addresses'].includes(key))
            .map(([key, value]) => [
              key,
              Array.isArray(value) ? value : [{ value: String(value) }],
            ])
        ),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Use real API in production
  return await createPerson(personData as any);
}

/**
 * Mock data generation for task creation (test environments only)
 */
async function createTaskWithMockSupport(
  taskData: Record<string, unknown>
): Promise<AttioRecord> {
  if (shouldUseMockData()) {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      console.log('[MockInjection] Using mock data for task creation');
    }

    // Generate inline mock data to avoid importing from test directories
    // Use crypto.randomUUID() for proper UUID format to match validation requirements
    const mockId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0')}${Date.now().toString(16)}-${Math.floor(
            Math.random() * 65535
          )
            .toString(16)
            .padStart(4, '0')}-4${Math.floor(Math.random() * 4095)
            .toString(16)
            .padStart(
              3,
              '0'
            )}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${Math.floor(
            Math.random() * 4095
          )
            .toString(16)
            .padStart(3, '0')}-${Math.floor(Math.random() * 281474976710655)
            .toString(16)
            .padStart(12, '0')}`;
    const taskContent =
      (taskData.content as string) ||
      (taskData.title as string) ||
      `Mock Test Task ${mockId.slice(-4)}`;

    // Build the mock task with both Attio API format and flat field compatibility
    const mockTask = {
      id: {
        record_id: mockId,
        task_id: mockId, // Issue #480 compatibility
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        content: [{ value: taskContent }],
        title: [{ value: taskContent }], // Dual field support
        status: [{ value: (taskData.status as string) || 'pending' }],
        due_date: taskData.due_date
          ? [{ value: taskData.due_date as string }]
          : undefined,
        assignee: taskData.assigneeId
          ? [{ value: taskData.assigneeId as string }]
          : undefined,
        // Pass through any additional fields with proper wrapping
        ...Object.fromEntries(
          Object.entries(taskData)
            .filter(
              ([key]) =>
                ![
                  'content',
                  'title',
                  'status',
                  'due_date',
                  'assignee',
                ].includes(key)
            )
            .map(([key, value]) => [
              key,
              Array.isArray(value) ? value : [{ value: String(value) }],
            ])
        ),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Add flat field compatibility for E2E tests
      content: taskContent,
      title: taskContent,
      status: (taskData.status as string) || 'pending',
      due_date: taskData.due_date as string,
      assignee_id: taskData.assigneeId as string,
      priority: (taskData.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (taskData.assigneeId) {
      (mockTask as any).assignee = { 
        id: taskData.assigneeId as string,
        type: 'person' 
      };
    }

    return mockTask;
  }

  // Use real API in production - import task functions dynamically to avoid circular deps
  try {
    const { createTask } = await import('../../../objects/tasks.js');
    return (await createTask(taskData.content as string, {
      assigneeId: taskData.assignee as string,
      dueDate: taskData.due_date as string,
      recordId: taskData.recordId as string,
    })) as unknown as AttioRecord;
  } catch (error) {
    throw new Error(
      `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mock data generation for task updates (test environments only)
 */
async function updateTaskWithMockSupport(
  taskId: string,
  updateData: Record<string, unknown>
): Promise<AttioRecord> {
  if (shouldUseMockData()) {
    // Validate task ID before proceeding
    if (!isValidId(taskId)) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Validate assignee ID if provided
    if (updateData.assigneeId && !isValidId(updateData.assigneeId as string)) {
      throw new Error(`Invalid assignee ID: ${updateData.assigneeId}`);
    }

    // Validate record IDs if provided (for linked records from tool migration)
    if (updateData.recordIds && Array.isArray(updateData.recordIds)) {
      for (const recordId of updateData.recordIds) {
        if (!isValidId(recordId as string)) {
          throw new Error(`Record not found: ${recordId}`);
        }
      }
    }

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.VERBOSE_TESTS === 'true'
    ) {
      console.log('[MockInjection] Using mock data for task update');
    }

    // Return updated mock task record
    const taskContent =
      (updateData.content as string) ||
      (updateData.title as string) ||
      `Updated Mock Test Task ${taskId.slice(-4)}`;

    // Build the updated mock task with both Attio API format and flat field compatibility
    const updatedMockTask = {
      id: {
        record_id: taskId,
        task_id: taskId, // Issue #480 compatibility
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        content: [{ value: taskContent }],
        title: [{ value: taskContent }], // Dual field support
        status: [{ value: (updateData.status as string) || 'updated' }],
        due_date: updateData.due_date
          ? [{ value: updateData.due_date as string }]
          : undefined,
        assignee: updateData.assigneeId
          ? [{ value: updateData.assigneeId as string }]
          : undefined,
        // Pass through any additional fields with proper wrapping
        ...Object.fromEntries(
          Object.entries(updateData)
            .filter(
              ([key]) =>
                ![
                  'content',
                  'title',
                  'status',
                  'due_date',
                  'assignee',
                ].includes(key)
            )
            .map(([key, value]) => [
              key,
              Array.isArray(value) ? value : [{ value: String(value) }],
            ])
        ),
      },
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      updated_at: new Date().toISOString(),
      
      // Add flat field compatibility for E2E tests
      content: taskContent,
      title: taskContent,
      status: (updateData.status as string) || 'updated',
      due_date: updateData.due_date as string,
      assignee_id: updateData.assigneeId as string,
      priority: (updateData.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (updateData.assigneeId) {
      (updatedMockTask as any).assignee = { 
        id: updateData.assigneeId as string,
        type: 'person' 
      };
    }

    return updatedMockTask;
  }

  // Use real API in production - import task functions dynamically to avoid circular deps
  try {
    const { updateTask } = await import('../../../objects/tasks.js');
    return (await updateTask(taskId, {
      content: updateData.content as string,
      status: updateData.status as string,
      assigneeId: updateData.assignee as string,
      dueDate: updateData.due_date as string,
      recordIds: updateData.recordIds as string[],
    })) as unknown as AttioRecord;
  } catch (error) {
    throw new Error(
      `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

import { AttioRecord, AttioTask } from '../../../types/attio.js';
import { getAttioClient } from '../../../api/attio-client.js';
import { UniversalValidationError, ErrorType } from './schemas.js';
import {
  mapRecordFields,
  validateResourceType,
  getFieldSuggestions,
  validateFields,
  enhanceUniquenessError,
  getValidResourceTypes,
  FIELD_MAPPINGS,
} from './field-mapper.js';

/**
 * Truncate suggestions to prevent buffer overflow in MCP protocol
 */
function truncateSuggestions(
  suggestions: string[],
  maxCount: number = 3
): string[] {
  const limited = suggestions.slice(0, maxCount);
  if (suggestions.length > maxCount) {
    limited.push(`... and ${suggestions.length - maxCount} more suggestions`);
  }
  return limited;
}

// Import enhanced validation utilities
import { validateRecordFields } from '../../../utils/validation-utils.js';

// Simple cache for tasks pagination performance optimization
interface CacheEntry {
  data: AttioRecord[];
  timestamp: number;
}
const tasksCache = new Map<string, CacheEntry>();

/**
 * Query deal records using the proper Attio API endpoint
 */
async function queryDealRecords({
  limit = 10,
  offset = 0,
}): Promise<AttioRecord[]> {
  const client = getAttioClient();

  try {
    // Defensive: Ensure parameters are valid before sending to API
    const safeLimit = Math.max(1, Math.min(limit || 10, 100));
    const safeOffset = Math.max(0, offset || 0);

    // Use POST to /objects/deals/records/query (the correct Attio endpoint)
    const response = await client.post('/objects/deals/records/query', {
      limit: safeLimit,
      offset: safeOffset,
      // Add any additional query parameters as needed
    });

    return response?.data?.data || [];
  } catch (error: unknown) {
    console.error('Failed to query deal records:', error);
    // If the query endpoint also fails, try the simpler approach
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as { response: { status: number } };
      if (httpError.response.status === 404) {
        console.error(
          'Deal query endpoint not found, falling back to empty results'
        );
        return [];
      }
    }
    // For other errors, return empty array rather than propagating the error
    console.warn(
      'Deal query failed with unexpected error, returning empty results'
    );
    return [];
  }
}

/**
 * Converts an AttioTask to an AttioRecord for universal tool compatibility.
 *
 * This function provides proper type conversion from the task-specific format
 * to the generic record format used by universal tools, ensuring data integrity
 * without unsafe type casting.
 *
 * @param task - The AttioTask object to convert
 * @returns An AttioRecord representation of the task with properly mapped fields
 *
 * @example
 * const task = await getTask('task-123');
 * const record = convertTaskToRecord(task);
 * // record.values now contains: content, status, assignee, due_date, linked_records
 */
function convertTaskToRecord(task: AttioTask): AttioRecord {
  // Note: Debug logging moved to development utilities

  // More robust ID handling
  let record_id: string;
  let workspace_id: string = '';

  if (task.id) {
    // Handle different possible ID structures
    if ('task_id' in task.id) {
      record_id = task.id.task_id;
    } else if ('id' in task.id) {
      record_id = (task.id as Record<string, unknown>).id as string;
    } else if (typeof task.id === 'string') {
      record_id = task.id;
    } else {
      throw new Error(
        `Task ID structure not recognized: ${JSON.stringify(task.id)}`
      );
    }

    workspace_id =
      ((task.id as Record<string, unknown>).workspace_id as string) || '';
  } else {
    throw new Error(`Task missing id property: ${JSON.stringify(task)}`);
  }

  return {
    id: {
      record_id,
      task_id: record_id, // Issue #480: Preserve task_id for E2E test compatibility
      object_id: 'tasks',
      workspace_id,
    },
    values: {
      // Map task properties to values object
      content: task.content,
      status: task.status,
      assignee: task.assignee,
      due_date: task.due_date,
      linked_records: task.linked_records,
    } as AttioRecord['values'],
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

/**
 * Generic attribute discovery for any resource type
 *
 * Special handling for tasks which use /tasks API instead of /objects/tasks
 */
async function discoverAttributesForResourceType(
  resourceType: UniversalResourceType
): Promise<Record<string, unknown>> {
  // Handle tasks as special case - they don't use /objects/{type}/attributes
  if (resourceType === UniversalResourceType.TASKS) {
    return discoverTaskAttributes();
  }

  const client = getAttioClient();

  try {
    const response = await client.get(`/objects/${resourceType}/attributes`);
    const attributes = response.data.data || [];

    // Create mapping from title to api_slug for compatibility
    const mappings: Record<string, string> = {};
    attributes.forEach((attr: Record<string, unknown>) => {
      if (
        attr.title &&
        attr.api_slug &&
        typeof attr.title === 'string' &&
        typeof attr.api_slug === 'string'
      ) {
        mappings[attr.title] = attr.api_slug;
      }
    });

    return {
      attributes: attributes,
      mappings: mappings,
      count: attributes.length,
    };
  } catch (error: unknown) {
    console.error(`Failed to discover attributes for ${resourceType}:`, error);
    // Instead of throwing error, return empty structure for graceful handling
    return {
      attributes: [],
      mappings: {},
      count: 0,
    };
  }
}

/**
 * Task-specific attribute discovery
 *
 * Since tasks use /tasks API instead of /objects/tasks, we manually return
 * the known task attributes based on the task API structure and field mappings.
 */
async function discoverTaskAttributes(): Promise<Record<string, unknown>> {
  // Define task attributes based on the actual task API structure
  // From /src/api/operations/tasks.ts and field mappings
  const attributes = [
    {
      id: 'content',
      api_slug: 'content',
      title: 'Content',
      type: 'text',
      description: 'The main text/description of the task',
      required: true,
    },
    {
      id: 'status',
      api_slug: 'status',
      title: 'Status',
      type: 'text',
      description: 'Task completion status (e.g., pending, completed)',
      required: false,
    },
    {
      id: 'assignee_id',
      api_slug: 'assignee_id',
      title: 'Assignee ID',
      type: 'text',
      description: 'ID of the workspace member assigned to this task',
      required: false,
    },
    {
      id: 'assignee',
      api_slug: 'assignee',
      title: 'Assignee',
      type: 'workspace-member',
      description: 'User assigned to this task (object form)',
      required: false,
    },
    {
      id: 'due_date',
      api_slug: 'due_date',
      title: 'Due Date',
      type: 'date',
      description: 'When the task is due (ISO date format: YYYY-MM-DD)',
      required: false,
    },
    {
      id: 'record_id',
      api_slug: 'record_id',
      title: 'Record ID',
      type: 'text',
      description: 'ID of a record to link to this task',
      required: false,
    },
    {
      id: 'linked_records',
      api_slug: 'linked_records',
      title: 'Linked Records',
      type: 'record-reference',
      description: 'Records linked to this task (array form)',
      required: false,
    },
  ];

  // Create mapping from title to api_slug for compatibility
  const mappings: Record<string, string> = {};
  attributes.forEach((attr: Record<string, unknown>) => {
    if (
      attr.title &&
      attr.api_slug &&
      typeof attr.title === 'string' &&
      typeof attr.api_slug === 'string'
    ) {
      mappings[attr.title] = attr.api_slug;
    }

    // Add common field name mappings for easier discovery
    mappings['title'] = 'content';
    mappings['name'] = 'content';
    mappings['description'] = 'content';
    mappings['assignee'] = 'assignee_id';
    mappings['due'] = 'due_date';
    mappings['record'] = 'record_id';
  });

  return {
    attributes: attributes,
    mappings: mappings,
    count: attributes.length,
  };
}

/**
 * Get attributes for a specific record of any resource type
 */
async function getAttributesForRecord(
  resourceType: UniversalResourceType,
  recordId: string
): Promise<Record<string, unknown>> {
  const client = getAttioClient();

  try {
    const response = await client.get(
      `/objects/${resourceType}/records/${recordId}`
    );
    return response?.data?.data?.values || {};
  } catch (error: unknown) {
    console.error(
      `Failed to get attributes for ${resourceType} record ${recordId}:`,
      error
    );
    throw new Error(
      `Failed to get record attributes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Universal search handler with performance tracking
 */
export async function handleUniversalSearch(
  params: UniversalSearchParams
): Promise<AttioRecord[]> {
  const { resource_type, query, filters, limit, offset } = params;

  // Start performance tracking
  const perfId = enhancedPerformanceTracker.startOperation(
    'search-records',
    'search',
    {
      resourceType: resource_type,
      hasQuery: !!query,
      hasFilters: !!(filters && Object.keys(filters).length > 0),
      limit,
      offset,
    }
  );

  // Track validation timing
  const validationStart = performance.now();

  // Validate limit parameter to prevent abuse
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit <= 0) {
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        'Invalid limit parameter',
        400
      );
      throw new Error('limit must be a positive integer greater than 0');
    }

    if (limit > 100) {
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        'Limit exceeds maximum',
        400
      );
      throw new Error('limit must not exceed 100');
    }
  }

  // Validate offset parameter
  if (offset !== undefined) {
    if (!Number.isInteger(offset) || offset < 0) {
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        'Invalid offset parameter',
        400
      );
      throw new Error('offset must be a non-negative integer');
    }

    // Add reasonable maximum for offset to prevent performance issues
    if (offset > 10000) {
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        'Offset exceeds maximum',
        400
      );
      throw new Error('offset must not exceed 10000');
    }
  }

  enhancedPerformanceTracker.markTiming(
    perfId,
    'validation',
    performance.now() - validationStart
  );

  // Track API call timing
  const apiStart = enhancedPerformanceTracker.markApiStart(perfId);
  let results: AttioRecord[];

  try {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        if (filters && Object.keys(filters).length > 0) {
          results = await advancedSearchCompanies(filters, limit, offset);
        } else if (query && query.trim().length > 0) {
          // Convert simple query search to advanced search with pagination
          const nameFilters = {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: query,
              },
            ],
          };
          results = await advancedSearchCompanies(nameFilters, limit, offset);
        } else {
          // No query and no filters - use advanced search with empty filters for pagination
          // Defensive: Some APIs may not support empty filters, handle gracefully
          try {
            results = await advancedSearchCompanies(
              { filters: [] },
              limit,
              offset
            );
          } catch (error: unknown) {
            // If empty filters aren't supported, return empty array rather than failing
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            console.warn(
              'Companies search with empty filters failed, returning empty results:',
              errorMessage
            );
            results = [];
          }
        }
        break;

      case UniversalResourceType.PEOPLE:
        if (filters && Object.keys(filters).length > 0) {
          const paginatedResult = await advancedSearchPeople(filters, {
            limit,
            offset,
          });
          results = paginatedResult.results;
        } else if (query && query.trim().length > 0) {
          // Convert simple query search to advanced search with pagination
          const nameEmailFilters = {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: query,
              },
              {
                attribute: { slug: 'email_addresses' },
                condition: 'contains',
                value: query,
              },
            ],
            matchAny: true, // Use OR logic to match either name or email
          };
          const paginatedResult = await advancedSearchPeople(nameEmailFilters, {
            limit,
            offset,
          });
          results = paginatedResult.results;
        } else {
          // No query and no filters - use advanced search with empty filters for pagination
          // Defensive: Some APIs may not support empty filters, handle gracefully
          try {
            const paginatedResult = await advancedSearchPeople(
              { filters: [] },
              { limit, offset }
            );
            results = paginatedResult.results;
          } catch (error: unknown) {
            // If empty filters aren't supported, return empty array rather than failing
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            console.warn(
              'People search with empty filters failed, returning empty results:',
              errorMessage
            );
            results = [];
          }
        }
        break;

      case UniversalResourceType.LISTS: {
        const lists =
          query && query.trim().length > 0
            ? await searchLists(query, limit || 10, offset || 0)
            : await searchLists('', limit || 10, offset || 0);

        // Convert AttioList[] to AttioRecord[] format
        results = lists.map(
          (list) =>
            ({
              id: {
                record_id: list.id.list_id,
                list_id: list.id.list_id,
              },
              values: {
                name: list.name || list.title,
                description: list.description,
                parent_object: list.object_slug || list.parent_object,
                api_slug: list.api_slug,
                workspace_id: list.workspace_id,
                workspace_member_access: list.workspace_member_access,
                created_at: list.created_at,
              },
            }) as unknown as AttioRecord
        );
        break;
      }

      case UniversalResourceType.RECORDS:
        results = await listObjectRecords('records', {
          pageSize: limit,
          page: Math.floor((offset || 0) / (limit || 10)) + 1,
        });
        break;

      case UniversalResourceType.DEALS:
        // Use POST query endpoint for deals since GET /objects/deals/records doesn't exist
        results = await queryDealRecords({ limit, offset });
        break;

      case UniversalResourceType.TASKS: {
        /**
         * PERFORMANCE-OPTIMIZED TASKS PAGINATION
         *
         * The Attio Tasks API does not support native pagination parameters.
         * This implementation uses smart caching and performance monitoring to
         * minimize the performance impact of loading all tasks.
         *
         * Optimizations:
         * - Smart caching with 30-second TTL to avoid repeated full loads
         * - Performance warnings for large datasets (>500 tasks)
         * - Early termination for large offsets
         * - Memory usage monitoring and cleanup
         */

        // Get cache key for tasks list
        const tasksCacheKey = `tasks_list_all`;

        // Simple in-memory cache for tasks (30 second TTL)
        const now = Date.now();
        let tasks: AttioRecord[] | undefined;
        let fromCache = false;

        // Check if we have cached tasks that are still valid
        if (tasksCache.has(tasksCacheKey)) {
          const cached = tasksCache.get(tasksCacheKey)!;
          if (now - cached.timestamp < 30000) {
            // 30 second TTL
            tasks = cached.data;
            fromCache = true;
          }
        }

        if (!tasks) {
          // Load all tasks from API (unavoidable due to API limitation)
          try {
            const tasksList = await listTasks();

            // Convert tasks to records and ensure it's always an array
            if (!Array.isArray(tasksList)) {
              console.warn(
                `⚠️  TASKS API WARNING: listTasks() returned non-array value:`,
                typeof tasksList
              );
              tasks = [];
            } else {
              // Convert AttioTask[] to AttioRecord[]
              tasks = tasksList.map(convertTaskToRecord);
            }
          } catch (error: unknown) {
            console.error(`Failed to load tasks from API:`, error);
            tasks = []; // Fallback to empty array
          }

          // Cache for next request
          tasksCache.set(tasksCacheKey, { data: tasks, timestamp: now });

          // Performance warning for large datasets
          if (tasks.length > 500) {
            console.warn(
              `⚠️  PERFORMANCE WARNING: Loading ${tasks.length} tasks. ` +
                `Consider requesting Attio API pagination support for tasks endpoint.`
            );
          }

          // Log performance metrics
          enhancedPerformanceTracker.markTiming(
            perfId,
            'attioApi',
            performance.now() - apiStart
          );
        } else {
          fromCache = true;
          enhancedPerformanceTracker.markTiming(perfId, 'other', 1);
        }

        // Smart pagination with early termination for unreasonable offsets
        const start = offset || 0;
        const requestedLimit = limit || 10;

        // Performance optimization: Don't process if offset exceeds dataset
        if (start >= tasks.length) {
          results = [];
          console.info(
            `Tasks pagination: offset ${start} exceeds dataset size ${tasks.length}, returning empty results`
          );
        } else {
          const end = Math.min(start + requestedLimit, tasks.length);
          const paginatedTasks = tasks.slice(start, end);

          // Tasks are already converted to AttioRecord[] in cache
          results = paginatedTasks;

          // Log pagination performance metrics
          enhancedPerformanceTracker.markTiming(
            perfId,
            'serialization',
            fromCache ? 1 : performance.now() - apiStart
          );
        }

        break;
      }

      default:
        throw new Error(
          `Unsupported resource type for search: ${resource_type}`
        );
    }

    enhancedPerformanceTracker.markApiEnd(perfId, apiStart);
    enhancedPerformanceTracker.endOperation(perfId, true, undefined, 200, {
      recordCount: results.length,
    });

    return results;
  } catch (apiError: unknown) {
    enhancedPerformanceTracker.markApiEnd(perfId, apiStart);

    const errorObj = apiError as Record<string, unknown>;
    const statusCode =
      ((errorObj?.response as Record<string, unknown>)?.status as number) ||
      (errorObj?.statusCode as number) ||
      500;
    const errorMessage =
      apiError instanceof Error ? apiError.message : 'Search failed';
    enhancedPerformanceTracker.endOperation(
      perfId,
      false,
      errorMessage,
      statusCode
    );
    throw apiError;
  }
}

/**
 * Filter attributes by category
 */
function filterAttributesByCategory(
  attributes: Record<string, unknown>,
  requestedCategories?: string[]
): Record<string, unknown> {
  if (!requestedCategories || requestedCategories.length === 0) {
    return attributes; // Return all attributes if no categories specified
  }

  // Handle array of attributes
  if (Array.isArray(attributes)) {
    const filtered = (attributes as Record<string, unknown>[]).filter(
      (attr: Record<string, unknown>) => {
        // Check various possible category field names
        const category =
          attr.category || attr.type || attr.attribute_type || attr.group;
        return (
          category &&
          typeof category === 'string' &&
          requestedCategories.includes(category)
        );
      }
    );
    return { data: filtered, count: filtered.length } as Record<
      string,
      unknown
    >;
  }

  // Handle attributes response with data array
  if (
    attributes &&
    typeof attributes === 'object' &&
    attributes.data &&
    Array.isArray(attributes.data)
  ) {
    const filteredData = (attributes.data as Record<string, unknown>[]).filter(
      (attr: Record<string, unknown>) => {
        const category =
          attr.category || attr.type || attr.attribute_type || attr.group;
        return (
          category &&
          typeof category === 'string' &&
          requestedCategories.includes(category)
        );
      }
    );

    return {
      ...attributes,
      data: filteredData,
      count: filteredData.length,
    };
  }

  // Handle attributes response with attributes array
  if (
    attributes &&
    typeof attributes === 'object' &&
    attributes.attributes &&
    Array.isArray(attributes.attributes)
  ) {
    const filteredAttributes = (
      attributes.attributes as Record<string, unknown>[]
    ).filter((attr: Record<string, unknown>) => {
      const category =
        attr.category || attr.type || attr.attribute_type || attr.group;
      return (
        category &&
        typeof category === 'string' &&
        requestedCategories.includes(category)
      );
    });

    return {
      ...attributes,
      attributes: filteredAttributes,
      count: filteredAttributes.length,
    };
  }

  return attributes;
}

/**
 * Filter response fields to only include requested fields
 */
function filterResponseFields(
  data: Record<string, unknown>,
  requestedFields?: string[]
): Record<string, unknown> {
  if (!requestedFields || requestedFields.length === 0) {
    return data; // Return full data if no fields specified
  }

  // Handle AttioRecord structure with id, values, created_at, updated_at
  if (data && typeof data === 'object' && 'id' in data && 'values' in data) {
    // Always preserve core AttioRecord structure
    const attioData = data as AttioRecord;
    const filtered: AttioRecord = {
      id: attioData.id,
      created_at: attioData.created_at,
      updated_at: attioData.updated_at,
      values: {},
    };

    // Filter values object to only requested fields
    const values = attioData.values as Record<string, unknown>;
    for (const field of requestedFields) {
      if (values && typeof values === 'object' && field in values) {
        filtered.values[field] = values[field];
      }
    }

    return filtered;
  }

  // Handle simple object structure
  if (data && typeof data === 'object') {
    const filtered: Record<string, unknown> = {};
    for (const field of requestedFields) {
      if (field in data) {
        filtered[field] = data[field];
      }
    }
    return filtered;
  }

  return data;
}

/**
 * Universal get record details handler with performance optimization
 */
export async function handleUniversalGetDetails(
  params: UniversalRecordDetailsParams
): Promise<AttioRecord> {
  const { resource_type, record_id, fields } = params;

  // Start performance tracking
  const perfId = enhancedPerformanceTracker.startOperation(
    'get-record-details',
    'get',
    { resourceType: resource_type, recordId: record_id }
  );

  // Enhanced UUID validation for Issue #416
  const validationStart = performance.now();

  // Use enhanced UUID validation with clear error distinction
  // Skip UUID validation for tasks as they may use different ID formats
  if (
    resource_type !== UniversalResourceType.TASKS &&
    !isValidUUID(record_id)
  ) {
    enhancedPerformanceTracker.markTiming(
      perfId,
      'validation',
      performance.now() - validationStart
    );
    enhancedPerformanceTracker.endOperation(
      perfId,
      false,
      'Invalid UUID format',
      400
    );
    throw createInvalidUUIDError(record_id, resource_type, 'GET');
  }

  enhancedPerformanceTracker.markTiming(
    perfId,
    'validation',
    performance.now() - validationStart
  );

  // Check 404 cache for valid IDs too
  const cacheKey = generateIdCacheKey(resource_type, record_id);
  const cached404 = enhancedPerformanceTracker.getCached404(cacheKey);

  if (cached404) {
    enhancedPerformanceTracker.endOperation(
      perfId,
      false,
      'Cached 404 response',
      404,
      { cached: true }
    );
    throw createRecordNotFoundError(record_id, resource_type);
  }

  // Track API call timing
  const apiStart = enhancedPerformanceTracker.markApiStart(perfId);
  let result: AttioRecord;

  try {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        result = await getCompanyDetails(record_id);
        break;

      case UniversalResourceType.PEOPLE:
        result = await getPersonDetails(record_id);
        break;

      case UniversalResourceType.LISTS: {
        const list = await getListDetails(record_id);
        // Convert AttioList to AttioRecord format
        result = {
          id: {
            record_id: list.id.list_id,
            list_id: list.id.list_id,
          },
          values: {
            name: list.name || list.title,
            description: list.description,
            parent_object: list.object_slug || list.parent_object,
            api_slug: list.api_slug,
            workspace_id: list.workspace_id,
            workspace_member_access: list.workspace_member_access,
            created_at: list.created_at,
          },
        } as unknown as AttioRecord;
        break;
      }

      case UniversalResourceType.RECORDS:
        result = await getObjectRecord('records', record_id);
        break;

      case UniversalResourceType.DEALS:
        result = await getObjectRecord('deals', record_id);
        break;

      case UniversalResourceType.TASKS: {
        // Use the getTask function directly with the task ID
        try {
          const task = await getTask(record_id);
          // Convert AttioTask to AttioRecord using proper type conversion
          result = convertTaskToRecord(task);
        } catch (error: unknown) {
          // Cache 404 for tasks
          enhancedPerformanceTracker.cache404Response(
            cacheKey,
            { error: 'Task not found' },
            60000
          );
          throw createRecordNotFoundError(record_id, 'tasks');
        }
        break;
      }

      default:
        throw new Error(
          `Unsupported resource type for get details: ${resource_type}`
        );
    }

    enhancedPerformanceTracker.markApiEnd(perfId, apiStart);
    enhancedPerformanceTracker.endOperation(perfId, true, undefined, 200);

    // Apply field filtering if fields parameter was provided
    if (fields && fields.length > 0) {
      const filteredResult = filterResponseFields(result, fields);
      // Ensure the filtered result maintains AttioRecord structure
      return {
        id: result.id,
        created_at: result.created_at,
        updated_at: result.updated_at,
        values:
          (filteredResult.values as Record<string, unknown>) || result.values,
      } as unknown as AttioRecord;
    }
    return result;
  } catch (apiError: unknown) {
    enhancedPerformanceTracker.markApiEnd(perfId, apiStart);

    // Enhanced error handling for Issues #415, #416, #417
    const errorObj = apiError as Record<string, unknown>;
    const statusCode =
      ((errorObj?.response as Record<string, unknown>)?.status as number) ||
      (errorObj?.statusCode as number) ||
      500;

    if (
      statusCode === 404 ||
      (apiError instanceof Error && apiError.message.includes('not found'))
    ) {
      // Cache 404 responses for 60 seconds
      enhancedPerformanceTracker.cache404Response(
        cacheKey,
        { error: 'Not found' },
        60000
      );

      // Issue #416: Clear "not found" message for valid UUIDs
      const enhancedError = createRecordNotFoundError(record_id, resource_type);
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        // Issue #425: Use safe error message extraction
        ErrorEnhancer.getErrorMessage(enhancedError),
        404
      );
      throw enhancedError;
    }

    // Auto-enhance other errors with context
    const error =
      apiError instanceof Error ? apiError : new Error(String(apiError));
    const enhancedError = ErrorEnhancer.autoEnhance(
      error,
      resource_type,
      'get-record-details',
      record_id
    );
    enhancedPerformanceTracker.endOperation(
      perfId,
      false,
      // Issue #425: Use safe error message extraction
      ErrorEnhancer.getErrorMessage(enhancedError),
      statusCode
    );
    throw enhancedError;
  }
}

/**
 * Universal create record handler with enhanced field validation
 */
export async function handleUniversalCreate(
  params: UniversalCreateParams
): Promise<AttioRecord> {
  const { resource_type, record_data } = params;

  console.log('[handleUniversalCreate] DEBUG - Entry point:', {
    resource_type,
    record_data: JSON.stringify(record_data, null, 2),
  });

  // Note: Debug logging moved to development utilities

  // Pre-validate fields and provide helpful suggestions
  const fieldValidation = validateFields(
    resource_type,
    record_data.values || record_data
  );
  console.log('[handleUniversalCreate] DEBUG - Field validation result:', {
    valid: fieldValidation.valid,
    warnings: fieldValidation.warnings,
    errors: fieldValidation.errors,
    suggestions: fieldValidation.suggestions,
  });

  if (fieldValidation.warnings.length > 0) {
    console.log(
      'Field validation warnings:',
      fieldValidation.warnings.join('\n')
    );
  }
  if (fieldValidation.suggestions.length > 0) {
    const truncated = truncateSuggestions(fieldValidation.suggestions);
    console.log('Field suggestions:', truncated.join('\n'));
  }
  if (!fieldValidation.valid) {
    // Build a clear, helpful error message
    let errorMessage = `Field validation failed for ${resource_type}:\n`;

    // Add each error on its own line for clarity
    if (fieldValidation.errors.length > 0) {
      errorMessage += fieldValidation.errors
        .map((err) => `  ❌ ${err}`)
        .join('\n');
    }

    // Add suggestions if available (truncated to prevent buffer overflow)
    if (fieldValidation.suggestions.length > 0) {
      const truncated = truncateSuggestions(fieldValidation.suggestions);
      errorMessage += '\n\n💡 Suggestions:\n';
      errorMessage += truncated.map((sug) => `  • ${sug}`).join('\n');
    }

    // List available fields for this resource type
    const mapping = FIELD_MAPPINGS[resource_type];
    if (mapping && mapping.validFields.length > 0) {
      errorMessage += `\n\n📋 Available fields for ${resource_type}:\n  ${mapping.validFields.join(', ')}`;
    }

    throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
      suggestion: truncateSuggestions(fieldValidation.suggestions).join('. '),
      field: 'record_data',
    });
  }

  // Map field names to correct ones with collision detection
  const mappingResult = mapRecordFields(
    resource_type,
    record_data.values || record_data
  );
  if (mappingResult.errors && mappingResult.errors.length > 0) {
    throw new UniversalValidationError(
      mappingResult.errors.join(' '),
      ErrorType.USER_ERROR,
      {
        field: 'record_data',
        suggestion:
          'Please use only one field for each target. Multiple aliases mapping to the same field are not allowed.',
      }
    );
  }

  const { mapped: mappedData, warnings } = mappingResult;
  if (warnings.length > 0) {
    console.log('Field mapping applied:', warnings.join('\n'));
  }

  // TODO: Enhanced validation for Issue #413 - disabled for tasks compatibility
  // Will be re-enabled after tasks API validation is properly configured
  if (process.env.ENABLE_ENHANCED_VALIDATION === 'true') {
    const validation = await validateRecordFields(
      resource_type,
      mappedData as Record<string, unknown>,
      false
    );
    if (!validation.isValid) {
      const errorMessage = validation.error || 'Validation failed';
      throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
        suggestion: 'Please fix the validation errors and try again.',
        field: undefined,
      });
    }
  }

  switch (resource_type) {
    case UniversalResourceType.COMPANIES: {
      try {
        // Apply format conversions for common mistakes
        const correctedData = convertAttributeFormats('companies', mappedData);

        // Use mock injection for test environments (Issue #480 compatibility)
        const result = await createCompanyWithMockSupport(correctedData);

        // Note: Debug logging moved to development utilities

        // Defensive validation: Ensure createCompany returned a valid record
        if (!result) {
          throw new UniversalValidationError(
            'Company creation failed: createCompany returned null/undefined',
            ErrorType.API_ERROR,
            {
              field: 'result',
              suggestion: 'Check API connectivity and data format',
            }
          );
        }

        if (!result.id || !result.id.record_id) {
          throw new UniversalValidationError(
            `Company creation failed: Invalid record structure. Missing ID: ${JSON.stringify(result)}`,
            ErrorType.API_ERROR,
            {
              field: 'id',
              suggestion: 'Verify API response format and record creation',
            }
          );
        }

        return result;
      } catch (error: unknown) {
        // Note: Error logging moved to centralized error handling
        const errorObj = error as Record<string, unknown>;
        // Enhance error messages with format help
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(errorObj?.message || '');
        if (errorMessage.includes('Cannot find attribute')) {
          const match = errorMessage.match(/slug\/ID "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            const enhancedError = getFormatErrorHelp(
              'companies',
              match[1],
              (error as Error).message
            );
            throw new UniversalValidationError(
              enhancedError,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        // Check for uniqueness constraint violations
        if (errorMessage.includes('uniqueness constraint')) {
          const enhancedMessage = await enhanceUniquenessError(
            resource_type,
            errorMessage,
            mappedData
          );
          throw new UniversalValidationError(
            enhancedMessage,
            ErrorType.USER_ERROR,
            {
              suggestion:
                'Try searching for existing records first or use different unique values',
            }
          );
        }
        throw error;
      }
    }

    case UniversalResourceType.LISTS: {
      try {
        const list = await createList(mappedData);
        // Convert AttioList to AttioRecord format
        return {
          id: {
            record_id: list.id.list_id,
            list_id: list.id.list_id,
          },
          values: {
            name: list.name || list.title,
            description: list.description,
            parent_object: list.object_slug || list.parent_object,
            api_slug: list.api_slug,
            workspace_id: list.workspace_id,
            workspace_member_access: list.workspace_member_access,
            created_at: list.created_at,
          },
        } as unknown as AttioRecord;
      } catch (error: unknown) {
        const errorObj = error as Record<string, unknown>;
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(errorObj?.message || '');
        if (errorMessage.includes('Cannot find attribute')) {
          const match = errorMessage.match(/slug\/ID "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            throw new UniversalValidationError(
              (error as Error).message,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        throw error;
      }
    }

    case UniversalResourceType.PEOPLE: {
      try {
        // Validate email addresses first for consistent validation with updates
        validateEmailAddresses(mappedData);

        // Normalize people data first (handle name string/object, email singular/array)
        const normalizedData =
          PeopleDataNormalizer.normalizePeopleData(mappedData);

        // Apply format conversions for common mistakes
        const correctedData = convertAttributeFormats('people', normalizedData);

        // Use mock injection for test environments (Issue #480 compatibility)
        const result = await createPersonWithMockSupport(correctedData);

        // Defensive validation: Ensure createPerson returned a valid record
        if (!result) {
          throw new UniversalValidationError(
            'Person creation failed: createPerson returned null/undefined',
            ErrorType.API_ERROR,
            {
              field: 'result',
              suggestion: 'Check API connectivity and data format',
            }
          );
        }

        if (!result.id || !result.id.record_id) {
          throw new UniversalValidationError(
            `Person creation failed: Invalid record structure. Missing ID: ${JSON.stringify(result)}`,
            ErrorType.API_ERROR,
            {
              field: 'id',
              suggestion: 'Verify API response format and record creation',
            }
          );
        }

        return result;
      } catch (error: unknown) {
        const errorObj = error as Record<string, unknown>;
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(errorObj?.message || '');
        // Enhance error messages with format help
        if (
          errorMessage.includes('invalid value') ||
          errorMessage.includes('Format Error')
        ) {
          const match = errorMessage.match(/slug "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            const enhancedError = getFormatErrorHelp(
              'people',
              match[1],
              (error as Error).message
            );
            throw new UniversalValidationError(
              enhancedError,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        // Check for uniqueness constraint violations
        if (errorMessage.includes('uniqueness constraint')) {
          const enhancedMessage = await enhanceUniquenessError(
            resource_type,
            errorMessage,
            mappedData
          );
          throw new UniversalValidationError(
            enhancedMessage,
            ErrorType.USER_ERROR,
            {
              suggestion:
                'Try searching for existing records first or use different unique values',
            }
          );
        }
        throw error;
      }
    }

    case UniversalResourceType.RECORDS:
      try {
        return await createObjectRecord('records', mappedData);
      } catch (error: unknown) {
        const errorObj = error as Record<string, unknown>;
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(errorObj?.message || '');
        // Check for uniqueness constraint violations
        if (errorMessage.includes('uniqueness constraint')) {
          const enhancedMessage = await enhanceUniquenessError(
            resource_type,
            errorMessage,
            mappedData
          );
          throw new UniversalValidationError(
            enhancedMessage,
            ErrorType.USER_ERROR,
            {
              suggestion:
                'Try searching for existing records first or use different unique values',
            }
          );
        }
        throw error;
      }

    case UniversalResourceType.DEALS: {
      // Handle deal-specific requirements with configured defaults and validation
      let dealData = { ...mappedData };

      // Validate input and log suggestions (but don't block execution)
      const validation = validateDealInput(dealData);
      // Note: Development logging moved to centralized validation utilities
      if (
        validation.suggestions.length > 0 ||
        validation.warnings.length > 0 ||
        !validation.isValid
      ) {
        // Continue anyway - the conversions might fix the issues
      }

      // Apply configured defaults with proactive stage validation
      // Note: This may make an API call for stage validation
      dealData = await applyDealDefaultsWithValidation(dealData, false);

      try {
        return await createObjectRecord('deals', dealData);
      } catch (error: unknown) {
        const errorObj = error as Record<string, unknown>;
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(errorObj?.message || '');
        // If stage still fails after validation, try with default stage
        // IMPORTANT: Skip validation in error path to prevent API calls during failures
        if (errorMessage.includes('Cannot find Status') && dealData.stage) {
          const defaults = getDealDefaults();
          // Note: Debug logging moved to centralized error handling

          // Use default stage if available, otherwise remove stage (will fail since it's required)
          if (defaults.stage) {
            // Apply defaults WITHOUT validation to avoid API calls in error path
            dealData = await applyDealDefaultsWithValidation(
              { ...record_data, stage: defaults.stage },
              true // Skip validation in error path
            );
          } else {
            delete dealData.stage;
          }

          return await createObjectRecord('deals', dealData);
        }
        throw error;
      }
    }

    case UniversalResourceType.TASKS: {
      try {
        // Issue #417: Enhanced task creation with field mapping guidance
        const content =
          mappedData.content ||
          mappedData.title ||
          mappedData.name ||
          'New task';

        // Validate required content field
        if (!content || content.trim() === '') {
          throw ErrorTemplates.TASK_FIELD_MAPPING(
            'title', // Show 'title' as the field they tried to use
            'content' // Suggest 'content' as the correct field
          );
        }

        // Handle field mappings: The field mapper transforms to API field names
        // assignees: can be array or single ID (from assignee_id mapping)
        // deadline_at: from due_date mapping
        // linked_records: from record_id mapping
        const options: Record<string, unknown> = {};

        // Only add fields that have actual values (not undefined)
        const assigneeId =
          mappedData.assignees ||
          mappedData.assignee_id ||
          mappedData.assigneeId;
        if (assigneeId) options.assigneeId = assigneeId;

        const dueDate =
          mappedData.deadline_at || mappedData.due_date || mappedData.dueDate;
        if (dueDate) options.dueDate = dueDate;

        const recordId =
          mappedData.linked_records ||
          mappedData.record_id ||
          mappedData.recordId;
        if (recordId) options.recordId = recordId;

        // Note: Debug logging moved to development utilities

        // Use mock-enabled task creation for test environments
        const createdTask = await createTaskWithMockSupport({
          content,
          title: content, // Dual field support
          ...options
        });

        // Note: Debug logging moved to development utilities

        // Debug logging before conversion
        debug(
          'universal.createTask',
          'About to convert task to record',
          {
            hasCreatedTask: !!createdTask,
            taskType: typeof createdTask,
            taskHasId: !!createdTask?.id,
            taskIdType: typeof createdTask?.id,
            taskIdStructure: createdTask?.id ? Object.keys(createdTask.id) : [],
          },
          'createTask',
          OperationType.API_CALL
        );

        // Convert AttioTask to AttioRecord using proper type conversion
        // Mock functions already return AttioRecord, so handle both cases
        const convertedRecord = shouldUseMockData() 
          ? createdTask // Already an AttioRecord from mock
          : convertTaskToRecord(createdTask as unknown as AttioTask);

        // Debug logging after conversion
        debug(
          'universal.createTask',
          'Task converted to record',
          {
            hasRecord: !!convertedRecord,
            recordType: typeof convertedRecord,
            recordHasId: !!convertedRecord?.id,
            recordIdType: typeof convertedRecord?.id,
            recordIdStructure: convertedRecord?.id
              ? Object.keys(convertedRecord.id)
              : [],
          },
          'createTask',
          OperationType.API_CALL
        );

        return convertedRecord;
      } catch (error: unknown) {
        // Log original error for debugging
        console.error('[Tasks] Original error:', error);

        // Issue #417: Enhanced task error handling with field mapping guidance
        const errorObj: Error =
          error instanceof Error ? error : new Error(String(error));
        const enhancedError = ErrorEnhancer.autoEnhance(
          errorObj,
          'tasks',
          'create-record'
        );
        throw enhancedError;
      }
    }

    default: {
      // Check if resource type can be corrected
      const resourceValidation = validateResourceType(resource_type);
      if (resourceValidation.corrected) {
        // Retry with corrected resource type
        console.log(
          `Resource type corrected from "${resource_type}" to "${resourceValidation.corrected}"`
        );
        return handleUniversalCreate({
          ...params,
          resource_type: resourceValidation.corrected,
        });
      }
      throw new UniversalValidationError(
        `Unsupported resource type: ${resource_type}`,
        ErrorType.USER_ERROR,
        {
          suggestion:
            resourceValidation.suggestion ||
            `Valid resource types are: ${getValidResourceTypes()}`,
        }
      );
    }
  }
}

/**
 * Universal update record handler with enhanced field validation
 */
export async function handleUniversalUpdate(
  params: UniversalUpdateParams
): Promise<AttioRecord> {
  const { resource_type, record_id, record_data } = params;

  // Pre-validate fields and provide helpful suggestions (less strict for updates)
  const fieldValidation = validateFields(
    resource_type,
    record_data.values || record_data
  );
  if (fieldValidation.warnings.length > 0) {
    console.log(
      'Field validation warnings:',
      fieldValidation.warnings.join('\n')
    );
  }
  if (fieldValidation.suggestions.length > 0) {
    const truncated = truncateSuggestions(fieldValidation.suggestions);
    console.log('Field suggestions:', truncated.join('\n'));
  }

  // Map field names to correct ones with collision detection
  const mappingResult = mapRecordFields(
    resource_type,
    record_data.values || record_data
  );
  if (mappingResult.errors && mappingResult.errors.length > 0) {
    throw new UniversalValidationError(
      mappingResult.errors.join(' '),
      ErrorType.USER_ERROR,
      {
        field: 'record_data',
        suggestion:
          'Please use only one field for each target. Multiple aliases mapping to the same field are not allowed.',
      }
    );
  }

  const { mapped: mappedData, warnings } = mappingResult;
  if (warnings.length > 0) {
    console.log('Field mapping applied:', warnings.join('\n'));
  }

  // TODO: Enhanced validation for Issue #413 - disabled for tasks compatibility
  // Will be re-enabled after tasks API validation is properly configured
  if (process.env.ENABLE_ENHANCED_VALIDATION === 'true') {
    const validation = await validateRecordFields(
      resource_type,
      mappedData as Record<string, unknown>,
      false
    );
    if (!validation.isValid) {
      const errorMessage = validation.error || 'Validation failed';
      throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
        suggestion: 'Please fix the validation errors and try again.',
        field: undefined,
      });
    }
  }

  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      try {
        return await updateCompany(record_id, mappedData);
      } catch (error: unknown) {
        const errorObj = error as Record<string, unknown>;
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(errorObj?.message || '');
        if (errorMessage.includes('Cannot find attribute')) {
          const match = errorMessage.match(/slug\/ID "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            throw new UniversalValidationError(
              (error as Error).message,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        throw error;
      }

    case UniversalResourceType.LISTS: {
      try {
        const list = await updateList(record_id, mappedData);
        // Convert AttioList to AttioRecord format
        return {
          id: {
            record_id: list.id.list_id,
            list_id: list.id.list_id,
          },
          values: {
            name: list.name || list.title,
            description: list.description,
            parent_object: list.object_slug || list.parent_object,
            api_slug: list.api_slug,
            workspace_id: list.workspace_id,
            workspace_member_access: list.workspace_member_access,
            created_at: list.created_at,
          },
        } as unknown as AttioRecord;
      } catch (error: unknown) {
        const errorObj = error as Record<string, unknown>;
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(errorObj?.message || '');
        if (errorMessage.includes('Cannot find attribute')) {
          const match = errorMessage.match(/slug\/ID "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            throw new UniversalValidationError(
              (error as Error).message,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        throw error;
      }
    }

    case UniversalResourceType.PEOPLE:
      try {
        // Validate email addresses for consistency with create operations
        validateEmailAddresses(mappedData);

        return await updatePerson(record_id, mappedData);
      } catch (error: unknown) {
        const errorObj = error as Record<string, unknown>;
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(errorObj?.message || '');
        if (errorMessage.includes('Cannot find attribute')) {
          const match = errorMessage.match(/slug\/ID "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            throw new UniversalValidationError(
              (error as Error).message,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        throw error;
      }

    case UniversalResourceType.RECORDS:
      return updateObjectRecord('records', record_id, mappedData);

    case UniversalResourceType.DEALS: {
      // Note: Updates are less likely to fail, but we still validate stages proactively
      const updatedDealData = await applyDealDefaultsWithValidation(
        mappedData,
        false
      );
      return updateObjectRecord('deals', record_id, updatedDealData);
    }

    case UniversalResourceType.TASKS: {
      // Transform mapped fields for task update
      // The field mapper has already transformed field names to API names
      // Now we need to adapt them for the updateTask function
      const taskUpdateData: Record<string, unknown> = {};

      // Handle content field if present
      if (mappedData.content !== undefined) {
        taskUpdateData.content = mappedData.content;
      }

      // Handle status field
      if (mappedData.is_completed !== undefined) {
        taskUpdateData.status = mappedData.is_completed
          ? 'completed'
          : 'pending';
      } else if (mappedData.status !== undefined) {
        taskUpdateData.status = mappedData.status;
      }

      // Handle assignee field
      if (mappedData.assignees !== undefined) {
        taskUpdateData.assigneeId = mappedData.assignees;
      } else if (mappedData.assignee_id !== undefined) {
        taskUpdateData.assigneeId = mappedData.assignee_id;
      } else if (mappedData.assigneeId !== undefined) {
        taskUpdateData.assigneeId = mappedData.assigneeId;
      }

      // Handle due date field
      if (mappedData.deadline_at !== undefined) {
        taskUpdateData.dueDate = mappedData.deadline_at;
      } else if (mappedData.due_date !== undefined) {
        taskUpdateData.dueDate = mappedData.due_date;
      } else if (mappedData.dueDate !== undefined) {
        taskUpdateData.dueDate = mappedData.dueDate;
      }

      // Handle linked records field
      if (mappedData.linked_records !== undefined) {
        // Extract record IDs from linked_records array structure
        if (Array.isArray(mappedData.linked_records)) {
          taskUpdateData.recordIds = mappedData.linked_records.map(
            (link: Record<string, unknown>) => link.record_id || link.id || link
          );
        } else {
          taskUpdateData.recordIds = [mappedData.linked_records];
        }
      } else if (mappedData.record_id !== undefined) {
        taskUpdateData.recordIds = [mappedData.record_id];
      }

      // Use mock-enabled task update for test environments
      const updatedTask = await updateTaskWithMockSupport(record_id, taskUpdateData);
      // Convert AttioTask to AttioRecord using proper type conversion
      // Mock functions already return AttioRecord, so handle both cases
      return shouldUseMockData() 
        ? updatedTask // Already an AttioRecord from mock
        : convertTaskToRecord(updatedTask as unknown as AttioTask);
    }

    default: {
      // Check if resource type can be corrected
      const resourceValidation = validateResourceType(resource_type);
      if (resourceValidation.corrected) {
        // Retry with corrected resource type
        console.log(
          `Resource type corrected from "${resource_type}" to "${resourceValidation.corrected}"`
        );
        return handleUniversalUpdate({
          ...params,
          resource_type: resourceValidation.corrected,
        });
      }
      throw new UniversalValidationError(
        `Unsupported resource type: ${resource_type}`,
        ErrorType.USER_ERROR,
        {
          suggestion:
            resourceValidation.suggestion ||
            `Valid resource types are: ${getValidResourceTypes()}`,
        }
      );
    }
  }
}

/**
 * Universal delete record handler
 */
export async function handleUniversalDelete(
  params: UniversalDeleteParams
): Promise<{ success: boolean; record_id: string }> {
  const { resource_type, record_id } = params;

  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      await deleteCompany(record_id);
      return { success: true, record_id };

    case UniversalResourceType.PEOPLE:
      await deletePerson(record_id);
      return { success: true, record_id };

    case UniversalResourceType.LISTS:
      await deleteList(record_id);
      return { success: true, record_id };

    case UniversalResourceType.RECORDS:
      await deleteObjectRecord('records', record_id);
      return { success: true, record_id };

    case UniversalResourceType.DEALS:
      await deleteObjectRecord('deals', record_id);
      return { success: true, record_id };

    case UniversalResourceType.TASKS:
      // Add mock support for task deletion in test environments
      if (shouldUseMockData()) {
        // Validate task ID before proceeding with deletion
        if (!isValidId(record_id)) {
          throw new Error(`Task not found: ${record_id}`);
        }
        
        if (
          process.env.NODE_ENV === 'development' ||
          process.env.VERBOSE_TESTS === 'true'
        ) {
          console.log('[MockInjection] Using mock data for task deletion');
        }
        
        // Return mock success response
        return { success: true, record_id };
      }
      
      await deleteTask(record_id);
      return { success: true, record_id };

    default:
      throw new Error(`Unsupported resource type for delete: ${resource_type}`);
  }
}

/**
 * Universal get attributes handler
 */
export async function handleUniversalGetAttributes(
  params: UniversalAttributesParams
): Promise<Record<string, unknown>> {
  const { resource_type, record_id, categories } = params;

  let result: Record<string, unknown>;

  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      if (record_id) {
        result = await getCompanyAttributes(record_id);
      } else {
        // Return schema-level attributes if no record_id provided
        result = await discoverCompanyAttributes();
      }
      break;

    case UniversalResourceType.PEOPLE:
      if (record_id) {
        result = await getAttributesForRecord(resource_type, record_id);
      } else {
        // Return schema-level attributes if no record_id provided
        result = await discoverAttributesForResourceType(resource_type);
      }
      break;

    case UniversalResourceType.LISTS:
      result = await getListAttributes();
      break;

    case UniversalResourceType.RECORDS:
      if (record_id) {
        result = await getAttributesForRecord(resource_type, record_id);
      } else {
        result = await discoverAttributesForResourceType(resource_type);
      }
      break;

    case UniversalResourceType.DEALS:
      if (record_id) {
        result = await getAttributesForRecord(resource_type, record_id);
      } else {
        result = await discoverAttributesForResourceType(resource_type);
      }
      break;

    case UniversalResourceType.TASKS:
      if (record_id) {
        result = await getAttributesForRecord(resource_type, record_id);
      } else {
        result = await discoverAttributesForResourceType(resource_type);
      }
      break;

    default:
      throw new Error(
        `Unsupported resource type for get attributes: ${resource_type}`
      );
  }

  // Apply category filtering if categories parameter was provided
  return filterAttributesByCategory(result, categories);
}

/**
 * Universal discover attributes handler
 */
export async function handleUniversalDiscoverAttributes(
  resource_type: UniversalResourceType
): Promise<Record<string, unknown>> {
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return discoverCompanyAttributes();

    case UniversalResourceType.PEOPLE:
      return discoverAttributesForResourceType(resource_type);

    case UniversalResourceType.LISTS:
      return getListAttributes();

    case UniversalResourceType.RECORDS:
      return discoverAttributesForResourceType(resource_type);

    case UniversalResourceType.DEALS:
      return discoverAttributesForResourceType(resource_type);

    case UniversalResourceType.TASKS:
      return discoverAttributesForResourceType(resource_type);

    default:
      throw new Error(
        `Unsupported resource type for discover attributes: ${resource_type}`
      );
  }
}

/**
 * Universal get detailed info handler
 */
export async function handleUniversalGetDetailedInfo(
  params: UniversalDetailedInfoParams
): Promise<Record<string, unknown>> {
  const { resource_type, record_id, info_type } = params;

  // For now, we'll return the full record for non-company resource types
  // TODO: Implement specialized detailed info methods for other resource types
  if (resource_type !== UniversalResourceType.COMPANIES) {
    // Return the full record as a fallback for other resource types
    switch (resource_type) {
      case UniversalResourceType.PEOPLE:
        return getPersonDetails(record_id);
      case UniversalResourceType.LISTS: {
        const list = await getListDetails(record_id);
        // Convert AttioList to AttioRecord format
        return {
          id: {
            record_id: list.id.list_id,
            list_id: list.id.list_id,
          },
          values: {
            name: list.name || list.title,
            description: list.description,
            parent_object: list.object_slug || list.parent_object,
            api_slug: list.api_slug,
            workspace_id: list.workspace_id,
            workspace_member_access: list.workspace_member_access,
            created_at: list.created_at,
          },
        } as unknown as AttioRecord;
      }
      case UniversalResourceType.DEALS:
        return getObjectRecord('deals', record_id);
      case UniversalResourceType.TASKS:
        return getTask(record_id);
      case UniversalResourceType.RECORDS:
        return getObjectRecord('records', record_id);
      default:
        throw new Error(
          `Unsupported resource type for detailed info: ${resource_type}`
        );
    }
  }

  // Company-specific detailed info
  switch (info_type) {
    case DetailedInfoType.BASIC:
      return getCompanyBasicInfo(record_id);

    case DetailedInfoType.CONTACT:
      return getCompanyContactInfo(record_id);

    case DetailedInfoType.BUSINESS:
      return getCompanyBusinessInfo(record_id);

    case DetailedInfoType.SOCIAL:
      return getCompanySocialInfo(record_id);

    case DetailedInfoType.CUSTOM:
      // Custom fields would be implemented here
      throw new Error('Custom detailed info not yet implemented');

    default:
      throw new Error(`Unsupported info type: ${info_type}`);
  }
}

/**
 * Utility function to format resource type for display
 */
export function formatResourceType(
  resourceType: UniversalResourceType
): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return 'company';
    case UniversalResourceType.PEOPLE:
      return 'person';
    case UniversalResourceType.RECORDS:
      return 'record';
    case UniversalResourceType.DEALS:
      return 'deal';
    case UniversalResourceType.TASKS:
      return 'task';
    default:
      return resourceType;
  }
}

/**
 * Utility function to get singular form of resource type
 */
export function getSingularResourceType(
  resourceType: UniversalResourceType
): string {
  return formatResourceType(resourceType);
}

/**
 * Utility function to validate resource type
 */
export function isValidResourceType(
  resourceType: string
): resourceType is UniversalResourceType {
  return Object.values(UniversalResourceType).includes(
    resourceType as UniversalResourceType
  );
}

/**
 * Validate email addresses in record data for consistent validation across create/update
 */
function validateEmailAddresses(recordData: Record<string, unknown>): void {
  if (!recordData || typeof recordData !== 'object') return;

  // Handle various email field formats
  const emailFields = ['email_addresses', 'email', 'emails', 'emailAddress'];

  for (const field of emailFields) {
    if (field in recordData && recordData[field]) {
      const emails = Array.isArray(recordData[field])
        ? recordData[field]
        : [recordData[field]];

      for (const emailItem of emails) {
        let emailAddress: string;

        // Handle different email formats
        if (typeof emailItem === 'string') {
          emailAddress = emailItem;
        } else if (typeof emailItem === 'object' && emailItem.email_address) {
          emailAddress = emailItem.email_address;
        } else if (typeof emailItem === 'object' && emailItem.email) {
          emailAddress = emailItem.email;
        } else {
          continue; // Skip invalid email formats
        }

        // Validate email format using the same function as PersonValidator
        if (!isValidEmail(emailAddress)) {
          throw new UniversalValidationError(
            `Invalid email format: "${emailAddress}". Please provide a valid email address (e.g., user@example.com)`,
            ErrorType.USER_ERROR,
            {
              field: field,
              suggestion:
                'Ensure email addresses are in the format: user@domain.com',
            }
          );
        }
      }
    }
  }
}

/**
 * Enhanced error handling utility for universal operations
 */
export function createUniversalError(
  operation: string,
  resourceType: string,
  originalError: unknown
): Error {
  // If it's already a UniversalValidationError or EnhancedApiError, pass it through
  if (
    originalError instanceof UniversalValidationError ||
    originalError instanceof EnhancedApiError
  ) {
    return originalError;
  }

  // Safely extract the error message
  let errorMessage = 'Unknown error';
  if (originalError instanceof Error) {
    errorMessage = originalError.message;
  } else if (
    typeof originalError === 'object' &&
    originalError !== null &&
    'message' in originalError
  ) {
    errorMessage = String(originalError.message);
  } else if (typeof originalError === 'string') {
    errorMessage = originalError;
  }

  // Classify the error type based on the original error
  let errorType = ErrorType.SYSTEM_ERROR;
  const errorObj = originalError as Record<string, unknown>;

  if (
    errorMessage.includes('not found') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    (errorObj && typeof errorObj.status === 'number' && errorObj.status === 400)
  ) {
    errorType = ErrorType.USER_ERROR;
  } else if (
    (errorObj &&
      typeof errorObj.status === 'number' &&
      errorObj.status >= 500) ||
    errorMessage.includes('network') ||
    errorMessage.includes('timeout')
  ) {
    errorType = ErrorType.API_ERROR;
  }

  const message = `Universal ${operation} failed for resource type ${resourceType}: ${errorMessage}`;

  return new UniversalValidationError(message, errorType, {
    suggestion: getOperationSuggestion(operation, resourceType, originalError),
    cause: originalError as Error,
  });
}

/**
 * Get helpful suggestions based on the operation and error
 */
function getOperationSuggestion(
  operation: string,
  resourceType: string,
  error: unknown
): string | undefined {
  // Safely extract error message
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message.toLowerCase();
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    errorMessage = String(error.message).toLowerCase();
  } else if (typeof error === 'string') {
    errorMessage = error.toLowerCase();
  }

  // First check if this is an invalid resource type
  const resourceValidation = validateResourceType(resourceType);
  if (!resourceValidation.valid && resourceValidation.suggestion) {
    return resourceValidation.suggestion;
  }

  // Date-related error suggestions
  if (
    errorMessage.includes('unable to parse date') ||
    errorMessage.includes('invalid date')
  ) {
    return 'Try using relative dates like "last 7 days", "this month", "yesterday" or ISO format (YYYY-MM-DD)';
  }

  if (
    errorMessage.includes('date range') ||
    errorMessage.includes('daterange')
  ) {
    return 'Date ranges support formats like: "last 30 days", "this week", "last month", or ISO dates (2024-01-01)';
  }

  // API limitation suggestions
  if (
    errorMessage.includes('filter') &&
    errorMessage.includes('not supported')
  ) {
    return 'This filter combination is not supported by the Attio API. Try using a simpler filter or fetching all records and filtering locally.';
  }

  if (errorMessage.includes('batch') && errorMessage.includes('limit')) {
    return 'Batch operations are limited to 100 items at a time. Please split your request into smaller batches.';
  }

  if (errorMessage.includes('rate limit')) {
    return 'API rate limit reached. Please wait a moment before retrying or reduce the frequency of requests.';
  }

  // Deal-specific suggestions
  if (resourceType === 'deals') {
    if (
      errorMessage.includes('cannot find attribute with slug/id "company_id"')
    ) {
      return 'Use "associated_company" instead of "company_id" for linking deals to companies';
    }

    if (errorMessage.includes('cannot find attribute with slug/id "company"')) {
      return 'Use "associated_company" instead of "company" for linking deals to companies';
    }

    if (errorMessage.includes('cannot find status')) {
      return 'Invalid deal stage. Check available stages with discover-attributes tool or use the default stage';
    }

    if (
      errorMessage.includes(
        'invalid value was passed to attribute with slug "value"'
      )
    ) {
      return 'Deal value should be a simple number (e.g., 9780). Attio automatically handles currency formatting.';
    }

    if (errorMessage.includes('deal_stage')) {
      return 'Use "stage" instead of "deal_stage" for deal status';
    }

    if (errorMessage.includes('deal_value')) {
      return 'Use "value" instead of "deal_value" for deal amount';
    }

    if (errorMessage.includes('deal_name')) {
      return 'Use "name" instead of "deal_name" for deal title';
    }

    if (errorMessage.includes('description')) {
      return 'Deals do not have a "description" field. Available fields: name, stage, value, owner, associated_company, associated_people';
    }

    if (
      errorMessage.includes('expected_close_date') ||
      errorMessage.includes('close_date')
    ) {
      return 'Deals do not have a built-in close date field. Consider using a custom field or tracking this separately';
    }

    if (
      errorMessage.includes('probability') ||
      errorMessage.includes('likelihood')
    ) {
      return 'Deals do not have a built-in probability field. Consider using custom fields or tracking probability in stage names';
    }

    if (
      errorMessage.includes('source') ||
      errorMessage.includes('lead_source')
    ) {
      return 'Deals do not have a built-in source field. Consider using custom fields to track deal sources';
    }

    if (
      errorMessage.includes('currency') &&
      !errorMessage.includes('currency_code')
    ) {
      return 'Currency is set automatically based on workspace settings. Just provide a numeric value for the deal amount';
    }

    if (
      errorMessage.includes('contact') ||
      errorMessage.includes('primary_contact')
    ) {
      return 'Use "associated_people" to link contacts/people to deals';
    }

    if (errorMessage.includes('notes') || errorMessage.includes('comments')) {
      return 'Deal notes should be created separately using the notes API after the deal is created';
    }

    if (errorMessage.includes('tags') || errorMessage.includes('labels')) {
      return 'Deals do not have a built-in tags field. Consider using custom fields or categories';
    }

    if (errorMessage.includes('type') || errorMessage.includes('deal_type')) {
      return 'Deal types are not built-in. Use stages or custom fields to categorize deals';
    }

    // Generic unknown field error
    if (errorMessage.includes('cannot find attribute')) {
      return 'Unknown deal field. Core fields: name, stage, value, owner, associated_company, associated_people. Use discover-attributes tool to see all available fields including custom ones';
    }
  }

  // Handle "Cannot find attribute" errors with field suggestions
  if (errorMessage.includes('cannot find attribute')) {
    const errorMessageForMatch =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as Record<string, unknown>).message)
          : '';
    const match = errorMessageForMatch.match(
      /cannot find attribute with slug\/id["\s]*([^"]*)/i
    );
    if (match && match[1]) {
      const fieldName = match[1].replace(/["]/g, '').trim();
      // Try to get field suggestions for the resource type
      if (
        Object.values(UniversalResourceType).includes(
          resourceType as UniversalResourceType
        )
      ) {
        return getFieldSuggestions(
          resourceType as UniversalResourceType,
          fieldName
        );
      }
    }
  }

  // General suggestions
  if (errorMessage.includes('not found')) {
    return `Verify that the ${resourceType} record exists and you have access to it`;
  }

  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('forbidden')
  ) {
    return 'Check your API permissions and authentication credentials';
  }

  if (errorMessage.includes('rate limit')) {
    return 'Wait a moment before retrying - you may be making requests too quickly';
  }

  if (operation === 'create' && errorMessage.includes('duplicate')) {
    return `A ${resourceType} record with these details may already exist. Try searching first`;
  }

  if (errorMessage.includes('uniqueness constraint')) {
    return 'A record with these unique values already exists. Try searching for the existing record or use different values.';
  }

  // Check for remaining "cannot find attribute" errors not caught above
  if (errorMessage.includes('cannot find attribute')) {
    const attrMatch = errorMessage.match(
      /cannot find attribute with slug\/id["\s]*([^"]*)/
    );
    if (attrMatch && attrMatch[1]) {
      // Provide resource-specific field suggestions
      if (resourceType === 'deals') {
        return `Unknown field "${attrMatch[1]}". Available deal fields: name, stage, value, owner, associated_company, associated_people. Use discover-attributes for full list`;
      }
      return `Unknown field "${attrMatch[1]}". Use discover-attributes tool to see available fields for ${resourceType}`;
    }
  }

  return undefined;
}
