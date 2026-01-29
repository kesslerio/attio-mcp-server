/**
 * FieldValidationHandler - Validation orchestration with display name resolution
 *
 * Consolidates validation logic and integrates display name resolution
 * for create/update operations.
 *
 * @see Issue #984 - Extend display name resolution to create/update operations
 */

import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { validateFields } from '@/handlers/tool-configs/universal/field-mapper.js';
import { ValidationService } from '@/services/ValidationService.js';
import { debug, OperationType } from '@/utils/logger.js';

/**
 * Result of field validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (blocking) */
  errors: string[];
  /** Validation warnings (non-blocking) */
  warnings: string[];
  /** Field suggestions for user */
  suggestions: string[];
  /** Map of display name → API slug resolutions */
  resolvedFields?: Map<string, string>;
}

/**
 * FieldValidationHandler - Validation and display name resolution
 */
export class FieldValidationHandler {
  /**
   * Validate fields and optionally resolve display names to API slugs
   *
   * Integrates display name resolution (previously only in get_attribute_options)
   * to work for create/update operations.
   *
   * @param resourceType - Resource type being validated
   * @param values - Field values to validate
   * @param objectSlug - Optional object slug for display name resolution
   * @param enableDisplayNameResolution - Whether to attempt display name resolution (default: true)
   * @returns Validation result with warnings, suggestions, and resolved field names
   */
  static async validateAndResolve(
    resourceType: UniversalResourceType,
    values: Record<string, unknown>,
    objectSlug?: string,
    enableDisplayNameResolution: boolean = true
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      resolvedFields: new Map(),
    };

    // Pre-validate fields with suggestions
    const fieldValidation = validateFields(resourceType, values);

    // Propagate validation results (PR #1006 Phase 3.1)
    result.valid = fieldValidation.valid;
    result.errors.push(...fieldValidation.errors);

    if (fieldValidation.warnings.length > 0) {
      result.warnings.push(...fieldValidation.warnings);
      debug('FieldValidationHandler', 'Field validation warnings', {
        resourceType,
        warnings: fieldValidation.warnings.join('\n'),
      });
    }

    if (fieldValidation.suggestions.length > 0) {
      const truncated = ValidationService.truncateSuggestions(
        fieldValidation.suggestions
      );
      result.suggestions.push(...truncated);
      debug('FieldValidationHandler', 'Field suggestions', {
        resourceType,
        suggestions: truncated.join('\n'),
      });
    }

    // NEW: Attempt display name resolution for unknown fields
    if (enableDisplayNameResolution && objectSlug) {
      await this.resolveDisplayNames(values, objectSlug, result);
    }

    return result;
  }

  /**
   * Apply deal-specific validation and defaults
   *
   * @param values - Deal values to validate
   * @param skipApiValidation - Whether to skip API validation
   * @returns Deal validation result with validated data, warnings, and suggestions
   */
  static async validateDealDefaults(
    values: Record<string, unknown>,
    skipApiValidation: boolean = false
  ): Promise<{
    dealData: Record<string, unknown>;
    warnings: string[];
    suggestions: string[];
  }> {
    try {
      const { applyDealDefaultsWithValidation } =
        await import('@/config/deal-defaults.js');

      const dealValidation = await applyDealDefaultsWithValidation(
        values,
        skipApiValidation
      );

      debug('FieldValidationHandler', 'Deal validation applied', {
        warnings: dealValidation.warnings,
        suggestions: dealValidation.suggestions,
      });

      return {
        dealData: dealValidation.dealData,
        warnings: dealValidation.warnings,
        suggestions: dealValidation.suggestions,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      debug('FieldValidationHandler', 'Deal validation failed', {
        error: errorMessage,
      });

      return {
        dealData: values,
        warnings: [`Deal validation warning: ${errorMessage}`],
        suggestions: [],
      };
    }
  }

  /**
   * Attempt to resolve display names to API slugs for unknown fields
   *
   * This extends display name resolution (previously only in get_attribute_options)
   * to work for create/update operations, improving UX consistency.
   *
   * @param values - Field values (may contain display names like "Deal stage")
   * @param objectSlug - Object slug for attribute lookup
   * @param result - Validation result to populate with resolutions
   */
  private static async resolveDisplayNames(
    values: Record<string, unknown>,
    objectSlug: string,
    result: ValidationResult
  ): Promise<void> {
    // Import display name resolver (will be exported in Phase 4)
    // For now, we'll use a simplified version until shared-handlers exports it
    try {
      const fieldNames = Object.keys(values);

      for (const fieldName of fieldNames) {
        // Only attempt resolution for fields with spaces or mixed case (likely display names)
        const mightBeDisplayName =
          fieldName.includes(' ') || /[A-Z]/.test(fieldName);

        if (!mightBeDisplayName) {
          continue;
        }

        // Attempt to resolve display name to API slug
        // Uses the exported resolveAttributeDisplayName from shared-handlers.ts
        const resolved = await this.attemptDisplayNameResolution(
          objectSlug,
          fieldName
        );

        if (resolved && resolved !== fieldName) {
          result.resolvedFields!.set(fieldName, resolved);
          debug('FieldValidationHandler', 'Resolved display name', {
            from: fieldName,
            to: resolved,
            objectSlug,
          });
        }
      }
    } catch (error) {
      // Silent fallback - display name resolution is best-effort
      debug('FieldValidationHandler', 'Display name resolution failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Attempt to resolve a display name to an API slug
   *
   * Uses the exported resolveAttributeDisplayName from shared-handlers.ts
   * to support user-friendly field names like "Deal stage" instead of "stage"
   *
   * @param objectSlug - The object slug (e.g., "deals", "companies")
   * @param fieldName - The field name to resolve (e.g., "Deal stage")
   * @returns The resolved API slug if found, or null
   */
  private static async attemptDisplayNameResolution(
    objectSlug: string,
    fieldName: string
  ): Promise<string | null> {
    try {
      const { resolveAttributeDisplayName } =
        await import('@/handlers/tool-configs/universal/shared-handlers.js');
      return await resolveAttributeDisplayName(objectSlug, fieldName);
    } catch (err) {
      debug(
        'FieldValidationHandler',
        'Display name resolution failed',
        { objectSlug, fieldName, error: err },
        'attemptDisplayNameResolution',
        OperationType.DATA_PROCESSING
      );
      return null;
    }
  }
}
