/**
 * UniversalUpdateService - Centralized record update operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal update functionality across all resource types.
 *
 * ENVIRONMENT VARIABLES (Runtime Behavior Configuration):
 *
 * @env ENABLE_ENHANCED_VALIDATION - Enable additional validation checks (default: false)
 *      Values: "true" | "false" | undefined
 *      Example: ENABLE_ENHANCED_VALIDATION="true"
 *      Impact: Adds extra field validation before API calls
 *      Production Risk: May reject previously valid requests
 *
 * @env ENABLE_FIELD_VERIFICATION - Enable post-update field verification (default: true)
 *      Values: "true" | "false" | undefined
 *      Example: ENABLE_FIELD_VERIFICATION="false"
 *      Impact: Skips verification that fields were persisted correctly
 *      Production Risk: Silent data consistency issues if disabled
 *
 * @env STRICT_FIELD_VALIDATION - Fail operations on verification failures (default: false)
 *      Values: "true" | "false" | undefined
 *      Example: STRICT_FIELD_VALIDATION="true"
 *      Impact: Throws errors when field verification fails instead of logging warnings
 *      Production Risk: Operations may fail that previously succeeded with warnings
 *
 * PRODUCTION SAFETY NOTES:
 * - These environment variables significantly change runtime behavior
 * - Test thoroughly in staging before changing production values
 * - Monitor error rates and data consistency when changing validation settings
 * - Consider gradual rollout with feature flags for validation strictness changes
 * - Document all environment variable usage in deployment runbooks
 */

import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import type { UniversalUpdateParams } from '@/handlers/tool-configs/universal/types.js';
import {
  isAttioList,
  isAttioRecord,
  type UniversalRecord,
} from '@/types/attio.js';
import {
  UniversalValidationError,
  ErrorType,
} from '@/handlers/tool-configs/universal/schemas.js';
import { debug, error as logError } from '@/utils/logger.js';

// Import shared type definitions for better type safety
import {
  createNotFoundError,
  type DataPayload,
  isAttributeObject,
} from '@/types/universal-service-types.js';

// Import services
import { ValidationService } from '@/services/ValidationService.js';

/**
 * Update metadata containing warnings, suggestions, and field verification results
 *
 * Renamed from ValidationResult to avoid confusion with:
 * - FieldValidationHandler.ValidationResult (pre-update validation)
 * - FieldPersistenceHandler.VerificationResult (post-update verification)
 *
 * @see Issue #984 extension - Verification API unification
 */
export interface UpdateMetadata {
  warnings: string[];
  actualValues: Record<string, unknown>;
  suggestions: string[];
  /** Field verification details (Issue #984 extension) */
  fieldVerification?: {
    verified: boolean;
    discrepancies: string[];
  };
}

/**
 * Enhanced update result that includes update metadata
 */
export interface EnhancedUpdateResult {
  record: UniversalRecord;
  validation: UpdateMetadata;
}

// Import field mapping utilities
import {
  mapRecordFields,
  validateResourceType,
  validateFields,
  getValidResourceTypes,
  mapTaskFields,
} from '@/handlers/tool-configs/universal/field-mapper.js';

// Import validation utilities
import { validateRecordFields } from '@/utils/validation-utils.js';

// Note: Deal defaults configuration removed as unused in update service

// Note: Removed unused resource-specific function imports as service now uses strategy pattern

/**
 * UniversalUpdateService provides centralized record update functionality
 *
 * **Type Safety Enhancements**: This service uses Record<string, unknown> instead of any
 * for better type safety. This provides compile-time checking while allowing dynamic
 * property access needed for flexible API data handling.
 *
 * **Design Rationale**: Record<string, unknown> prevents accidental misuse of properties
 * while maintaining the flexibility required for varied API response structures.
 */
