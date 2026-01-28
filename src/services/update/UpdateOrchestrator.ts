/**
 * UpdateOrchestrator - Strategy pattern orchestration for updates
 *
 * Extracted from UniversalUpdateService to separate concerns.
 * Delegates to resource-specific update strategies.
 *
 * @see Issue #984 - Modularize UniversalUpdateService (831→220 lines)
 */

import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import type { UniversalRecord } from '@/types/attio.js';
import { debug } from '@/utils/logger.js';

/**
 * Context for update orchestration
 */
export interface UpdateContext {
  /** Resource type being updated */
  resourceType: UniversalResourceType;
  /** ID of the record to update */
  recordId: string;
  /** Sanitized values to update */
  sanitizedValues: Record<string, unknown>;
  /** Optional object slug for records/deals */
  objectSlug?: string;
}

/**
 * UpdateOrchestrator - Delegates updates to resource-specific strategies
 */
export class UpdateOrchestrator {
  /**
   * Dispatch update to appropriate strategy based on resource type
   *
   * @param context - Update context with resource type, record ID, values, and options
   * @returns Updated record from Attio API
   * @throws Error if resource type is unsupported
   */
  static async executeUpdate(context: UpdateContext): Promise<UniversalRecord> {
    const { resourceType, recordId, sanitizedValues, objectSlug } = context;

    debug('UpdateOrchestrator', 'Dispatching update', {
      resourceType,
      recordId,
      objectSlug,
      fieldCount: Object.keys(sanitizedValues).length,
    });

    switch (resourceType) {
      case UniversalResourceType.COMPANIES: {
        const { CompanyUpdateStrategy } =
          await import('@/services/update/strategies/CompanyUpdateStrategy.js');
        return new CompanyUpdateStrategy().update(
          recordId,
          sanitizedValues,
          resourceType
        );
      }

      case UniversalResourceType.LISTS: {
        const { ListUpdateStrategy } =
          await import('@/services/update/strategies/ListUpdateStrategy.js');
        return new ListUpdateStrategy().update(
          recordId,
          sanitizedValues,
          resourceType
        );
      }

      case UniversalResourceType.PEOPLE: {
        const { PersonUpdateStrategy } =
          await import('@/services/update/strategies/PersonUpdateStrategy.js');
        return new PersonUpdateStrategy().update(
          recordId,
          sanitizedValues,
          resourceType
        );
      }

      case UniversalResourceType.RECORDS:
      case UniversalResourceType.DEALS: {
        const { RecordUpdateStrategy } =
          await import('@/services/update/strategies/RecordUpdateStrategy.js');
        return new RecordUpdateStrategy().update(
          recordId,
          sanitizedValues,
          resourceType,
          { objectSlug: objectSlug || 'records' }
        );
      }

      case UniversalResourceType.TASKS: {
        const { TaskUpdateStrategy } =
          await import('@/services/update/strategies/TaskUpdateStrategy.js');
        return new TaskUpdateStrategy().update(
          recordId,
          sanitizedValues,
          resourceType
        );
      }

      default: {
        throw new Error(
          `Unsupported resource type for update: ${resourceType}`
        );
      }
    }
  }
}
