/**
 * Type definitions for Create Services
 *
 * Port/interface definitions that ensure both AttioCreateService and MockCreateService
 * implement the same contract for consistent behavior across environments.
 */

import type { AttioRecord } from '../../types/attio.js';

  /**
   * Creates a person record
   * @param input - Person data to create
   * @returns Promise<AttioRecord> - Created person record
   */
  createPerson(input: Record<string, unknown>): Promise<AttioRecord>;

  /**
   * Creates a task record
   * @param input - Task data to create
   * @returns Promise<AttioRecord> - Created task record
   */
  createTask(input: Record<string, unknown>): Promise<AttioRecord>;

  /**
   * Updates a task record
   * @param taskId - Task ID to update
   * @param input - Update data
   * @returns Promise<AttioRecord> - Updated task record
   */
  updateTask(
    taskId: string,
    input: Record<string, unknown>
  ): Promise<AttioRecord>;

  /**
   * Creates a note record
   * @param input - Note data including resource_type, record_id, title, content
   * @returns Promise<any> - Created note record
   */
  createNote(input: {
    resource_type: string;
    record_id: string;
    title: string;
    content: string;
    format?: string;
  }): Promise<any>;

  /**
   * Lists notes for a resource
   * @param params - Query parameters for listing notes
   * @returns Promise<any[]> - Array of note records
   */
  listNotes(params: {
    resource_type?: string;
    record_id?: string;
  }): Promise<any[]>;
}

/**
 * Environment detection helpers
 */
export interface EnvironmentDetector {
  shouldUseMockData(): boolean;
  shouldUseRealApi(): boolean;
}

/**
 * Service factory interface
 */
export interface CreateServiceFactory {
  getCreateService(): CreateService;
  shouldUseMockData(): boolean;
}