export class UniversalUpdateService {
  /**
   * Enhanced update method that returns validation metadata
   */
  static async updateRecordWithValidation(
    params: UniversalUpdateParams
  ): Promise<EnhancedUpdateResult> {
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
      return await this._updateRecordInternalWithValidation(params);
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
          // Using shared error creation utility for consistency
          throw createNotFoundError(resource_type, record_id);
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
          // Using shared error creation utility for consistency
          throw createNotFoundError(resource_type, record_id);
        }
      }

      // Re-throw all other errors with cause preserved
      throw error;
    }
  }

  static async updateRecord(
    params: UniversalUpdateParams
  ): Promise<UniversalRecord> {
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
          // Using shared error creation utility for consistency
          throw createNotFoundError(resource_type, record_id);
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
          // Using shared error creation utility for consistency
          throw createNotFoundError(resource_type, record_id);
        }
      }

      // Re-throw all other errors with cause preserved
      throw error;
    }
  }

  /**
   * Internal update record implementation with validation tracking
   */
  private static async _updateRecordInternalWithValidation(
    params: UniversalUpdateParams
  ): Promise<EnhancedUpdateResult> {
    const validationResult: UpdateMetadata = {
      warnings: [],
      actualValues: {},
      suggestions: [],
    };

    const { resource_type, record_id, record_data } = params;

    // Handle edge case where test uses 'data' instead of 'record_data'
    /**
     * **Type Safety Note**: Using structured types instead of unknown casting
     * to handle legacy parameter formats while maintaining type safety.
     */
    type ParamsWithLegacy = { data?: Record<string, unknown> };
    const legacyData = (params as ParamsWithLegacy).data;
    const actualRecordData = (record_data ?? legacyData) as
      | DataPayload
      | undefined;

    // Enhanced null-safety: Guard against undefined values access
    /**
     * **Record<string, unknown> Rationale**: Using Record<string, unknown> instead of any
     * ensures type safety while allowing dynamic property access for API data structures.
     * This prevents runtime errors while maintaining flexibility for varied data formats.
     */
    const raw: Record<string, unknown> =
      actualRecordData && typeof actualRecordData === 'object'
        ? actualRecordData
        : {};
    const values = raw.values ?? raw;

    // Pre-validate fields and provide helpful suggestions (less strict for updates)
    const fieldValidation = validateFields(
      resource_type,
      values as Record<string, unknown>
    );
    if (fieldValidation.warnings.length > 0) {
      validationResult.warnings.push(...fieldValidation.warnings);
      // Use structured logging for field validation warnings
      debug('UniversalUpdateService', 'Field validation warnings', {
        warnings: fieldValidation.warnings.join('\n'),
      });
    }
    if (fieldValidation.suggestions.length > 0) {
      validationResult.suggestions.push(...fieldValidation.suggestions);
      const truncated = ValidationService.truncateSuggestions(
        fieldValidation.suggestions
      );
      debug('UniversalUpdateService', 'Field suggestions:', {
        suggestions: truncated.join('\n'),
      });
    }

    // Apply deal-specific validation for deals
    if (resource_type === UniversalResourceType.DEALS) {
      try {
        const { applyDealDefaultsWithValidation } =
          await import('@/config/deal-defaults.js');

        const dealValidation = await applyDealDefaultsWithValidation(
          values as Record<string, unknown>,
          false // Don't skip API validation for user requests
        );

        // Update values with validated deal data
        Object.assign(values, dealValidation.dealData);

        // Collect deal-specific warnings and suggestions
        validationResult.warnings.push(...dealValidation.warnings);
        validationResult.suggestions.push(...dealValidation.suggestions);

        debug('UniversalUpdateService', 'Deal validation applied', {
          warnings: dealValidation.warnings,
          suggestions: dealValidation.suggestions,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        validationResult.warnings.push(
          `Deal validation warning: ${errorMessage}`
        );
        debug('UniversalUpdateService', 'Deal validation failed', {
          error: errorMessage,
        });
      }
    }

    // Continue with the rest of the update process using existing logic
    // Skip verification in _updateRecordInternal to avoid duplication
    const record = await this._updateRecordInternal(params, true);

    // Store actual values for comparison
    validationResult.actualValues = this.extractActualValues(record);

    // Capture field persistence verification warnings if enabled
    if (process.env.ENABLE_FIELD_VERIFICATION !== 'false') {
      try {
        // Reconstruct sanitized data for verification
        const { mapped: mappedData } = await mapRecordFields(
          resource_type,
          values as Record<string, unknown>
        );
        const attioPayload = { values: mappedData };
        const { UpdateValidation } =
          await import('@/services/update/UpdateValidation.js');
        const { FieldPersistenceHandler } =
          await import('@/services/update/FieldPersistenceHandler.js');
        const sanitizedData = UpdateValidation.sanitizeSpecialCharacters(
          attioPayload.values
        );

        // UNIFIED: Single call to FieldPersistenceHandler (Issue #984 extension)
        // Eliminates duplicate semantic filtering logic by using shared implementation
        const verification = await FieldPersistenceHandler.verifyPersistence(
          resource_type,
          record_id,
          sanitizedData,
          validationResult.actualValues, // Pass actual values from line 326
          {
            strict: process.env.STRICT_FIELD_VALIDATION === 'true',
            skip: false,
          }
        );

        // Surface complete VerificationResult into validationResult
        validationResult.warnings.push(...verification.warnings);
        validationResult.fieldVerification = {
          verified: verification.verified,
          discrepancies: verification.discrepancies,
        };

        // Also add discrepancies as warnings for backward compatibility
        if (verification.discrepancies.length > 0) {
          validationResult.warnings.push(
            ...verification.discrepancies.map(
              (discrepancy) => `Field persistence issue: ${discrepancy}`
            )
          );
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        validationResult.warnings.push(
          `Field verification warning: ${errorMessage}`
        );
      }
    }

    return {
      record,
      validation: validationResult,
    };
  }

  /**
   * Internal update record implementation
   */
  private static async _updateRecordInternal(
    params: UniversalUpdateParams,
    skipVerification: boolean = false
  ): Promise<UniversalRecord> {
    const { resource_type, record_id, record_data } = params;

    // Handle edge case where test uses 'data' instead of 'record_data'
    /**
     * **Type Safety Note**: Using structured types instead of unknown casting
     * to handle legacy parameter formats while maintaining type safety.
     */
    type ParamsWithLegacy = { data?: Record<string, unknown> };
    const legacyData = (params as ParamsWithLegacy).data;
    const actualRecordData = (record_data ?? legacyData) as
      | DataPayload
      | undefined;

    // Enhanced null-safety: Guard against undefined values access
    /**
     * **Record<string, unknown> Rationale**: Using Record<string, unknown> instead of any
     * ensures type safety while allowing dynamic property access for API data structures.
     * This prevents runtime errors while maintaining flexibility for varied data formats.
     */
    const raw: Record<string, unknown> =
      actualRecordData && typeof actualRecordData === 'object'
        ? actualRecordData
        : {};
    const values = raw.values ?? raw;

    // Pre-validate fields and provide helpful suggestions (less strict for updates)
    const fieldValidation = validateFields(
      resource_type,
      values as Record<string, unknown>
    );
    if (fieldValidation.warnings.length > 0) {
      // Use structured logging for field validation warnings
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

    // Issue #984: Fetch metadata once using MetadataResolver
    const { MetadataResolver } =
      await import('@/services/update/MetadataResolver.js');
    const { metadataMap, availableAttributes } =
      await MetadataResolver.fetchMetadata(resource_type, actualRecordData);

    // Map field names to correct ones with collision detection
    const mappingResult = await mapRecordFields(
      resource_type,
      values as Record<string, unknown>,
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
    const { normalizeValues } =
      await import('@/services/normalizers/AttributeAwareNormalizer.js');
    attioPayload.values = await normalizeValues(
      resource_type,
      attioPayload.values,
      availableAttributes
    );

    // Sanitize special characters while preserving intended content
    const { UpdateValidation } =
      await import('@/services/update/UpdateValidation.js');
    const sanitizedData = UpdateValidation.sanitizeSpecialCharacters(
      attioPayload.values
    );
    attioPayload.values = sanitizedData;

    // Optional enhanced validation
    // WARNING: This environment variable changes runtime behavior
    // Production Impact: May reject previously valid requests
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

    // FEATURE: Auto-transform values for Issue #980 UX improvements
    // Transforms: status titles → {status_id: uuid}, single values → arrays for multi-select
    try {
      const { transformRecordValues, mayNeedTransformation } =
        await import('@/services/value-transformer/index.js');

      // Quick check to avoid unnecessary async work
      if (
        mayNeedTransformation(
          attioPayload.values as Record<string, unknown>,
          resource_type
        )
      ) {
        const transformResult = await transformRecordValues(
          attioPayload.values as Record<string, unknown>,
          {
            resourceType: resource_type,
            operation: 'update',
            recordId: record_id,
            // Issue #984: Pass metadata to avoid duplicate fetch
            attributeMetadata: metadataMap,
          }
        );

        attioPayload.values = transformResult.data;

        // Log transformations for debugging
        if (transformResult.transformations.length > 0) {
          debug('UniversalUpdateService', 'Value transformations applied', {
            transformations: transformResult.transformations.map((t) => ({
              field: t.field,
              type: t.type,
            })),
          });
        }

        if (transformResult.warnings.length > 0) {
          debug('UniversalUpdateService', 'Value transformation warnings', {
            warnings: transformResult.warnings,
          });
        }
      }
    } catch (transformError) {
      // If transformation throws (e.g., invalid status value), propagate the error
      if (transformError instanceof Error) {
        throw new UniversalValidationError(
          transformError.message,
          ErrorType.USER_ERROR,
          {
            suggestion:
              'Check that field values match the expected format. Use records_get_attribute_options to see valid options.',
            field: undefined,
            cause: undefined,
          }
        );
      }
      throw transformError;
    }

    // Capture post-transform data for verification (PR #981 review feedback)
    // This ensures verification compares what was actually sent to API
    const dataForVerification = { ...attioPayload.values };

    // Issue #984: Use UpdateOrchestrator for strategy dispatch
    const { UpdateOrchestrator } =
      await import('@/services/update/UpdateOrchestrator.js');

    // Use centralized object slug extraction (fixes DEALS slug inconsistency)
    // MetadataResolver already imported at line 468
    const objectSlug = MetadataResolver.extractObjectSlug(
      resource_type,
      actualRecordData
    );

    const updatedRecord = await UpdateOrchestrator.executeUpdate({
      resourceType: resource_type,
      recordId: record_id,
      sanitizedValues: attioPayload.values,
      objectSlug,
    });

    const { ResponseNormalizer } =
      await import('@/services/update/ResponseNormalizer.js');
    const normalizedRecord = ResponseNormalizer.normalizeResponseFormat(
      resource_type,
      updatedRecord
    );

    // Issue #984: Use FieldPersistenceHandler for verification
    if (!skipVerification) {
      const { FieldPersistenceHandler } =
        await import('@/services/update/FieldPersistenceHandler.js');
      await FieldPersistenceHandler.verifyPersistence(
        resource_type,
        record_id,
        dataForVerification,
        this.extractActualValues(normalizedRecord),
        { strict: false }
      );
    }

    return normalizedRecord;
  }

  private static async handleUnsupportedResourceType(
    resource_type: string,
    params: UniversalUpdateParams
  ): Promise<UniversalRecord> {
    // Check if resource type can be corrected
    const resourceValidation = validateResourceType(resource_type);
    if (resourceValidation.corrected) {
      // Retry with corrected resource type
      debug('UniversalUpdateService', `Resource type corrected`, {
        from: resource_type,
        to: resourceValidation.corrected,
      });
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

  private static extractActualValues(
    record: UniversalRecord
  ): Record<string, unknown> {
    if (isAttioRecord(record)) {
      return record.values || {};
    }

    if (isAttioList(record)) {
      return {
        name: record.name || record.title,
        title: record.title,
        description: record.description,
        object_slug: record.object_slug,
        workspace_id: record.workspace_id,
        created_at: record.created_at,
        updated_at: record.updated_at,
        entry_count: record.entry_count,
      };
    }

    return {};
  }
}
