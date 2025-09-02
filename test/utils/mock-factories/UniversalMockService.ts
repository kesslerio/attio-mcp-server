/**
 * Universal Mock Service
 *
 * Centralized service for generating mock data across all resource types
 * used by universal handlers in E2E and performance testing environments.
 *
 * This service consolidates the mock generation functionality previously
 * scattered throughout production code, providing clean separation between
 * test utilities and production logic.
 *
 * Key Features:
 * - Uses existing mock factories for consistency
 * - Maintains Issue #480 compatibility patterns
 * - Supports all universal resource types
 * - Provides AttioRecord format conversion
 * - Environment-aware mock injection
 */

import type { AttioRecord } from '../../../src/types/attio.js';
import { CompanyMockFactory } from './CompanyMockFactory.js';
import { PersonMockFactory } from './PersonMockFactory.js';
import { TaskMockFactory } from './TaskMockFactory.js';
import { ListMockFactory } from './ListMockFactory.js';
import { TestEnvironment } from './test-environment.js';

/**
 * Universal mock service for consistent mock data generation
 * across all resource types in the universal handlers system.
 */
export class UniversalMockService {
  /**
   * Environment detection function for mock injection
   * This matches the logic from shared-handlers.ts shouldUseMockData()
   */
  private static shouldUseMockData(): boolean {
    return (
      process.env.E2E_MODE === 'true' ||
      process.env.USE_MOCK_DATA === 'true' ||
      process.env.OFFLINE_MODE === 'true' ||
      process.env.PERFORMANCE_TEST === 'true'
    );
  }

  /**
   * Creates a company record with mock support
   *
   * @param companyData - Company data to create
   * @returns AttioRecord in universal format or real API result
   */
  static async createCompany(
    companyData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!this.shouldUseMockData()) {
      // Dynamic import to avoid circular dependencies in production
      const { createCompany } = await import(
        '../../../src/objects/companies/index.js'
      );
      return await createCompany(companyData as any);
    }

    TestEnvironment.log('[UniversalMockService] Creating mock company', {
      name: companyData.name,
      industry: companyData.industry,
    });

    // Use the existing CompanyMockFactory but convert to AttioRecord format
    const mockCompany = CompanyMockFactory.create({
      name: companyData.name as string,
      domains: companyData.domains as string[],
      industry: companyData.industry as string,
      description: companyData.description as string,
      ...companyData,
    });

