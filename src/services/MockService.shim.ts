/**
 * MockService Backward Compatibility Shim
 *
 * @deprecated Use getCreateService() from './create/index.js' instead
 *
 * This shim provides backward compatibility for any code still importing MockService directly.
 * The factory pattern (getCreateService) is the recommended approach as it provides:
 * - Environment-aware service selection (mock vs real)
 * - Cleaner separation of concerns
 * - Better testability and maintainability
 *
 * Migration examples:
 * OLD: const { MockService } = await import('./MockService.js');
 *      const result = await MockService.createCompany(data);
 *
 * NEW: import { getCreateService } from './create/index.js';
 *      const service = getCreateService();
 *      const result = await service.createCompany(data);
 */

import { getCreateService } from './create/index.js';

/**
 * Log deprecation warning in development mode
 */
function logDeprecation(method: string): void {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.VERBOSE_TESTS === 'true'
  ) {
    console.warn(
      `⚠️  MockService.${method} is deprecated. Use getCreateService().${method} from './create/index.js' instead.`
    );
  }
}

/**
 * @deprecated Backward compatibility shim for MockService
 * Use getCreateService() from './create/index.js' instead
 */
export const MockService = {
  async createCompany(data: unknown) {
    logDeprecation('createCompany');
    const service = getCreateService();
    return await service.createCompany(data);
  },

  async createPerson(data: unknown) {
    logDeprecation('createPerson');
    const service = getCreateService();
    return await service.createPerson(data);
  },

  async createTask(data: unknown) {
    logDeprecation('createTask');
    const service = getCreateService();
    return await service.createTask(data);
  },

  async updateTask(taskId: string, data: unknown) {
    logDeprecation('updateTask');
    const service = getCreateService();
    return await service.updateTask(taskId, data);
  },

  async createNote(data: unknown) {
    logDeprecation('createNote');
    const service = getCreateService();
    return await service.createNote(data);
  },

  async listNotes(params?: unknown) {
    logDeprecation('listNotes');
    const service = getCreateService();
    return await service.listNotes(params);
  },
};