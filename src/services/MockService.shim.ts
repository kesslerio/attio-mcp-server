/**
 * MockService Backward Compatibility Shim
 *
 * @deprecated Use getCreateService() from './create/index.js' instead
 *
 * This shim provides backward compatibility during the MockService elimination process.
 * All methods delegate to the new factory pattern for consistent behavior.
 *
 * Migration path:
 * OLD: const { MockService } = await import('./MockService.js');
 *      await MockService.createCompany(data);
 *
 * NEW: const { getCreateService } = await import('./create/index.js');
 *      const service = getCreateService();
 *      await service.createCompany(data);
 */

import { getCreateService, shouldUseMockData } from './create/index.js';
import { debug } from '../utils/logger.js';

/**
 * Backward compatibility shim for MockService
 * @deprecated Use getCreateService() from './create/index.js' instead
 */
export const MockService = {
  /**
   * Create company record
   * @deprecated Use getCreateService().createCompany() instead
   */
  async createCompany(data: Record<string, unknown>) {
    debug(
      'MockService.shim',
      'DEPRECATED: MockService.createCompany called - use getCreateService().createCompany() instead'
    );
    const service = getCreateService();
    return await service.createCompany(data);
  },

  /**
   * Create person record
   * @deprecated Use getCreateService().createPerson() instead
   */
  async createPerson(data: Record<string, unknown>) {
    debug(
      'MockService.shim',
      'DEPRECATED: MockService.createPerson called - use getCreateService().createPerson() instead'
    );
    const service = getCreateService();
    return await service.createPerson(data);
  },

  /**
   * Create task record
   * @deprecated Use getCreateService().createTask() instead
   */
  async createTask(data: Record<string, unknown>) {
    debug(
      'MockService.shim',
      'DEPRECATED: MockService.createTask called - use getCreateService().createTask() instead'
    );
    const service = getCreateService();
    return await service.createTask(data);
  },

  /**
   * Update task record
   * @deprecated Use getCreateService().updateTask() instead
   */
  async updateTask(taskId: string, data: Record<string, unknown>) {
    debug(
      'MockService.shim',
      'DEPRECATED: MockService.updateTask called - use getCreateService().updateTask() instead'
    );
    const service = getCreateService();
    return await service.updateTask(taskId, data);
  },

  /**
   * Create note record
   * @deprecated Use getCreateService().createNote() instead
   */
  async createNote(data: {
    resource_type: string;
    record_id: string;
    title: string;
    content: string;
    format?: string;
  }) {
    debug(
      'MockService.shim',
      'DEPRECATED: MockService.createNote called - use getCreateService().createNote() instead'
    );
    const service = getCreateService();
    return await service.createNote(data);
  },

  /**
   * List notes
   * @deprecated Use getCreateService().listNotes() instead
   */
  async listNotes(params: { resource_type?: string; record_id?: string }) {
    debug(
      'MockService.shim',
      'DEPRECATED: MockService.listNotes called - use getCreateService().listNotes() instead'
    );
    const service = getCreateService();
    return await service.listNotes(params);
  },

  /**
   * Check if using mock data
   * @deprecated Use shouldUseMockData() from './create/index.js' instead
   */
  isUsingMockData() {
    debug(
      'MockService.shim',
      'DEPRECATED: MockService.isUsingMockData called - use shouldUseMockData() from create/index.js instead'
    );
    return shouldUseMockData();
  },
};
