/**
 * UniversalCreateService - Centralized record creation operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal create functionality across all resource types with enhanced validation and error handling.
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import type { UniversalCreateParams } from '../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../types/attio.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../handlers/tool-configs/universal/schemas.js';

// Import services
import { ValidationService } from './ValidationService.js';

// Import field mapping utilities
import {
  mapRecordFields,
  validateResourceType,
  getFieldSuggestions,
  validateFields,
  getValidResourceTypes,
  FIELD_MAPPINGS,
} from '../handlers/tool-configs/universal/field-mapper.js';

// Import validation utilities
import { validateRecordFields } from '../utils/validation-utils.js';

// Import format helpers
// Attribute format conversions are handled within create strategies

// (Deal defaults are handled within the DealCreateStrategy)

// Import people normalization utilities
// People normalization handled in PersonCreateStrategy

// Import enhanced error handling
// Enhanced API error helpers are used within strategies

// Import logging utilities
import { OperationType, createScopedLogger } from '../utils/logger.js';

// Import constants for better maintainability
import {
  ERROR_MESSAGES,
  MAX_VALIDATION_SUGGESTIONS,
  MAX_SUGGESTION_TEXT_LENGTH,
} from '../constants/universal.constants.js';

// Import enhanced types for better type safety
//
import {
  createEnhancedValidationError,
  createFieldCollisionError,
} from './create/helpers/ErrorHelpers.js';
import { ErrorCategory } from './create/helpers/ErrorHelpers.js';

// Create scoped logger for this service
const logger = createScopedLogger(
  'UniversalCreateService',
  undefined,
  OperationType.TOOL_EXECUTION
);

// Error helper utilities moved to ./create/helpers/ErrorHelpers

// Field allowlists moved to strategies when needed

// Resource-specific create functions are delegated to per-resource strategies

/**
 * Helper function to check if we should use mock data based on environment
 */

// Uniqueness error enhancement handled in strategies

// Person field picking handled within PersonCreateStrategy

/**
 * UniversalCreateService provides centralized record creation functionality
 */
