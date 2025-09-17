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

// Import shared type definitions and utilities
import {
  is404Error,
  createNotFoundError,
  type TaskError,
  type ApiErrorWithResponse,
} from '../types/universal-service-types.js';

// Import delete functions for each resource type
import { deleteCompany } from '../objects/companies/index.js';
import { deletePerson } from '../objects/people-write.js';
import { deleteList } from '../objects/lists.js';
import { deleteObjectRecord } from '../objects/records/index.js';
import { deleteTask, getTask } from '../objects/tasks.js';
import { deleteNote } from '../objects/notes.js';
import { shouldUseMockData } from './create/index.js';

/**
 * UniversalDeleteService provides centralized record deletion functionality
 *
 * **Type Safety Improvements**: This service now uses shared type definitions from
 * universal-service-types.ts to eliminate repeated inline types and improve
 * runtime safety through type guards.
 *
 * **Record<string, unknown> vs any**: Throughout this service, we use
 * Record<string, unknown> instead of any for better type safety. This allows
 * property access while preventing unsafe operations on unknown data structures.
 */
export class UniversalDeleteService {
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
          // Map API errors to structured format using shared type guards
          if (is404Error(error)) {
            throw createNotFoundError(
              UniversalResourceType.COMPANIES,
              record_id
            );
          }
          throw error;
        }

      case UniversalResourceType.PEOPLE:
        try {
          await deletePerson(record_id);
          return { success: true, record_id };
        } catch (error: unknown) {
          // Map API errors to structured format using shared type guards
          if (is404Error(error)) {
            throw createNotFoundError(UniversalResourceType.PEOPLE, record_id);
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
          // Map API errors to structured format using shared type guards
          if (is404Error(error)) {
            throw createNotFoundError(UniversalResourceType.RECORDS, record_id);
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
            /**
             * **Type Safety Note**: Using TaskError interface instead of any
             * to maintain type safety while preserving test compatibility.
             */
            const err: TaskError = new Error(`Task not found: ${record_id}`);
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
            /**
             * **Type Safety Note**: Using TaskError interface for structured error
             * properties while maintaining Error base class for compatibility.
             */
            const err: TaskError = new Error(
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
          // Map API errors to structured format, with a single retry for occasional eventual consistency
          if (is404Error(error)) {
            // Best-effort verification: if task still exists, wait briefly and retry once
            try {
              const exists = await getTask(record_id).then(
                () => true,
                () => false
              );
              if (exists) {
                await new Promise((r) => setTimeout(r, 500));
                const retried = await deleteTask(record_id);
                if (retried) return { success: true, record_id };
              }
            } catch {
              // ignore and fall through to not_found mapping
            }

            /**
             * **Type Safety**: Using TaskError instead of any for structured error properties
             */
            const err: TaskError = new Error(
              `Task with ID "${record_id}" not found.`
            );
            err.status = 404;
            err.body = {
              code: 'not_found',
              message: `Task with ID "${record_id}" not found.`,
            };
            throw err; // dispatcher should mark isError=true
          }
          // Map specific 400 errors for task ID validation to clearer messages
          /**
           * **Type Safety**: Using ApiErrorWithResponse interface instead of inline any casting
           * to provide proper type checking while maintaining flexibility for error handling.
           */
          const apiErr = error as ApiErrorWithResponse;
          const status = apiErr?.response?.status ?? apiErr?.status;
          const errorMessage = (
            apiErr?.response?.data?.message ??
            apiErr?.message ??
            ''
          )
            .toString()
            .toLowerCase();

          if (status === 400) {
            // Only map task_id related 400 errors to avoid masking other validation issues
            if (
              errorMessage.includes('task_id') ||
              errorMessage.includes('invalid task') ||
              errorMessage.includes('malformed')
            ) {
              // Throw a plain Error so the MCP wrapper surfaces the message text (matches test regex)
              throw new Error(`Invalid request to delete task ${record_id}`);
            }
            // For other 400 errors, preserve original error to maintain validation visibility
            debug(
              'UniversalDeleteService',
              `Preserving 400 error for task deletion (not task_id related): ${errorMessage}`
            );
          }
          throw error;
        }

      case UniversalResourceType.NOTES: {
        const result = await deleteNote(record_id);
        return { success: result.success, record_id };
      }

      default:
        throw new Error(
          `Unsupported resource type for delete: ${resource_type}`
        );
    }
  }
}
