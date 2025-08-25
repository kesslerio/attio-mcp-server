/**
 * UniversalDeleteService - Centralized record deletion operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal delete functionality across all resource types.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalDeleteParams } from '../handlers/tool-configs/universal/types.js';
import { isValidId } from '../utils/validation.js';

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

/**
 * Helper function to check if we should use mock data based on environment
 */
function shouldUseMockData(): boolean {
  // Only activate for E2E tests and specific performance tests
  // Unit tests use vi.mock() and should not be interfered with
  return (
    process.env.E2E_MODE === 'true' ||
    process.env.USE_MOCK_DATA === 'true' ||
    (process.env.NODE_ENV === 'test' &&
      process.env.SKIP_INTEGRATION_TESTS !== 'true' &&
      !process.env.VITEST)
  );
}

/**
 * UniversalDeleteService provides centralized record deletion functionality
 */
export class UniversalDeleteService {
  /**
   * Helper to detect 404 errors from various API error formats
   */
  private static is404Error(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const errorObj = error as Record<string, unknown>;

    // Check status field
    if (errorObj.status === 404) return true;

    // Check nested status
    if (errorObj.response && typeof errorObj.response === 'object') {
      const response = errorObj.response as Record<string, unknown>;
      if (response.status === 404) return true;
    }

    // Check error message patterns
    const message = errorObj.message || errorObj.error || '';
    if (typeof message === 'string') {
      return (
        message.toLowerCase().includes('not found') || message.includes('404')
      );
    }

    return false;
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
        // Add mock support for task deletion in test environments
        if (shouldUseMockData()) {
          // Validate task ID before proceeding with deletion
          if (!isValidId(record_id)) {
            throw new Error(`Task not found: ${record_id}`);
          }

          if (
            process.env.NODE_ENV === 'development' ||
            process.env.VERBOSE_TESTS === 'true'
          ) {
            console.error('[MockInjection] Using mock data for task deletion');
          }

          // Return mock success response
          return { success: true, record_id };
        }

        await deleteTask(record_id);
        return { success: true, record_id };

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
