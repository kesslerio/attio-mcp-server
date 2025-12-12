/**
 * FieldPersistenceHandler - Post-update field verification
 *
 * Extracted from UniversalUpdateService to separate verification concerns.
 * Handles field persistence checking with configurable strictness.
 *
 * **Verification Modes** (controlled by `ENABLE_FIELD_VERIFICATION` env var):
 * - **Enabled** (default): Any value except `'false'` enables verification
 * - **Disabled**: Set to `'false'` to skip verification entirely
 *
 * **Strictness Modes** (controlled by `STRICT_FIELD_VALIDATION` env var):
 * - **Strict**: `'true'` - Logs all discrepancies (cosmetic + semantic)
 * - **Standard** (default): `'false'` - Logs only semantic mismatches
 *
 * **Semantic vs Cosmetic Mismatches**:
 * - Cosmetic: Format differences with same logical value (e.g., "Demo" vs {title: "Demo"})
 * - Semantic: Actual data loss or corruption (e.g., "Demo" vs "Qualified", missing data)
 *
 * @see Issue #984 - Modularize UniversalUpdateService (831→220 lines)
 * @see PR #1006 Phase 3.2 - Enhanced JSDoc for verification behavior
 */

import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { UpdateValidation } from './UpdateValidation.js';
import { debug, error as logError } from '@/utils/logger.js';
import {
  UniversalValidationError,
  ErrorType,
} from '@/handlers/tool-configs/universal/schemas.js';

/**
 * Options for field persistence verification
 */
export interface VerificationOptions {
  /** Skip verification entirely (default: false) */
  skip?: boolean;
  /** Throw error on verification failure (default: from env STRICT_FIELD_VALIDATION) */
  strict?: boolean;
  /** Include cosmetic mismatches in warnings (default: false) */
  includeCosmetic?: boolean;
}

/**
 * Result of field persistence verification
 */
export interface VerificationResult {
  /** Whether all fields were persisted correctly */
  verified: boolean;
  /** Non-blocking warnings about verification */
  warnings: string[];
  /** List of field discrepancies found */
  discrepancies: string[];
  /** Actual values retrieved from API */
  actualValues: Record<string, unknown>;
}

/**
 * FieldPersistenceHandler - Post-update verification orchestration
 *
 * @example
 * ```typescript
 * // Standard mode (semantic mismatches only)
 * const result = await FieldPersistenceHandler.verifyPersistence(
 *   UniversalResourceType.COMPANIES,
 *   'company-123',
 *   { stage: 'Demo' }
 * );
 * // Cosmetic mismatch "Demo" vs {title: "Demo"} → not logged
 * // Semantic mismatch "Demo" vs "Qualified" → logged
 *
 * // Strict mode (all mismatches)
 * process.env.STRICT_FIELD_VALIDATION = 'true';
 * // Both cosmetic and semantic mismatches logged
 * ```
 */
