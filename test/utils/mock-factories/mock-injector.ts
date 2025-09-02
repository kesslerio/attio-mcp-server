/**
 * Mock Data Injection System
 *
 * Provides clean injection points for mock data into production code paths
 * when running in test environments. This replaces the scattered test
 * environment checks and hardcoded mock data previously embedded in
 * production handlers.
 *
 * Key Features:
 * - Clean separation between test and production code
 * - Type-safe mock data injection
 * - Compatibility with existing API patterns
 * - Support for all resource types (tasks, companies, people, lists)
 * - Issue #480 compatibility for E2E tests
 */

import type {
  AttioTask,
  AttioRecord,
  AttioList,
} from '../../../src/types/attio.js';
import {
  TaskMockFactory,
  CompanyMockFactory,
  PersonMockFactory,
  ListMockFactory,
} from './index.js';
import { TestEnvironment, shouldUseMockData } from './test-environment.js';
import { UUIDMockGenerator } from './uuid-mock-generator.js';

// In-memory storage for created mock records (persists during test session)
const mockStorage = new Map<string, any>();

// Helper to generate persistent mock IDs in UUID format
// Addresses PR #483: Use UUID-compliant IDs for validation compatibility
function generateMockId(prefix: string = 'mock'): string {
  switch (prefix) {
    case 'company':
      return UUIDMockGenerator.generateCompanyUUID();
    case 'person':
      return UUIDMockGenerator.generatePersonUUID();
    case 'task':
      return UUIDMockGenerator.generateTaskUUID();
    case 'list':
      return UUIDMockGenerator.generateListUUID();
    default:
      return UUIDMockGenerator.generateDeterministicUUID(prefix);
  }
}

// Helper to store and retrieve mock objects
function storeMock(id: string, object: any): void {
  mockStorage.set(id, object);
}

function retrieveMock(id: string): any | undefined {
  return mockStorage.get(id);
}

function getAllMocksByType(type: string): any[] {
  const results: any[] = [];
  for (const [id, obj] of Array.from(mockStorage.entries())) {
    if (id.startsWith(`${type}-`)) {
      results.push(obj);
    }
  }
  return results;
}

// Clear mock storage (useful for test cleanup)
export function clearMockStorage(): void {
  mockStorage.clear();
}

/**
 * Task-specific mock injection utilities
 *
 * Handles the specific requirements for Issue #480:
 * - Provides both content and title fields for E2E test compatibility
 * - Ensures task_id is preserved in the ID structure
 * - Maintains compatibility with existing task creation patterns
 */
