/**
 * Production Mock Service
 *
 * Handles mock data generation for testing environments without importing test files.
 * This service contains the minimum viable mock logic needed by production handlers
 * while avoiding production-test coupling violations.
 *
 * Key Design Principles:
 * - No imports from test/ directories
 * - Environment-driven behavior
 * - Fallback to real API when not in mock mode
 * - Issue #480 compatibility maintained
 */

import type { AttioRecord } from '../types/attio.js';

/**
 * Environment detection for mock injection
 */
function shouldUseMockData(): boolean {
  return (
    process.env.E2E_MODE === 'true' ||
    process.env.USE_MOCK_DATA === 'true' ||
    process.env.OFFLINE_MODE === 'true' ||
    process.env.PERFORMANCE_TEST === 'true'
  );
}

/**
 * Production-safe mock service that doesn't import test files
 */
export class MockService {
  /**
   * Creates a company record with mock support
   */
  static async createCompany(
    companyData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!shouldUseMockData()) {
      const { createCompany } = await import('../objects/companies/index.js');
      return await createCompany(companyData as any);
    }

    // Generate valid UUID format for mock IDs (exactly 36 chars)
    const timestamp = Date.now().toString().slice(-12);
    const mockId = `12345678-1234-4000-8000-${timestamp}`;

    return {
      id: {
        record_id: mockId,
        object_id: 'companies',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name: [
          {
            value:
              (companyData.name as string) ||
              `Mock Company ${mockId.slice(-4)}`,
          },
        ],
        domains: Array.isArray(companyData.domains)
          ? (companyData.domains as string[]).map((d) => ({ value: d }))
          : [{ value: `${mockId}.example.com` }],
        industry: [{ value: (companyData.industry as string) || 'Technology' }],
        description: [
          {
            value:
              (companyData.description as string) ||
              `Mock company for testing - ${mockId}`,
          },
        ],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Creates a person record with mock support
   */
  static async createPerson(
    personData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!shouldUseMockData()) {
      const { createPerson } = await import('../objects/people/index.js');
      return await createPerson(personData as any);
    }

    // Generate valid UUID format for mock IDs (exactly 36 chars)
    const timestamp = Date.now().toString().slice(-12);
    const mockId = `12345678-1234-4000-9000-${timestamp}`;

    return {
      id: {
        record_id: mockId,
        object_id: 'people',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name: [
          {
            value:
              (personData.name as string) || `Mock Person ${mockId.slice(-4)}`,
          },
        ],
        email_addresses: Array.isArray(personData.email_addresses)
          ? (personData.email_addresses as string[]).map((email) => ({
              value: email,
            }))
          : [{ value: `${mockId}@example.com` }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Creates a task record with mock support
   * Maintains Issue #480 compatibility with dual field support
   */
  static async createTask(
    taskData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!shouldUseMockData()) {
      try {
        const { createTask } = await import('../objects/tasks.js');
        return (await createTask(taskData.content as string, {
          assigneeId: taskData.assigneeId as string,
          dueDate: taskData.dueDate as string,
          recordId: taskData.recordId as string,
        })) as unknown as AttioRecord;
      } catch (error) {
        throw new Error(
          `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    const timestamp = Date.now().toString().slice(-12);
    const mockId = `12345678-1234-4000-a000-${timestamp}`;
    const taskContent =
      (taskData.content as string) ||
      (taskData.title as string) ||
      `Mock Test Task`;

    // Issue #480 compatible mock task
    const attioRecord: AttioRecord = {
      id: {
        record_id: mockId,
        task_id: mockId, // Issue #480: Preserve task_id
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        content: [{ value: taskContent }],
        title: [{ value: taskContent }], // Issue #480: Dual field support
        status: [{ value: (taskData.status as string) || 'pending' }],
        due_date: taskData.due_date
          ? [{ value: taskData.due_date as string }]
          : undefined,
        assignee: taskData.assigneeId
          ? [{ value: taskData.assigneeId as string }]
          : undefined,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add flat field compatibility for E2E tests (Issue #480)
    const flatFields = {
      content: taskContent,
      title: taskContent,
      status: (taskData.status as string) || 'pending',
      due_date: taskData.due_date as string,
      assignee_id: taskData.assigneeId as string,
      priority: (taskData.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (taskData.assigneeId) {
      (flatFields as any).assignee = {
        id: taskData.assigneeId as string,
        type: 'person',
      };
    }

    return { ...attioRecord, ...flatFields };
  }

  /**
   * Updates a task record with mock support
   */
  static async updateTask(
    taskId: string,
    updateData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!shouldUseMockData()) {
      try {
        const { updateTask } = await import('../objects/tasks.js');
        return (await updateTask(taskId, {
          content: updateData.content as string,
          status: updateData.status as string,
          assigneeId: updateData.assigneeId as string,
          dueDate: updateData.dueDate as string,
          recordIds: updateData.recordIds as string[],
        })) as unknown as AttioRecord;
      } catch (error) {
        throw new Error(
          `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Validation for mock environment
    const { isValidId } = await import('../utils/validation.js');
    if (!isValidId(taskId)) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (updateData.assigneeId && !isValidId(updateData.assigneeId as string)) {
      throw new Error(`Invalid assignee ID: ${updateData.assigneeId}`);
    }

    if (updateData.recordIds && Array.isArray(updateData.recordIds)) {
      for (const recordId of updateData.recordIds) {
        if (!isValidId(recordId as string)) {
          throw new Error(`Record not found: ${recordId}`);
        }
      }
    }

    const taskContent =
      (updateData.content as string) ||
      (updateData.title as string) ||
      `Updated Mock Test Task ${taskId.slice(-4)}`;

    // Issue #480 compatible updated mock task
    const attioRecord: AttioRecord = {
      id: {
        record_id: taskId,
        task_id: taskId, // Issue #480: Preserve task_id
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        content: [{ value: taskContent }],
        title: [{ value: taskContent }], // Issue #480: Dual field support
        status: [{ value: (updateData.status as string) || 'updated' }],
        due_date: updateData.due_date
          ? [{ value: updateData.due_date as string }]
          : undefined,
        assignee: updateData.assigneeId
          ? [{ value: updateData.assigneeId as string }]
          : undefined,
      },
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      updated_at: new Date().toISOString(),
    };

    // Add flat field compatibility for E2E tests (Issue #480)
    const flatFields = {
      content: taskContent,
      title: taskContent,
      status: (updateData.status as string) || 'updated',
      due_date: updateData.due_date as string,
      assignee_id: updateData.assigneeId as string,
      priority: (updateData.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (updateData.assigneeId) {
      (flatFields as any).assignee = {
        id: updateData.assigneeId as string,
        type: 'person',
      };
    }

    return { ...attioRecord, ...flatFields };
  }

  /**
   * Checks if mock data should be used based on environment
   */
  static isUsingMockData(): boolean {
    return shouldUseMockData();
  }
}

export default MockService;
