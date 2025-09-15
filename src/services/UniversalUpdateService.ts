/**
 * UniversalUpdateService - Centralized record update operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal update functionality across all resource types.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalUpdateParams } from '../handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../types/attio.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../handlers/tool-configs/universal/schemas.js';
import { FilterValidationError } from '../errors/api-errors.js';
import { debug, error as logError } from '../utils/logger.js';

// Import services
import { ValidationService } from './ValidationService.js';
import { UniversalUtilityService } from './UniversalUtilityService.js';
import { getCreateService, shouldUseMockData } from './create/index.js';

// Import field mapping utilities
import {
  mapRecordFields,
  validateResourceType,
  getFieldSuggestions,
  validateFields,
  getValidResourceTypes,
  mapTaskFields,
} from '../handlers/tool-configs/universal/field-mapper.js';

// Import validation utilities
import { validateRecordFields } from '../utils/validation-utils.js';

// Import deal defaults configuration
import { applyDealDefaultsWithValidation } from '../config/deal-defaults.js';

// Import resource-specific update functions
import { updateCompany } from '../objects/companies/index.js';
import { updateList } from '../objects/lists.js';
import { updatePerson } from '../objects/people-write.js';
import { updateObjectRecord } from '../objects/records/index.js';

// Import resource-specific get functions for field persistence verification
import { getCompanyDetails } from '../objects/companies/index.js';
import { getListDetails } from '../objects/lists.js';
import { getPersonDetails } from '../objects/people/basic.js';
import { getObjectRecord } from '../objects/records/index.js';
import { getTask } from '../objects/tasks.js';

/**
 * Task update with mock support - uses production MockService
 * Moved to production-side service to avoid test directory imports (Issue #489 Phase 1)
 */
async function updateTaskWithMockSupport(
  taskId: string,
  updateData: Record<string, unknown>
): Promise<AttioRecord> {
  // Prefer mock path whenever mock/offline data is enabled to allow Vitest spies
  // to intercept MockService.updateTask even if E2E_MODE is set in tests.
  if (
    shouldUseMockData() ||
    process.env.VITEST === 'true' ||
    process.env.NODE_ENV === 'test'
  ) {
    const { MockService } = await import('./MockService.js');
    return await MockService.updateTask(taskId, updateData);
  }
  // Otherwise, defer to the real/factory-backed service
  const service = getCreateService();
  return await service.updateTask(taskId, updateData);
}

/**
 * UniversalUpdateService provides centralized record update functionality
 */
