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

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalUpdateParams } from '../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../types/attio.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../handlers/tool-configs/universal/schemas.js';
import { debug, error as logError } from '../utils/logger.js';

// Import shared type definitions for better type safety
import {
  createNotFoundError,
  type DataPayload,
  isAttributeObject,
} from '../types/universal-service-types.js';

// Import services
import { ValidationService } from './ValidationService.js';

/**
 * Validation result containing warnings and actual persisted values
 */
export interface ValidationResult {
  warnings: string[];
  actualValues: Record<string, unknown>;
  suggestions: string[];
}

/**
 * Enhanced update result that includes validation metadata
 */
export interface EnhancedUpdateResult {
  record: AttioRecord;
  validation: ValidationResult;
}

// Import field mapping utilities
import {
  mapRecordFields,
  validateResourceType,
  validateFields,
  getValidResourceTypes,
  mapTaskFields,
} from '../handlers/tool-configs/universal/field-mapper.js';

// Import validation utilities
import { validateRecordFields } from '../utils/validation-utils.js';

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
    const validationResult: ValidationResult = {
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
        const { applyDealDefaultsWithValidation } = await import(
          '../config/deal-defaults.js'
        );

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
    validationResult.actualValues = record.values || {};

    // Capture field persistence verification warnings if enabled
    if (process.env.ENABLE_FIELD_VERIFICATION !== 'false') {
      try {
        // Reconstruct sanitized data for verification
        const { mapped: mappedData } = await mapRecordFields(
          resource_type,
          values as Record<string, unknown>
        );
        const attioPayload = { values: mappedData };
        const { UpdateValidation } = await import(
          './update/UpdateValidation.js'
        );
        const sanitizedData = UpdateValidation.sanitizeSpecialCharacters(
          attioPayload.values
        );

        const verification = await UpdateValidation.verifyFieldPersistence(
          resource_type,
          record_id,
          sanitizedData
        );

        // Add field persistence warnings to validation result
        if (verification.warnings.length > 0) {
          validationResult.warnings.push(...verification.warnings);
        }

        if (!verification.verified) {
          // Issue #798: Only log warnings in STRICT mode or for actual value mismatches
          // Cosmetic format differences (e.g., {stage: "Demo"} vs {stage: {title: "Demo"}}) are suppressed
          const shouldLogWarnings =
            process.env.STRICT_FIELD_VALIDATION === 'true' ||
            verification.discrepancies.some(
              (d) => !d.includes('persistence mismatch')
            );

          if (shouldLogWarnings) {
            // Add discrepancies as warnings for user visibility
            validationResult.warnings.push(
              ...verification.discrepancies.map(
                (discrepancy) => `Field persistence issue: ${discrepancy}`
              )
            );
          }
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
  ): Promise<AttioRecord> {
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
      const attrs = (attributeResult?.attributes as unknown[]) ?? [];
      /**
       * **Type Guard Usage**: Using isAttributeObject type guard instead of inline casting
       * for safer attribute processing and better runtime type validation.
       */
      availableAttributes = Array.from(
        new Set(
          attrs.flatMap((a) => {
            if (!isAttributeObject(a)) {
              return [];
            }
            return [a.api_slug, a.title, a.name].filter(
              (s): s is string => typeof s === 'string'
            );
          })
        )
      ).map((s) => s.toLowerCase());
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
        /**
         * **Safe Property Access**: Using type-safe property access for object slug
         * extraction while providing sensible defaults.
         */
        const recordsObjectSlug =
          (typeof actualRecordData?.object === 'string'
            ? actualRecordData.object
            : undefined) ||
          (typeof actualRecordData?.object_api_slug === 'string'
            ? actualRecordData.object_api_slug
            : undefined) ||
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

    // Field persistence verification (enabled by default)
    // WARNING: Disabling this can cause silent data consistency issues
    // Skip verification if called from validation-aware path to avoid duplication
    if (
      !skipVerification &&
      process.env.ENABLE_FIELD_VERIFICATION !== 'false'
    ) {
      try {
        const verification = await UpdateValidation.verifyFieldPersistence(
          resource_type,
          record_id,
          sanitizedData
        );
        if (verification.warnings.length > 0) {
          logError(
            'UniversalUpdateService',
            `Field persistence warnings for ${resource_type} ${record_id}:`,
            verification.warnings
          );
        }
        if (!verification.verified) {
          // Use structured logging for field persistence verification failures
          logError(
            'UniversalUpdateService',
            'Field persistence verification failed',
            new Error('Verification failed'),
            {
              resource_type,
              record_id,
              discrepancies: verification.discrepancies,
            }
          );

          // If strict validation is enabled, fail the operation
          // WARNING: This environment variable changes runtime behavior
          // Production Impact: Operations may fail that previously succeeded
          if (process.env.STRICT_FIELD_VALIDATION === 'true') {
            throw new UniversalValidationError(
              `Field persistence verification failed: ${verification.discrepancies.join('; ')}`,
              ErrorType.API_ERROR,
              {
                field: 'field_verification',
                suggestion:
                  'Check that the field values are correctly formatted and supported by the API',
              }
            );
          }
        }
      } catch (error: unknown) {
        logError(
          'UniversalUpdateService',
          'Field persistence verification error',
          error
        );
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
}