export class UniversalCreateService {
  /**
   * Universal record creation with comprehensive field validation, mapping, and type safety
   *
   * This is the main entry point for creating records of any type in the Attio MCP Server.
   * It provides a unified interface that handles field mapping, validation, type conversion,
   * and error handling across all resource types.
   *
   * ## Features:
   * - **Field Mapping**: Automatically maps common field name variations to Attio schema
   * - **Attribute Discovery**: Fetches live schema information with caching for validation
   * - **Type Safety**: Validates and converts field types to match Attio expectations
   * - **Collision Detection**: Prevents multiple fields from mapping to the same target
   * - **Enhanced Errors**: Provides detailed, actionable error messages with suggestions
   * - **Performance Tracking**: Records metrics for monitoring and optimization
   *
   * @param params - The record creation parameters
   * @param params.resource_type - Type of record to create (companies, people, etc.)
   * @param params.record_data - The data for the new record
   * @returns Promise resolving to the created AttioRecord with full metadata
   *
   * @throws {UniversalValidationError} When field validation fails with enhanced details
   * @throws {Error} For authentication, network, or other system errors
   *
   * @example Basic company creation:
   * ```typescript
   * const company = await UniversalCreateService.createRecord({
   *   resource_type: UniversalResourceType.COMPANIES,
   *   record_data: {
   *     name: "Acme Corporation",
   *     domains: ["acme.com"],
   *     description: "A software company"
   *   }
   * });
   * ```
   */
  static async createRecord(
    params: UniversalCreateParams
  ): Promise<AttioRecord> {
    // CRITICAL FIX: Ensure record_data is always a plain object (not JSON string)
    // Must mutate the original params.record_data, not just local variable
    if (typeof params.record_data === 'string') {
      try {
        params.record_data = JSON.parse(params.record_data);
      } catch {
        throw new UniversalValidationError('record_data must be an object');
      }
    }
    const { resource_type } = params;
    const record_data = params.record_data; // Use the potentially parsed record_data
    if (
      !record_data ||
      typeof record_data !== 'object' ||
      Array.isArray(record_data)
    ) {
      throw new UniversalValidationError('record_data must be a JSON object');
    }

    logger.debug('Entry point - createRecord', {
      resource_type,
      record_data: JSON.stringify(record_data, null, 2),
    });

    // Pre-validate fields and provide helpful suggestions
    // For records, only validate top-level fields (don't validate inside values)
    let fieldsToValidate: Record<string, unknown>;
    if (resource_type === UniversalResourceType.RECORDS) {
      // Only validate top-level keys for records (exclude inner values)
      const { values, ...topLevelFields } = record_data;
      fieldsToValidate =
        Object.keys(topLevelFields).length > 0
          ? (topLevelFields as Record<string, unknown>)
          : ({ object: 'placeholder' } as Record<string, unknown>); // Ensure non-empty object for validation
      logger.debug('Records validation: checking only top-level fields', {
        topLevelKeys: Object.keys(topLevelFields),
        excludedValuesKeys: values
          ? Object.keys(values as Record<string, unknown>)
          : [],
      });
    } else {
      fieldsToValidate = (record_data.values || record_data) as Record<
        string,
        unknown
      >; // Normal validation for other types
    }

    const fieldValidation = validateFields(resource_type, fieldsToValidate);
    logger.debug('Field validation result', {
      valid: fieldValidation.valid,
      warnings: fieldValidation.warnings,
      errors: fieldValidation.errors,
      suggestions: fieldValidation.suggestions,
    });

    if (fieldValidation.warnings.length > 0) {
      logger.warn('Field validation warnings', {
        warnings: fieldValidation.warnings,
      });
    }
    if (fieldValidation.suggestions.length > 0) {
      const truncated = ValidationService.truncateSuggestions(
        fieldValidation.suggestions
      );
      logger.info('Field suggestions available', {
        suggestions: truncated,
      });
    }
    if (!fieldValidation.valid) {
      // Build a clear, helpful error message
      let errorMessage = ERROR_MESSAGES.VALIDATION_FAILED(resource_type);
      let remediation: string[] = [];

      // Add each error on its own line for clarity
      if (fieldValidation.errors.length > 0) {
        errorMessage +=
          '\n' + fieldValidation.errors.map((err) => `  ❌ ${err}`).join('\n');
      }

      // Add suggestions if available (truncated to prevent buffer overflow)
      if (fieldValidation.suggestions.length > 0) {
        const truncated = ValidationService.truncateSuggestions(
          fieldValidation.suggestions
        );
        errorMessage += '\n\n💡 Suggestions:\n';
        errorMessage += truncated.map((sug) => `  • ${sug}`).join('\n');

        remediation = truncated.slice(0, MAX_VALIDATION_SUGGESTIONS);
      }

      // List available fields for this resource type
      const mapping = FIELD_MAPPINGS[resource_type];
      if (mapping && mapping.validFields.length > 0) {
        errorMessage += `\n\n📋 Available fields for ${resource_type}:\n  ${mapping.validFields.join(', ')}`;
        remediation.push(
          `Use valid fields: ${mapping.validFields.slice(0, 5).join(', ')}`
        );
      }

      throw createEnhancedValidationError(errorMessage, {
        field: 'record_data',
        errorCode: 'FIELD_VALIDATION_FAILED',
        suggestion: ValidationService.truncateSuggestions(
          fieldValidation.suggestions
        )
          .join('. ')
          .substring(0, MAX_SUGGESTION_TEXT_LENGTH),
        remediation,
      });
    }

    // Fetch available attributes for attribute-aware mapping (both api_slug and title)
    // Skip attribute discovery for notes (they don't have /objects/notes/attributes endpoint)
    let availableAttributes: string[] | undefined;
    if (resource_type === UniversalResourceType.NOTES) {
      logger.debug('Skipping attribute discovery for notes', {
        reason:
          'Notes are not under /objects/ and do not have attributes endpoint',
      });
      availableAttributes = undefined;
    } else {
      try {
        const { UniversalMetadataService } = await import(
          './UniversalMetadataService.js'
        );
        // For records, we need to extract the objectSlug for metadata discovery
        const options: { objectSlug?: string } = {};
        if (resource_type === UniversalResourceType.RECORDS) {
          const objectSlug = record_data.object || record_data.object_api_slug;
          if (objectSlug && typeof objectSlug === 'string') {
            options.objectSlug = objectSlug;
          }
        }

        const attributeResult =
          await UniversalMetadataService.discoverAttributesForResourceType(
            resource_type,
            options
          );

        // Include both api_slug, title, and name fields, normalize to lowercase, and dedupe
        const attrs = (attributeResult?.attributes as any[]) ?? [];
        availableAttributes = Array.from(
          new Set(
            attrs.flatMap((a) =>
              [
                a?.api_slug,
                a?.title,
                a?.name, // accept all, some schemas use `title`, some `name`
              ].filter((s: unknown): s is string => typeof s === 'string')
            )
          )
        ).map((s) => s.toLowerCase());
      } catch (error) {
        // If attribute discovery fails, proceed without it (fallback behavior)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warn(ERROR_MESSAGES.ATTRIBUTE_DISCOVERY_FAILED(resource_type), {
          resource_type,
          fallback: 'proceeding without attributes',
          error: errorMessage,
          category: ErrorCategory.EXTERNAL_SERVICE,
        });
        availableAttributes = undefined;

        // If this is a critical error (auth, network), consider throwing
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          throw createEnhancedValidationError(
            `Authentication failed during attribute discovery for ${resource_type}`,
            {
              category: ErrorCategory.AUTHENTICATION,
              errorCode: 'ATTR_DISCOVERY_AUTH_FAILED',
              suggestion: 'Check API credentials and permissions',
              remediation: [
                'Verify ATTIO_API_KEY is valid and has proper permissions',
              ],
            }
          );
        }
      }
    }

    // For records, extract objectSlug BEFORE mapping to ensure it doesn't get stripped
    let recordsObjectSlug: string | undefined;
    if (resource_type === UniversalResourceType.RECORDS) {
      const original = record_data;
      recordsObjectSlug = (original.object_api_slug ||
        original.object_slug ||
        original.object) as string;

      if (!recordsObjectSlug || typeof recordsObjectSlug !== 'string') {
        throw new UniversalValidationError(
          'Creating a "records" item requires an object slug (e.g., object: "companies")',
          ErrorType.USER_ERROR,
          { field: 'object' }
        );
      }
      logger.debug('RECORDS objectSlug extracted', {
        recordsObjectSlug,
      });
    }

    // Map field names to correct ones with collision detection
    const mappingResult = await mapRecordFields(
      resource_type,
      (record_data.values || record_data) as Record<string, unknown>,
      availableAttributes
    );
    if (mappingResult.errors && mappingResult.errors.length > 0) {
      // Check if this is a field collision error
      const firstError = mappingResult.errors[0];
      const collisionMatch = firstError.match(
        /Multiple fields map to "([^"]+)": (.+)/
      );

      if (collisionMatch) {
        const [, targetField, fieldsStr] = collisionMatch;
        const collidingFields = fieldsStr.split(', ');
        throw createFieldCollisionError(collidingFields, targetField);
      }

      // Generic mapping error with enhanced details
      throw createEnhancedValidationError(
        `Field mapping failed for ${resource_type}: ${mappingResult.errors.join('; ')}`,
        {
          field: 'record_data',
          errorCode: 'FIELD_MAPPING_ERROR',
          suggestion: 'Check field names and resolve any conflicts',
          remediation: mappingResult.errors.slice(
            0,
            MAX_VALIDATION_SUGGESTIONS
          ),
        }
      );
    }

    const { mapped: mappedData, warnings } = mappingResult;
    if (warnings.length > 0) {
      logger.info('Field mapping applied with warnings', {
        warnings,
      });
    }

    // FEATURE: Enhanced validation for Issue #413 - conditionally disabled
    // Requires: task attribute metadata API support in Attio
    // Status: Ready for activation via ENABLE_ENHANCED_VALIDATION=true
    if (process.env.ENABLE_ENHANCED_VALIDATION === 'true') {
      const validation = await validateRecordFields(
        resource_type,
        mappedData as Record<string, unknown>,
        false
      );
      if (!validation.isValid) {
        const errorMessage = validation.error || 'Validation failed';
        throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
          suggestion: 'Please fix the validation errors and try again.',
          field: undefined,
        });
      }
    }

    switch (resource_type) {
      case UniversalResourceType.COMPANIES: {
        const { CompanyCreateStrategy } = await import(
          './create/strategies/CompanyCreateStrategy.js'
        );
        return (await new CompanyCreateStrategy().create({
          resourceType: resource_type,
          values: mappedData,
        })) as AttioRecord;
      }

      case UniversalResourceType.LISTS: {
        const { ListCreateStrategy } = await import(
          './create/strategies/ListCreateStrategy.js'
        );
        return (await new ListCreateStrategy().create({
          resourceType: resource_type,
          values: mappedData,
        })) as AttioRecord;
      }

      case UniversalResourceType.PEOPLE: {
        const { PersonCreateStrategy } = await import(
          './create/strategies/PersonCreateStrategy.js'
        );
        return (await new PersonCreateStrategy().create({
          resourceType: resource_type,
          values: mappedData,
        })) as AttioRecord;
      }

      case UniversalResourceType.RECORDS: {
        const { RecordCreateStrategy } = await import(
          './create/strategies/RecordCreateStrategy.js'
        );
        const context = { objectSlug: recordsObjectSlug } as Record<
          string,
          unknown
        >;
        return (await new RecordCreateStrategy().create({
          resourceType: resource_type,
          values: mappedData,
          context,
        })) as AttioRecord;
      }

      case UniversalResourceType.DEALS: {
        const { DealCreateStrategy } = await import(
          './create/strategies/DealCreateStrategy.js'
        );
        return (await new DealCreateStrategy().create({
          resourceType: resource_type,
          values: mappedData,
        })) as AttioRecord;
      }

      case UniversalResourceType.TASKS: {
        const { TaskCreateStrategy } = await import(
          './create/strategies/TaskCreateStrategy.js'
        );
        return (await new TaskCreateStrategy().create({
          resourceType: resource_type,
          values: mappedData,
        })) as AttioRecord;
      }

      case UniversalResourceType.NOTES: {
        const { NoteCreateStrategy } = await import(
          './create/strategies/NoteCreateStrategy.js'
        );
        return (await new NoteCreateStrategy().create({
          resourceType: resource_type,
          values: mappedData,
        })) as AttioRecord;
      }

      default:
        return this.handleUnsupportedResourceType(resource_type, params);
    }
  }

  // (All resource-specific create flows are implemented by strategies above.)

  /**
   * Handle unsupported resource types with correction attempts
   */
  private static async handleUnsupportedResourceType(
    resource_type: string,
    params: UniversalCreateParams
  ): Promise<AttioRecord> {
    // Check if resource type can be corrected
    const resourceValidation = validateResourceType(resource_type);
    if (resourceValidation.corrected) {
      // Retry with corrected resource type
      logger.info('Resource type corrected', {
        originalType: resource_type,
        correctedType: resourceValidation.corrected,
      });
      return this.createRecord({
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