export class FieldPersistenceHandler {
  /**
   * Verify that fields were persisted correctly after update
   *
   * Supports three modes:
   * 1. Disabled: ENABLE_FIELD_VERIFICATION=false (skip completely)
   * 2. Warn-only: Default, logs discrepancies as warnings
   * 3. Strict: STRICT_FIELD_VALIDATION=true, throws on mismatch
   *
   * @param resourceType - Resource type being verified
   * @param recordId - ID of the updated record
   * @param expectedData - Expected field values after update
   * @param actualRecord - Actual record returned from API
   * @param options - Verification options
   * @returns Verification result with verified status, warnings, and discrepancies
   * @throws UniversalValidationError if strict mode enabled and verification fails
   */
  static async verifyPersistence(
    resourceType: UniversalResourceType,
    recordId: string,
    expectedData: Record<string, unknown>,
    actualRecord: Record<string, unknown>,
    options: VerificationOptions = {}
  ): Promise<VerificationResult> {
    const result: VerificationResult = {
      verified: true,
      warnings: [],
      discrepancies: [],
      actualValues: actualRecord || {},
    };

    // Check if verification is disabled globally
    if (options.skip || process.env.ENABLE_FIELD_VERIFICATION === 'false') {
      result.warnings.push(
        'Field persistence verification skipped (disabled via config)'
      );
      debug('FieldPersistenceHandler', 'Verification skipped', {
        resourceType,
        recordId,
        reason: 'disabled',
      });
      return result;
    }

    try {
      // Perform verification using existing UpdateValidation service
      const verification = await UpdateValidation.verifyFieldPersistence(
        resourceType,
        recordId,
        expectedData
      );

      result.verified = verification.verified;
      result.warnings.push(...verification.warnings);

      if (!verification.verified) {
        const isStrictMode =
          options.strict !== undefined
            ? options.strict
            : process.env.STRICT_FIELD_VALIDATION === 'true';
        const includeCosmetic = options.includeCosmetic || isStrictMode;

        // Filter discrepancies based on mode
        if (includeCosmetic) {
          // Include all discrepancies (cosmetic + semantic)
          result.discrepancies.push(...verification.discrepancies);
        } else {
          // Filter out cosmetic mismatches (e.g., "Demo" vs {title: "Demo"})
          const semanticMismatches = verification.discrepancies.filter((d) =>
            this.isSemanticMismatch(d)
          );
          result.discrepancies.push(...semanticMismatches);
        }

        // Log discrepancies
        if (result.discrepancies.length > 0) {
          result.warnings.push(
            ...result.discrepancies.map((d) => `Field persistence issue: ${d}`)
          );

          logError(
            'FieldPersistenceHandler',
            `Field persistence warnings for ${resourceType} ${recordId}:`,
            result.warnings
          );
        }

        // Throw in strict mode if semantic mismatches exist
        if (isStrictMode && result.discrepancies.length > 0) {
          logError(
            'FieldPersistenceHandler',
            'Field persistence verification failed (strict mode)',
            new Error('Verification failed'),
            {
              resourceType,
              recordId,
              discrepancies: result.discrepancies,
            }
          );

          throw new UniversalValidationError(
            `Field persistence verification failed: ${result.discrepancies.join('; ')}`,
            ErrorType.API_ERROR,
            {
              field: 'field_verification',
              suggestion:
                'Check that field values are correctly formatted and supported by the API',
            }
          );
        }
      } else {
        debug('FieldPersistenceHandler', 'Verification passed', {
          resourceType,
          recordId,
          fieldCount: Object.keys(expectedData).length,
        });
      }
    } catch (error: unknown) {
      // Catch verification errors (network, API errors, etc.)
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      result.warnings.push(`Field verification warning: ${errorMessage}`);

      logError(
        'FieldPersistenceHandler',
        'Field persistence verification error',
        error
      );

      // Re-throw validation errors (strict mode failures)
      if (error instanceof UniversalValidationError) {
        throw error;
      }
    }

    return result;
  }

  /**
   * Determine if a discrepancy is semantic (real) vs cosmetic (format-only)
   *
   * Cosmetic mismatches occur when the same logical value is represented differently:
   * - String vs object: "Demo" vs {title: "Demo"}
   * - Array wrapping: "value" vs ["value"]
   * - Type coercion: "123" vs 123
   *
   * Semantic mismatches indicate actual data loss or corruption:
   * - Different values: "Demo" vs "Qualified"
   * - Missing data: {field: "value"} vs {}
   *
   * @param discrepancy - Discrepancy message from verification
   * @returns true if semantic mismatch, false if cosmetic
   */
  public static isSemanticMismatch(discrepancy: string): boolean {
    // Extract expected and actual from: Field "X" persistence mismatch: expected Y, got Z
    const match = discrepancy.match(/expected (.+?), got (.+?)$/);
    if (!match) {
      // If we can't parse, assume semantic (log for safety)
      return true;
    }

    const [, expectedStr, actualStr] = match;

    try {
      // Check for cosmetic mismatches
      // Case 1: String value vs object with title property
      const isCosmetic =
        (expectedStr.includes('"') &&
          actualStr.includes(expectedStr.replace(/^"|"$/g, ''))) ||
        (actualStr.includes('"') &&
          expectedStr.includes(actualStr.replace(/^"|"$/g, '')));

      return !isCosmetic; // Return true for semantic, false for cosmetic
    } catch {
      // On parse errors, assume semantic (safety)
      return true;
    }
  }
}