export class TaskMockInjector {
  /**
   * Creates a task using mock data when in test environment, otherwise calls real API
   *
   * @param content - Task content
   * @param options - Task creation options
   * @param realCreateTask - Function that performs the real API call
   * @returns Either mock AttioTask or result from real API
   */
  static async createTask(
    content: string,
    options: Record<string, unknown> = {},
    realCreateTask?: (
      content: string,
      options: Record<string, unknown>
    ) => Promise<AttioTask>
  ): Promise<AttioTask> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for task creation', {
        content,
        options,
      });

      // Generate a persistent task ID
      const taskId = generateMockId('task');

      // Issue #480: Create mock task with E2E test compatibility
      const mockTask = TaskMockFactory.create({
        content,
        title: content, // Issue #480: Provide both fields for test compatibility
        assignee_id: options.assigneeId as string,
        due_date: options.dueDate as string,
        record_id: options.recordId as string,
        linked_records: options.recordIds
          ? (options.recordIds as string[]).map((id) => ({
              id,
              object_id: 'mock-object',
              object_slug: 'companies',
              title: 'Mock Linked Record',
            }))
          : undefined,
      });

      // Issue #480: Set consistent task ID
      if (mockTask.id && typeof mockTask.id === 'object') {
        (mockTask.id as any).record_id = taskId;
        (mockTask.id as any).task_id = taskId;
      }

      // Store the task for future retrieval/updates
      storeMock(taskId, mockTask);

      return mockTask;
    }

    if (!realCreateTask) {
      throw new Error(
        'Real task creation function not provided for production environment'
      );
    }

    return await realCreateTask(content, options);
  }

  /**
   * Updates a task using mock data when in test environment
   */
  static async updateTask(
    taskId: string,
    updateData: Record<string, unknown>,
    realUpdateTask?: (
      taskId: string,
      updateData: Record<string, unknown>
    ) => Promise<AttioTask>
  ): Promise<AttioTask> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for task update', {
        taskId,
        updateData,
      });

      // Try to retrieve existing task
      const existingTask = retrieveMock(taskId);
      if (!existingTask) {
        // Task not found - create appropriate error
        const error = new Error(`Task not found: ${taskId}`);
        error.name = 'TaskNotFoundError';
        throw error;
      }

      // Update the existing task with new data
      const updatedTask = {
        ...existingTask,
        ...updateData,
        content: updateData.content || existingTask.content,
        title: updateData.content || existingTask.title, // Keep both for compatibility
        status: updateData.status || existingTask.status,
        assignee_id: updateData.assigneeId || existingTask.assignee_id,
        due_date: updateData.dueDate || existingTask.due_date,
        updated_at: new Date().toISOString(),
      };

      // Preserve task ID structure
      if (updatedTask.id && typeof updatedTask.id === 'object') {
        (updatedTask.id as any).record_id = taskId;
        (updatedTask.id as any).task_id = taskId;
      }

      // Store the updated task
      storeMock(taskId, updatedTask);

      return updatedTask;
    }

    if (!realUpdateTask) {
      throw new Error(
        'Real task update function not provided for production environment'
      );
    }

    return await realUpdateTask(taskId, updateData);
  }

  /**
   * Gets a task using mock data when in test environment
   */
  static async getTask(
    taskId: string,
    realGetTask?: (taskId: string) => Promise<AttioTask>
  ): Promise<AttioTask> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for task retrieval', { taskId });

      // Try to retrieve existing task
      const existingTask = retrieveMock(taskId);
      if (!existingTask) {
        // Task not found - create appropriate error
        const error = new Error(`Task not found: ${taskId}`);
        error.name = 'TaskNotFoundError';
        throw error;
      }

      return existingTask;
    }

    if (!realGetTask) {
      throw new Error(
        'Real task get function not provided for production environment'
      );
    }

    return await realGetTask(taskId);
  }

  /**
   * Lists tasks using mock data when in test environment
   */
  static async listTasks(
    realListTasks?: () => Promise<AttioTask[]>
  ): Promise<AttioTask[]> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for task listing');

      // Return all stored tasks
      const storedTasks = getAllMocksByType('task');

      // If no tasks stored, return empty array (not create new ones)
      return storedTasks;
    }

    if (!realListTasks) {
      throw new Error(
        'Real task list function not provided for production environment'
      );
    }

    return await realListTasks();
  }

  /**
   * Deletes a task using mock success response when in test environment
   */
  static async deleteTask(
    taskId: string,
    realDeleteTask?: (
      taskId: string
    ) => Promise<{ success: boolean; record_id: string }>
  ): Promise<{ success: boolean; record_id: string }> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for task deletion', { taskId });

      // Check if task exists
      const existingTask = retrieveMock(taskId);
      if (!existingTask) {
        // Task not found - create appropriate error
        const error = new Error(`Task not found: ${taskId}`);
        error.name = 'TaskNotFoundError';
        throw error;
      }

      // Remove task from storage
      mockStorage.delete(taskId);

      return { success: true, record_id: taskId };
    }

    if (!realDeleteTask) {
      throw new Error(
        'Real task delete function not provided for production environment'
      );
    }

    return await realDeleteTask(taskId);
  }
}

/**
 * Company-specific mock injection utilities
 */
export class CompanyMockInjector {
  static async createCompany(
    companyData: Record<string, unknown>,
    realCreateCompany?: (
      companyData: Record<string, unknown>
    ) => Promise<AttioRecord>
  ): Promise<AttioRecord> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for company creation', companyData);
      return CompanyMockFactory.create(companyData);
    }

    if (!realCreateCompany) {
      throw new Error(
        'Real company creation function not provided for production environment'
      );
    }

    return await realCreateCompany(companyData);
  }

  static async getCompany(
    companyId: string,
    realGetCompany?: (companyId: string) => Promise<AttioRecord>
  ): Promise<AttioRecord> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for company retrieval', {
        companyId,
      });

      const mockCompany = CompanyMockFactory.create({
        name: `Mock Company ${companyId.slice(-4)}`,
      });

      // Preserve the requested company ID
      if (mockCompany.id && typeof mockCompany.id === 'object') {
        (mockCompany.id as any).record_id = companyId;
      }

      return mockCompany;
    }

    if (!realGetCompany) {
      throw new Error(
        'Real company get function not provided for production environment'
      );
    }

    return await realGetCompany(companyId);
  }
}

/**
 * Person-specific mock injection utilities
 */
export class PersonMockInjector {
  static async createPerson(
    personData: Record<string, unknown>,
    realCreatePerson?: (
      personData: Record<string, unknown>
    ) => Promise<AttioRecord>
  ): Promise<AttioRecord> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for person creation', personData);
      return PersonMockFactory.create(personData);
    }

    if (!realCreatePerson) {
      throw new Error(
        'Real person creation function not provided for production environment'
      );
    }

    return await realCreatePerson(personData);
  }

  static async getPerson(
    personId: string,
    realGetPerson?: (personId: string) => Promise<AttioRecord>
  ): Promise<AttioRecord> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for person retrieval', { personId });

      const mockPerson = PersonMockFactory.create({
        name: `Mock Person ${personId.slice(-4)}`,
      });

      // Preserve the requested person ID
      if (mockPerson.id && typeof mockPerson.id === 'object') {
        (mockPerson.id as any).record_id = personId;
      }

      return mockPerson;
    }

    if (!realGetPerson) {
      throw new Error(
        'Real person get function not provided for production environment'
      );
    }

    return await realGetPerson(personId);
  }
}

