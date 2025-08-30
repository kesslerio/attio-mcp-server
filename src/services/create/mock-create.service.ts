/**
 * MockCreateService - Delegates to MockService for compatibility
 *
 * Phase B implementation that delegates to existing MockService
 * to maintain backward compatibility with existing tests.
 * Phase C will implement pure mock logic.
 */

import type { AttioRecord } from '../../types/attio.js';
import type { CreateService } from './types.js';

/**
 * Mock implementation that delegates to existing MockService for compatibility
 */
export class MockCreateService implements CreateService {
  async createCompany(input: Record<string, unknown>): Promise<AttioRecord> {
    const { MockService } = await import('../MockService.legacy.js');
    return await MockService.createCompany(input);
  }

  async createPerson(input: Record<string, unknown>): Promise<AttioRecord> {
    const { MockService } = await import('../MockService.legacy.js');
    return await MockService.createPerson(input);
  }

  async createTask(input: Record<string, unknown>): Promise<AttioRecord> {
    const { MockService } = await import('../MockService.legacy.js');
    return await MockService.createTask(input);
  }

  async updateTask(
    taskId: string,
    input: Record<string, unknown>
  ): Promise<AttioRecord> {
    const { MockService } = await import('../MockService.legacy.js');
    return await MockService.updateTask(taskId, input);
  }

  async createNote(input: {
    resource_type: string;
    record_id: string;
    title: string;
    content: string;
    format?: string;
  }): Promise<any> {
    const { MockService } = await import('../MockService.legacy.js');
    return await MockService.createNote(input);
  }

  async listNotes(params: {
    resource_type?: string;
    record_id?: string;
  }): Promise<any[]> {
    const { MockService } = await import('../MockService.legacy.js');
    return await MockService.listNotes(params);
  }
}