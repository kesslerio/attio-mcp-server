/**
 * AttioCreateService - Refactored with Strategy Pattern (Issue #552)
 *
 * REFACTORED: Implements the Strategy Pattern using resource-specific creators to handle
 * different Attio resource types. Each creator encapsulates the logic for
 * creating one type of resource, promoting Single Responsibility Principle.
 * 
 * This refactoring addresses SRP violations by moving resource-specific logic
 * from large methods (~139-168 lines) into focused creator classes (~50-80 lines each).
 * 
 * Key improvements:
 * - Single Responsibility: Each creator handles one resource type
 * - Maintainability: Easy to add new resource types
 * - Testability: Test each creator independently  
 * - Code Reuse: Shared utilities in BaseCreator
 * 
 * See src/services/create/creators/README.md for full documentation.
 */

import type { CreateService } from './types.js';
import type { AttioRecord } from '../../types/attio.js';
import type { ResourceCreator, ResourceCreatorContext } from './creators/types.js';
import { getAttioClient } from '../../api/attio-client.js';
import { debug, error as logError } from '../../utils/logger.js';
import {
  CompanyCreator,
  PersonCreator,
  TaskCreator,
  NoteCreator,
} from './creators/index.js';

/**
 * Refactored implementation using Strategy Pattern
 * 
 * Uses resource-specific creators to handle different resource types,
 * promoting separation of concerns and Single Responsibility Principle.
 * 
 * @example
 * ```typescript
 * const service = new AttioCreateService();
 * const company = await service.createCompany({
 *   name: "Acme Corp",
 *   domain: "acme.com"
 * });
 * ```
 */
export class AttioCreateService implements CreateService {
  private readonly creators: Map<string, ResourceCreator>;
  private readonly context: ResourceCreatorContext;

  constructor() {
    // Initialize resource creators using Strategy Pattern
    this.creators = new Map<string, ResourceCreator>();
    this.creators.set('companies', new CompanyCreator());
    this.creators.set('people', new PersonCreator());
    this.creators.set('tasks', new TaskCreator());
    this.creators.set('notes', new NoteCreator());

    // Create shared context for all creators
    this.context = {
      client: getAttioClient({ rawE2E: true }),
      debug,
      logError,
    };
  }

  /**
   * Creates a company record with domain normalization
   * Delegates to CompanyCreator strategy
   */
  async createCompany(input: Record<string, unknown>): Promise<AttioRecord> {
    const creator = this.getCreator('companies');
    return creator.create(input, this.context);
  }

  /**
   * Creates a person record with name and email normalization
   * Delegates to PersonCreator strategy
   */
  async createPerson(input: Record<string, unknown>): Promise<AttioRecord> {
    const creator = this.getCreator('people');
    return creator.create(input, this.context);
  }

  /**
   * Creates a task record via delegation to tasks object
   * Delegates to TaskCreator strategy
   */
  async createTask(input: Record<string, unknown>): Promise<AttioRecord> {
    const creator = this.getCreator('tasks');
    return creator.create(input, this.context);
  }

  /**
   * Updates a task record via delegation to tasks object
   * 
   * Note: This method doesn't use strategy pattern as it's an update operation
   * and the existing logic is simple enough to keep inline
   */
  async updateTask(
    taskId: string,
    input: Record<string, unknown>
  ): Promise<AttioRecord> {
    // Delegate to the tasks object for now, this will be refactored later
    const { updateTask } = await import('../../objects/tasks.js');
    const { convertTaskToAttioRecord } = await import('./data-normalizers.js');
    
    const updatedTask = await updateTask(taskId, {
      content: input.content as string,
      status: input.status as string,
      assigneeId: input.assigneeId as string,
      dueDate: input.dueDate as string,
      recordIds: input.recordIds as string[],
    });

    // Convert task to AttioRecord format
    return convertTaskToAttioRecord(updatedTask, input);
  }

  /**
   * Creates a note record via delegation to notes object
   * Delegates to NoteCreator strategy
   */
  async createNote(input: {
    resource_type: string;
    record_id: string;
    title: string;
    content: string;
    format?: string;
  }): Promise<any> {
    const creator = this.getCreator('notes');
    return creator.create(input, this.context);
  }

  /**
   * Lists notes for a resource
   * 
   * Note: This method doesn't use strategy pattern as it's a read operation
   * and the existing logic is simple enough to keep inline
   */
  async listNotes(params: {
    resource_type?: string;
    record_id?: string;
  }): Promise<unknown[]> {
    // Use real API calls for notes listing
    const { listNotes } = await import('../../objects/notes.js');
    
    const query = {
      parent_object: params.resource_type,
      parent_record_id: params.record_id,
    };

    const response = await listNotes(query);
    return response.data || [];
  }

  /**
   * Gets a creator for the specified resource type
   * @private
   */
  private getCreator(resourceType: string): ResourceCreator {
    const creator = this.creators.get(resourceType);
    if (!creator) {
      throw new Error(`No creator found for resource type: ${resourceType}`);
    }
    return creator;
  }

  /**
   * Adds a new creator for a resource type (for future extensibility)
   * @param resourceType - The resource type identifier
   * @param creator - The creator implementation
   */
  addCreator(resourceType: string, creator: ResourceCreator): void {
    this.creators.set(resourceType, creator);
  }

  /**
   * Gets all supported resource types
   */
  getSupportedResourceTypes(): string[] {
    return Array.from(this.creators.keys());
  }
}