/**
 * List-specific mock injection utilities
 */
export class ListMockInjector {
  static async createList(
    listData: Record<string, unknown>,
    realCreateList?: (listData: Record<string, unknown>) => Promise<AttioList>
  ): Promise<AttioList> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for list creation', listData);
      return ListMockFactory.create(listData);
    }

    if (!realCreateList) {
      throw new Error(
        'Real list creation function not provided for production environment'
      );
    }

    return await realCreateList(listData);
  }

  static async getList(
    listId: string,
    realGetList?: (listId: string) => Promise<AttioList>
  ): Promise<AttioList> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for list retrieval', { listId });

      const mockList = ListMockFactory.create({
        name: `Mock List ${listId.slice(-4)}`,
      });

      // Preserve the requested list ID
      if (mockList.id && typeof mockList.id === 'object') {
        (mockList.id as any).list_id = listId;
      }

      return mockList;
    }

    if (!realGetList) {
      throw new Error(
        'Real list get function not provided for production environment'
      );
    }

    return await realGetList(listId);
  }

  static async listLists(
    options: { objectSlug?: string; limit?: number } = {},
    realListLists?: () => Promise<AttioList[]>
  ): Promise<AttioList[]> {
    if (shouldUseMockData()) {
      TestEnvironment.log('Using mock data for list listing', options);

      const count = Math.min(options.limit || 5, 10);
      const mockLists = ListMockFactory.createMultiple(count, {
        object_slug: options.objectSlug,
      });

      return mockLists;
    }

    if (!realListLists) {
      throw new Error(
        'Real list listing function not provided for production environment'
      );
    }

    return await realListLists();
  }
}

/**
 * Universal mock injector for all resource types
 */
export class UniversalMockInjector {
  /**
   * Injects appropriate mock data based on resource type
   */
  static async inject(
    resourceType: string,
    operation: string,
    data: Record<string, unknown> = {},
    realOperation?: (...args: any[]) => Promise<any>
  ): Promise<any> {
    if (!shouldUseMockData()) {
      if (!realOperation) {
        throw new Error(
          `Real ${operation} function not provided for production environment`
        );
      }
      return await realOperation(data);
    }

    TestEnvironment.log(
      `Using mock data for ${resourceType} ${operation}`,
      data
    );

    switch (resourceType.toLowerCase()) {
      case 'tasks':
        return this.handleTaskOperation(operation, data);
      case 'companies':
        return this.handleCompanyOperation(operation, data);
      case 'people':
        return this.handlePersonOperation(operation, data);
      case 'lists':
        return this.handleListOperation(operation, data);
      default:
        throw new Error(
          `Unsupported resource type for mock injection: ${resourceType}`
        );
    }
  }

  private static handleTaskOperation(
    operation: string,
    data: Record<string, unknown>
  ): any {
    switch (operation) {
      case 'create':
        return TaskMockFactory.create(data);
      case 'update':
        return TaskMockFactory.create({
          ...data,
          updated_at: new Date().toISOString(),
        });
      case 'list':
        return TaskMockFactory.createMultiple(5);
      default:
        return TaskMockFactory.create(data);
    }
  }

  private static handleCompanyOperation(
    operation: string,
    data: Record<string, unknown>
  ): any {
    switch (operation) {
      case 'create':
        return CompanyMockFactory.create(data);
      case 'update':
        return CompanyMockFactory.create({
          ...data,
          updated_at: new Date().toISOString(),
        });
      case 'list':
        return CompanyMockFactory.createMultiple(5);
      default:
        return CompanyMockFactory.create(data);
    }
  }

  private static handlePersonOperation(
    operation: string,
    data: Record<string, unknown>
  ): any {
    switch (operation) {
      case 'create':
        return PersonMockFactory.create(data);
      case 'update':
        return PersonMockFactory.create({
          ...data,
          updated_at: new Date().toISOString(),
        });
      case 'list':
        return PersonMockFactory.createMultiple(5);
      default:
        return PersonMockFactory.create(data);
    }
  }

  private static handleListOperation(
    operation: string,
    data: Record<string, unknown>
  ): any {
    switch (operation) {
      case 'create':
        return ListMockFactory.create(data);
      case 'update':
        return ListMockFactory.create({
          ...data,
          updated_at: new Date().toISOString(),
        });
      case 'list':
        return ListMockFactory.createMultiple(5);
      default:
        return ListMockFactory.create(data);
    }
  }
}

// Injector classes are already exported inline above