export class UniversalUpdateService {
  static async updateRecord(
    params: UniversalUpdateParams
  ): Promise<AttioRecord> {
    // Validate resource type is supported
    const validResourceTypes = Object.values(UniversalResourceType);
    if (!validResourceTypes.includes(params.resource_type)) {
      throw new UniversalValidationError(
        `Unsupported resource type: ${params.resource_type}`,
        ErrorType.USER_ERROR,
        {
          field: 'resource_type',
          suggestion: `Valid resource types are: ${validResourceTypes.join(
            ', '
          )}`,
        }
      );
    }

    try {
      return await this._updateRecordInternal(params);
    } catch (error: unknown) {
      // Check if this is already a structured HTTP response - if so, pass it through unchanged
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        'body' in error
      ) {
        throw error; // Pass through HTTP-like errors unchanged
      }

      // Handle TypeError exceptions that occur from malformed data
      if (
        error instanceof TypeError &&
        error.message.includes('Cannot read properties of undefined')
      ) {
        // For TypeErrors caused by malformed data structure, return 404 for tasks
        const { resource_type, record_id } = params;
        if (resource_type === UniversalResourceType.TASKS) {
          throw {
            status: 404,
            body: {
              code: 'not_found',
              message: `Task record with ID "${record_id}" not found.`,
            },
          };
        }
      }

      // Also handle wrapped TypeErrors from MockService
      if (
        error instanceof Error &&
        error.message.includes(
          'Failed to update task: Cannot read properties of undefined'
        )
      ) {
        const { resource_type, record_id } = params;
        if (resource_type === UniversalResourceType.TASKS) {
          throw {
            status: 404,
            body: {
              code: 'not_found',
              message: `Task record with ID "${record_id}" not found.`,
            },
          };
        }
      }

      // Re-throw all other errors with cause preserved
      throw error;
    }
  }

  /**
   * Internal update record implementation
   */
  private static async _updateRecordInternal(
    params: UniversalUpdateParams
  ): Promise<AttioRecord> {
    const { resource_type, record_id, record_data } = params;

    // Handle edge case where test uses 'data' instead of 'record_data'
    type ParamsWithLegacy = { data?: unknown };
    const legacyData = (params as ParamsWithLegacy).data as
      | Record<string, unknown>
      | undefined;
    const actualRecordData = (record_data ?? legacyData) as
      | Record<string, unknown>
      | undefined;

    // Enhanced null-safety: Guard against undefined values access
    const raw =
      actualRecordData && typeof actualRecordData === 'object'
        ? (actualRecordData as any)
        : {};
    const values = raw.values ?? raw;

    // Pre-validate fields and provide helpful suggestions (less strict for updates)
    const fieldValidation = validateFields(resource_type, values);
    if (fieldValidation.warnings.length > 0) {
      // Intentionally keep a console.warn for test expectations; mirror to logger.debug
      // eslint-disable-next-line no-console
      console.warn(
        'Field validation warnings:',
        fieldValidation.warnings.join('\n')
      );
      debug('UniversalUpdateService', 'Field validation warnings', {
        warnings: fieldValidation.warnings.join('\n'),
      });
    }
    if (fieldValidation.suggestions.length > 0) {
      const truncated = ValidationService.truncateSuggestions(
        fieldValidation.suggestions
      );
      debug('UniversalUpdateService', 'Field suggestions:', {
        suggestions: truncated.join('\n'),
      });
    }

    // Fetch available attributes for attribute-aware mapping (optional; best-effort)
    let availableAttributes: string[] | undefined;
    try {
      const { UniversalMetadataService } = await import(
        './UniversalMetadataService.js'
      );
      const options =
        resource_type === UniversalResourceType.RECORDS
          ? {
              objectSlug:
                (actualRecordData?.object as string) ||
                (actualRecordData?.object_api_slug as string) ||
                'records',
            }
          : resource_type === UniversalResourceType.DEALS
            ? { objectSlug: 'deals' }
            : undefined;
      const attributeResult =
        await UniversalMetadataService.discoverAttributesForResourceType(
          resource_type,
          options
        );
      const attrs = (attributeResult?.attributes as any[]) ?? [];
      availableAttributes = Array.from(
        new Set(
          attrs.flatMap((a) =>
            [a?.api_slug, a?.title, a?.name].filter(
              (s: any) => typeof s === 'string'
            )
          )
        )
      ).map((s) => (s as string).toLowerCase());
    } catch (error) {
      debug('UniversalUpdateService', 'Failed to fetch attributes', {
        resource_type,
        error: error instanceof Error ? error.message : String(error),
      });
      availableAttributes = undefined;
    }

    // Map field names to correct ones with collision detection
    const mappingResult = await mapRecordFields(
      resource_type,
      values,
      availableAttributes
    );
    if (mappingResult.errors && mappingResult.errors.length > 0) {
      throw new UniversalValidationError(
        mappingResult.errors.join(' '),
        ErrorType.USER_ERROR,
        {
          field: 'record_data',
          suggestion:
            'Please use only one field for each target. Multiple aliases mapping to the same field are not allowed.',
          cause: undefined, // No specific cause for mapping errors
        }
      );
    }

    const { mapped: mappedData, warnings } = mappingResult;
    if (warnings.length > 0) {
      debug('UniversalUpdateService', 'Field mapping applied:', {
        warnings: warnings.join('\n'),
      });
    }

    // Always wrap in Attio envelope format
    const attioPayload: { values: Record<string, unknown> } = {
      values: mappedData,
    };

    // Apply operation-specific field mapping for tasks (prevent content injection on update)
    if (resource_type === UniversalResourceType.TASKS) {
      const updatedTaskData = mapTaskFields('update', mappedData);
      attioPayload.values = updatedTaskData;
    }

    // Normalize values (e.g., phone numbers to E.164)
    const { normalizeValues } = await import(
      './normalizers/AttributeAwareNormalizer.js'
    );
    attioPayload.values = await normalizeValues(
      resource_type,
      attioPayload.values,
      availableAttributes
    );

    // Sanitize special characters while preserving intended content
    const { UpdateValidation } = await import('./update/UpdateValidation.js');
    const sanitizedData = UpdateValidation.sanitizeSpecialCharacters(
      attioPayload.values
    );
    attioPayload.values = sanitizedData;

    // Optional enhanced validation
    if (process.env.ENABLE_ENHANCED_VALIDATION === 'true') {
      const validation = await validateRecordFields(
        resource_type,
        attioPayload.values as Record<string, unknown>,
        false
      );
      if (!validation.isValid) {
        const errorMessage = validation.error || 'Validation failed';
        throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
          suggestion: 'Please fix the validation errors and try again.',
          field: undefined,
          cause: undefined, // No specific cause for validation errors
        });
      }
    }

    let updatedRecord: AttioRecord;

    switch (resource_type) {
      case UniversalResourceType.COMPANIES: {
        const { CompanyUpdateStrategy } = await import(
          './update/strategies/CompanyUpdateStrategy.js'
        );
        const strategy = new CompanyUpdateStrategy();
        updatedRecord = await strategy.update(
          record_id,
          attioPayload.values,
          resource_type
        );
        break;
      }
      case UniversalResourceType.LISTS: {
        const { ListUpdateStrategy } = await import(
          './update/strategies/ListUpdateStrategy.js'
        );
        const strategy = new ListUpdateStrategy();
        updatedRecord = await strategy.update(
          record_id,
          attioPayload.values,
          resource_type
        );
        break;
      }
      case UniversalResourceType.PEOPLE: {
        const { PersonUpdateStrategy } = await import(
          './update/strategies/PersonUpdateStrategy.js'
        );
        const strategy = new PersonUpdateStrategy();
        updatedRecord = await strategy.update(
          record_id,
          attioPayload.values,
          resource_type
        );
        break;
      }
      case UniversalResourceType.RECORDS:
      case UniversalResourceType.DEALS: {
        const { RecordUpdateStrategy } = await import(
          './update/strategies/RecordUpdateStrategy.js'
        );
        const strategy = new RecordUpdateStrategy();
        const recordsObjectSlug =
          (actualRecordData?.object as string) ||
          (actualRecordData?.object_api_slug as string) ||
          'records';
        updatedRecord = await strategy.update(
          record_id,
          attioPayload.values,
          resource_type,
          { objectSlug: recordsObjectSlug }
        );
        break;
      }
      case UniversalResourceType.TASKS: {
        const { TaskUpdateStrategy } = await import(
          './update/strategies/TaskUpdateStrategy.js'
        );
        const strategy = new TaskUpdateStrategy();
        updatedRecord = await strategy.update(
          record_id,
          attioPayload.values,
          resource_type
        );
        break;
      }
      default: {
        updatedRecord = await this.handleUnsupportedResourceType(
          resource_type as unknown as string,
          params
        );
        break;
      }
    }

    const { ResponseNormalizer } = await import(
      './update/ResponseNormalizer.js'
    );
    const normalizedRecord = ResponseNormalizer.normalizeResponseFormat(
      resource_type,
      updatedRecord
    );

    if (process.env.ENABLE_FIELD_VERIFICATION !== 'false') {
      try {
        const verification = await UpdateValidation.verifyFieldPersistence(
          resource_type,
          record_id,
          sanitizedData,
          normalizedRecord
        );
        if (verification.warnings.length > 0) {
          logError(
            'UniversalUpdateService',
            `Field persistence warnings for ${resource_type} ${record_id}:`,
            verification.warnings
          );
        }
        if (!verification.verified) {
          // Intentionally keep a console.warn for test expectations; mirror to logger.error
          // eslint-disable-next-line no-console
          console.warn(
            `Field persistence verification failed for ${resource_type} ${record_id}:`,
            verification.discrepancies
          );
          logError(
            'UniversalUpdateService',
            'Field persistence verification failed',
            new Error('Verification failed'),
            { discrepancies: verification.discrepancies }
          );
        }
      } catch (error: unknown) {
        logError('UniversalUpdateService', 'Field persistence verification error', error);
      }
    }

    return normalizedRecord;
  }

  private static async handleUnsupportedResourceType(
    resource_type: string,
    params: UniversalUpdateParams
  ): Promise<AttioRecord> {
    // Check if resource type can be corrected
    const resourceValidation = validateResourceType(resource_type);
    if (resourceValidation.corrected) {
      // Retry with corrected resource type
      debug(
        'UniversalUpdateService',
        `Resource type corrected`,
        { from: resource_type, to: resourceValidation.corrected }
      );
      return this.updateRecord({
        ...params,
        resource_type: resourceValidation.corrected,
      });
    }
    throw new UniversalValidationError(
      `Unsupported resource type: ${resource_type}`,
      ErrorType.USER_ERROR,
      {
        suggestion:
          resourceValidation.suggestion ||
          `Valid resource types are: ${getValidResourceTypes()}`,
      }
    );
  }
}