    // Convert to AttioRecord format expected by universal handlers
    return {
      id: {
        record_id: (mockCompany.id as any).record_id,
        object_id: 'companies',
        workspace_id:
          ((mockCompany.id as any).workspace_id as string) || 'mock-workspace-id',
      },
      values: {
        name: [
          {
            value:
              (mockCompany.values as any).name ||
              `Mock Company ${String((mockCompany.id as any).record_id).slice(-4)}`,
          },
        ],
        domains: (mockCompany.values as any).domains
          ? Array.isArray(mockCompany.values.domains)
            ? (mockCompany.values as any).domains.map((d: string) => ({ value: d }))
            : [{ value: (mockCompany.values as any).domains }]
          : [{ value: `${String((mockCompany.id as any).record_id)}.example.com` }],
        industry: [{ value: (mockCompany.values as any).industry || 'Technology' }],
        description: [
          {
            value:
              (mockCompany.values as any).description ||
              `Mock company for testing - ${String((mockCompany.id as any).record_id)}`,
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
      created_at: mockCompany.created_at,
      updated_at: mockCompany.updated_at,
    };
  }

  /**
   * Creates a person record with mock support
   *
   * @param personData - Person data to create
   * @returns AttioRecord in universal format or real API result
   */
  static async createPerson(
    personData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!this.shouldUseMockData()) {
      // Dynamic import to avoid circular dependencies in production
      const { createPerson } = await import(
        '../../../src/objects/people/index.js'
      );
      return await createPerson(personData as any);
    }

    TestEnvironment.log('[UniversalMockService] Creating mock person', {
      name: personData.name,
      email_addresses: personData.email_addresses,
    });

    // Use the existing PersonMockFactory but convert to AttioRecord format
    const mockPerson = PersonMockFactory.create({
      name: personData.name as string,
      email_addresses: personData.email_addresses as string[],
      ...personData,
    });

    // Convert to AttioRecord format expected by universal handlers
    return {
      id: {
        record_id: (mockPerson.id as any).record_id,
        object_id: 'people',
        workspace_id:
          ((mockPerson.id as any).workspace_id as string) || 'mock-workspace-id',
      },
      values: {
        name: [
          {
            value:
              (mockPerson.values as any).name ||
              `Mock Person ${String((mockPerson.id as any).record_id).slice(-4)}`,
          },
        ],
        email_addresses: Array.isArray(personData.email_addresses)
          ? personData.email_addresses.map((email) => ({ value: email }))
          : [{ value: `${mockPerson.id.person_id}@example.com` }],
        // Adjust above default to use record_id if present
        // (keep existing structure but ensure deterministic value)
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
      created_at: mockPerson.created_at,
      updated_at: mockPerson.updated_at,
    };
  }

  /**
   * Creates a task record with mock support
   * Maintains Issue #480 compatibility with dual field support
   *
   * @param taskData - Task data to create
   * @returns AttioRecord in universal format or real API result
   */
  static async createTask(
    taskData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!this.shouldUseMockData()) {
      // Dynamic import to avoid circular dependencies in production
      try {
        const { createTask } = await import('../../../src/objects/tasks.js');
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

    const taskContent =
      (taskData.content as string) ||
      (taskData.title as string) ||
      `Mock Test Task`;

    TestEnvironment.log('[UniversalMockService] Creating mock task', {
      content: taskContent,
      status: taskData.status,
      assigneeId: taskData.assigneeId,
    });

    // Use the existing TaskMockFactory
    const mockTask = TaskMockFactory.create({
      content: taskContent,
      title: taskContent, // Issue #480: Dual field support
      status: taskData.status as string,
      due_date: taskData.due_date as string,
      assignee_id: taskData.assigneeId as string,
      record_id: taskData.recordId as string,
    });

    // Convert to AttioRecord format with Issue #480 compatibility
    const attioRecord: AttioRecord = {
      id: {
        record_id: mockTask.id.record_id,
        task_id: mockTask.id.task_id, // Issue #480: Preserve task_id
        object_id: 'tasks',
        workspace_id: mockTask.id.workspace_id,
      },
      values: {
        content: [{ value: taskContent }],
        title: [{ value: taskContent }], // Issue #480: Dual field support
        status: [{ value: mockTask.status }],
        due_date: mockTask.due_date
          ? [{ value: mockTask.due_date }]
          : undefined,
        assignee: mockTask.assignee
          ? [{ value: mockTask.assignee.id }]
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
      created_at: mockTask.created_at,
      updated_at: mockTask.updated_at,
    };

    // Add flat field compatibility for E2E tests (Issue #480)
    const flatFields = {
      content: taskContent,
      title: taskContent,
      status: mockTask.status,
      due_date: mockTask.due_date,
      assignee_id: taskData.assigneeId as string,
      priority: (taskData.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (taskData.assigneeId && mockTask.assignee) {
      (flatFields as any).assignee = {
        id: taskData.assigneeId as string,
        type: 'person',
      };
    }

    return { ...attioRecord, ...flatFields };
  }

  /**
   * Updates a task record with mock support
   *
   * @param taskId - Task ID to update
   * @param updateData - Update data
   * @returns AttioRecord in universal format or real API result
   */
  static async updateTask(
    taskId: string,
    updateData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!this.shouldUseMockData()) {
      // Dynamic import to avoid circular dependencies in production
      try {
        const { updateTask } = await import('../../../src/objects/tasks.js');
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
    const { isValidId } = await import('../../../src/utils/validation.js');
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

    TestEnvironment.log('[UniversalMockService] Updating mock task', {
      taskId,
      content: taskContent,
      status: updateData.status,
    });

    // Create an updated task using the TaskMockFactory
    const mockTask = TaskMockFactory.create({
      content: taskContent,
      title: taskContent, // Issue #480: Dual field support
      status: (updateData.status as string) || 'updated',
      due_date: updateData.due_date as string,
      assignee_id: updateData.assigneeId as string,
    });

    // Update the ID to match the original task ID
    mockTask.id.record_id = taskId;
    mockTask.id.task_id = taskId;

    // Convert to AttioRecord format with Issue #480 compatibility
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
        status: [{ value: mockTask.status }],
        due_date: mockTask.due_date
          ? [{ value: mockTask.due_date }]
          : undefined,
        assignee: mockTask.assignee
          ? [{ value: mockTask.assignee.id }]
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
    };

    // Add flat field compatibility for E2E tests (Issue #480)
    const flatFields = {
      content: taskContent,
      title: taskContent,
      status: mockTask.status,
      due_date: mockTask.due_date,
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
   * This provides a public interface for the environment detection logic
   */
  static isUsingMockData(): boolean {
    return this.shouldUseMockData();
  }
}

/**
 * Convenience exports for direct usage
 */
export const createMockCompany = UniversalMockService.createCompany;
export const createMockPerson = UniversalMockService.createPerson;
export const createMockTask = UniversalMockService.createTask;
export const updateMockTask = UniversalMockService.updateTask;

export default UniversalMockService;
