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
import type {
  ResourceCreator,
  ResourceCreatorContext,
} from './creators/types.js';
import { buildAttioClient } from '../../api/attio-client.js';
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

  // Lazy-loaded dependencies for non-strategy methods
  private taskModule: any = null;
  private converterModule: any = null;
  private noteModule: any = null;

  // Supported resource types for validation
  static readonly SUPPORTED_RESOURCE_TYPES = {
    COMPANIES: 'companies',
    PEOPLE: 'people',
    TASKS: 'tasks',
    NOTES: 'notes',
  } as const;

  constructor() {
    // Initialize resource creators using Strategy Pattern
    this.creators = new Map<string, ResourceCreator>();
    this.creators.set(
      AttioCreateService.SUPPORTED_RESOURCE_TYPES.COMPANIES,
      new CompanyCreator()
    );
    this.creators.set(
      AttioCreateService.SUPPORTED_RESOURCE_TYPES.PEOPLE,
      new PersonCreator()
    );
    this.creators.set(
      AttioCreateService.SUPPORTED_RESOURCE_TYPES.TASKS,
      new TaskCreator()
    );
    this.creators.set(
      AttioCreateService.SUPPORTED_RESOURCE_TYPES.NOTES,
      new NoteCreator()
    );

    // Create shared context for all creators
    this.context = {
      client: buildAttioClient(), // Guarantees proper Authorization header
      debug,
      logError,
    };
  }

  /**
   * Lazy-loads dependencies for non-strategy methods
   */
  private async ensureDependencies(): Promise<void> {
    if (!this.taskModule) {
      this.taskModule = await import('../../objects/tasks.js');
    }
    if (!this.converterModule) {
      this.converterModule = await import('./data-normalizers.js');
    }
    if (!this.noteModule) {
      this.noteModule = await import('../../objects/notes.js');
    }
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
    // Ensure dependencies are loaded
    await this.ensureDependencies();

    const updatedTask = await this.taskModule.updateTask(taskId, {
      content: input.content as string,
      status: input.status as string,
      assigneeId: input.assigneeId as string,
      dueDate: input.dueDate as string,
      recordIds: input.recordIds as string[],
    });

    // Convert task to AttioRecord format
    return this.converterModule.convertTaskToAttioRecord(updatedTask, input);
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
    // Ensure dependencies are loaded
    await this.ensureDependencies();

    const query = {
      parent_object: params.resource_type,
      parent_record_id: params.record_id,
    };

    const response = await this.noteModule.listNotes(query);
    return response.data || [];
  }

  /**
   * Validates and gets a creator for the specified resource type
   * @private
   */
  private getCreator(resourceType: string): ResourceCreator {
    // Validate input
    if (!resourceType || typeof resourceType !== 'string') {
      throw new Error(
        `Invalid resource type: expected non-empty string, got ${typeof resourceType}`
      );
    }

    const normalizedType = resourceType.toLowerCase().trim();
    const creator = this.creators.get(normalizedType);

    if (!creator) {
      const supportedTypes = Array.from(this.creators.keys()).sort();
      const suggestion = this.findClosestResourceType(
        normalizedType,
        supportedTypes
      );

      throw new Error(
        `Unsupported resource type: "${resourceType}". ` +
          `Supported types: ${supportedTypes.join(', ')}.` +
          (suggestion ? ` Did you mean "${suggestion}"?` : '')
      );
    }

    return creator;
  }

  /**
   * Finds the closest matching resource type for better error messages
   * @private
   */
  private findClosestResourceType(
    input: string,
    supportedTypes: string[]
  ): string | null {
    // Simple similarity check - could be enhanced with better algorithms
    const similarities = supportedTypes.map((type) => ({
      type,
      score: this.calculateSimilarity(input, type),
    }));

    const best = similarities.reduce((prev, current) =>
      prev.score > current.score ? prev : current
    );

    // Only suggest if similarity is reasonable (> 0.5)
    return best.score > 0.5 ? best.type : null;
  }

  /**
   * Calculates simple string similarity score
   * @private
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Simple character overlap calculation
    const setA = new Set(a.toLowerCase());
    const setB = new Set(b.toLowerCase());
    const intersection = new Set(Array.from(setA).filter((x) => setB.has(x)));
    const union = new Set([...Array.from(setA), ...Array.from(setB)]);

    return intersection.size / union.size;
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

  /**
   * Validates if a resource type is supported
   */
  isResourceTypeSupported(resourceType: string): boolean {
    if (!resourceType || typeof resourceType !== 'string') {
      return false;
    }
    return this.creators.has(resourceType.toLowerCase().trim());
  }
}
