/**
 * UniversalDeleteService - Centralized record deletion operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal delete functionality across all resource types.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalDeleteParams } from '../handlers/tool-configs/universal/types.js';
import { isValidId } from '../utils/validation.js';
import { debug } from '../utils/logger.js';

// Import delete functions for each resource type
import {
  deleteCompany,
  getCompanyDetails,
} from '../objects/companies/index.js';
import { deletePerson } from '../objects/people-write.js';
import { deleteList, getListDetails } from '../objects/lists.js';
import {
  deleteObjectRecord,
  getObjectRecord,
} from '../objects/records/index.js';
import { deleteTask, getTask } from '../objects/tasks.js';
import { deleteNote } from '../objects/notes.js';
import { getPersonDetails } from '../objects/people/basic.js';
import { shouldUseMockData } from './create/index.js';

/**
 * UniversalDeleteService provides centralized record deletion functionality
 */
export class UniversalDeleteService {
  /**
   * Helper to detect 404 errors from various API error formats
   */
  private static is404Error(err: unknown): boolean {
    const anyErr = err as any;
    const status = anyErr?.response?.status ?? anyErr?.status;
    const code = anyErr?.response?.data?.code ?? anyErr?.code;
    const msg = (anyErr?.response?.data?.message ?? anyErr?.message ?? '')
      .toString()
      .toLowerCase();

    return (
      status === 404 ||
      code === 'not_found' ||
      msg.includes('not found') ||
      msg.includes('404')
    );
  }
  /**
   * Delete a record across any supported resource type
   *
   * @param params - Delete operation parameters
   * @returns Promise resolving to success status and record ID
   */
  static async deleteRecord(
    params: UniversalDeleteParams
  ): Promise<{ success: boolean; record_id: string }> {
    const { resource_type, record_id } = params;

    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        try {
          await deleteCompany(record_id);
          return { success: true, record_id };
        } catch (error: unknown) {
          // Map API errors to structured format
          if (this.is404Error(error)) {
            throw {
              status: 404,
              body: {
                code: 'not_found',
                message: `Company record with ID "${record_id}" not found.`,
              },
            };
          }
          throw error;
        }

      case UniversalResourceType.PEOPLE:
        try {
          await deletePerson(record_id);
          return { success: true, record_id };
        } catch (error: unknown) {
          // Map API errors to structured format
          if (this.is404Error(error)) {
            throw {
              status: 404,
              body: {
                code: 'not_found',
                message: `Person record with ID "${record_id}" not found.`,
              },
            };
          }
          throw error;
        }

      case UniversalResourceType.LISTS:
        await deleteList(record_id);
        return { success: true, record_id };

      case UniversalResourceType.RECORDS:
        try {
          await deleteObjectRecord('records', record_id);
          return { success: true, record_id };
        } catch (error: unknown) {
          // Map API errors to structured format
          if (this.is404Error(error)) {
            throw {
              status: 404,
              body: {
                code: 'not_found',
                message: `Record with ID "${record_id}" not found.`,
              },
            };
          }
          throw error;
        }

      case UniversalResourceType.DEALS:
        await deleteObjectRecord('deals', record_id);
        return { success: true, record_id };

      case UniversalResourceType.TASKS:
        // In mock mode, pre-validate IDs and emit deterministic message expected by tests
        if (shouldUseMockData()) {
          if (!isValidId(record_id)) {
            const err: any = new Error(`Task not found: ${record_id}`);
            err.status = 404;
            err.body = {
              code: 'not_found',
              message: `Task not found: ${record_id}`,
            };
            throw err;
          }
          if (
            process.env.NODE_ENV === 'development' ||
            process.env.VERBOSE_TESTS === 'true'
          ) {
            debug(
              'UniversalDeleteService',
              '[MockInjection] Using mock data for task deletion'
            );
          }
          return { success: true, record_id };
        }

        try {
          const resp = await deleteTask(record_id);

          // deleteTask returns boolean - if false, treat as not found
          if (resp === false) {
            const err: any = new Error(
              `Task with ID "${record_id}" not found.`
            );
            err.status = 404;
            err.body = {
              code: 'not_found',
              message: `Task with ID "${record_id}" not found.`,
            };
            throw err;
          }

          return { success: true, record_id };
        } catch (error: unknown) {
          // Map API errors to structured format
          if (this.is404Error(error)) {
            const err: any = new Error(
              `Task with ID "${record_id}" not found.`
            );
            err.status = 404;
            err.body = {
              code: 'not_found',
              message: `Task with ID "${record_id}" not found.`,
            };
            throw err; // dispatcher should mark isError=true
          }
          throw error;
        }

      case UniversalResourceType.NOTES:
        const result = await deleteNote(record_id);
        return { success: result.success, record_id };

      default:
        throw new Error(
          `Unsupported resource type for delete: ${resource_type}`
        );
    }
  }
}
