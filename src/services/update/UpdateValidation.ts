import type { AttioRecord } from '@/types/attio.js';
import { FilterValidationError } from '@/errors/api-errors.js';
import { shouldUseMockData } from '@/services/create/index.js';
import { UniversalUtilityService } from '@/services/UniversalUtilityService.js';
import { getCompanyDetails } from '@/objects/companies/index.js';
import { getListDetails } from '@/objects/lists.js';
import { getPersonDetails } from '@/objects/people/basic.js';
import { getObjectRecord } from '@/objects/records/index.js';
import { getTask } from '@/objects/tasks.js';
import type { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { createScopedLogger } from '@/utils/logger.js';

export const UpdateValidation = {
  hasForbiddenContent(values: Record<string, unknown>): boolean {
    if (!values || typeof values !== 'object') return false;
    const forbidden = ['content', 'content_markdown', 'content_plaintext'];
    return forbidden.some((field) => field in values);
  },

  assertNoTaskContentUpdate(recordData: Record<string, unknown>): void {
    if (!recordData || typeof recordData !== 'object') return;
    if (this.hasForbiddenContent(recordData)) {
      throw new FilterValidationError(
        'Task content cannot be updated after creation. Content is immutable in the Attio API.'
      );
    }
  },

  sanitizeSpecialCharacters(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string' ? item : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeSpecialCharacters(
          value as Record<string, unknown>
        );
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },

  async verifyFieldPersistence(
    resourceType: UniversalResourceType,
    recordId: string,
    expectedUpdates: Record<string, unknown>
  ): Promise<{
    verified: boolean;
    discrepancies: string[];
    warnings: string[];
  }> {
    const result = {
      verified: true,
      discrepancies: [] as string[],
      warnings: [] as string[],
    };

    // Standardized environment variable (Issue #984 extension)
    // SKIP_FIELD_VERIFICATION is deprecated, use ENABLE_FIELD_VERIFICATION=false instead
    const skipVerification =
      shouldUseMockData() ||
      process.env.ENABLE_FIELD_VERIFICATION === 'false' ||
      process.env.SKIP_FIELD_VERIFICATION === 'true'; // Deprecated

    if (skipVerification) {
      result.warnings.push(
        'Field persistence verification skipped in test environment'
      );
      return result;
    }

    try {
      const verificationRecord = await this.fetchRecordForVerification(
        resourceType,
        recordId
      );
      if (!verificationRecord) {
        result.verified = false;
        result.discrepancies.push(
          'Unable to fetch record for field persistence verification'
        );
        return result;
      }

      for (const [fieldName, expectedValue] of Object.entries(
        expectedUpdates
      )) {
        if (
          ['created_at', 'updated_at', 'id', 'workspace_id'].includes(fieldName)
        )
          continue;
        const actualValue = verificationRecord.values?.[fieldName];
        const comparisonResult = this.compareFieldValues(
          fieldName,
          expectedValue,
          actualValue
        );
        if (!comparisonResult.matches) {
          result.verified = false;
          result.discrepancies.push(
            `Field "${fieldName}" persistence mismatch: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
          );
        } else if (comparisonResult.warning) {
          result.warnings.push(comparisonResult.warning);
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.warnings.push(
        `Field persistence verification failed: ${errorMessage}`
      );
      createScopedLogger(
        'update/UpdateValidation',
        'verifyFieldPersistence'
      ).error('Field persistence verification error', error);
    }
    return result;
  },

  async fetchRecordForVerification(
    resourceType: UniversalResourceType,
    recordId: string
  ): Promise<AttioRecord | null> {
    try {
      switch (resourceType) {
        case 'companies' as unknown as UniversalResourceType:
          return (await getCompanyDetails(recordId)) as unknown as AttioRecord;
        case 'people' as unknown as UniversalResourceType:
          return (await getPersonDetails(recordId)) as unknown as AttioRecord;
        case 'lists' as unknown as UniversalResourceType: {
          const list = await getListDetails(recordId);
          return {
            id: { record_id: list.id.list_id, list_id: list.id.list_id },
            values: {
              name:
                (list as Record<string, unknown>).name ||
                (list as Record<string, unknown>).title,
              description: (list as Record<string, unknown>).description,
              parent_object:
                (list as Record<string, unknown>).object_slug ||
                (list as Record<string, unknown>).parent_object,
              api_slug: (list as Record<string, unknown>).api_slug,
              workspace_id: (list as Record<string, unknown>).workspace_id,
              workspace_member_access: (list as Record<string, unknown>)
                .workspace_member_access,
              created_at: (list as Record<string, unknown>).created_at,
            },
          } as unknown as AttioRecord;
        }
        case 'tasks' as unknown as UniversalResourceType: {
          const task = await getTask(recordId);
          return UniversalUtilityService.convertTaskToRecord(task);
        }
        case 'deals' as unknown as UniversalResourceType:
          return await getObjectRecord('deals', recordId);
        case 'records' as unknown as UniversalResourceType:
          return await getObjectRecord('records', recordId);
        default:
          createScopedLogger(
            'update/UpdateValidation',
            'fetchRecordForVerification'
          ).warn(
            `No verification method available for resource type: ${resourceType}`
          );
          return null;
      }
    } catch (error: unknown) {
      createScopedLogger(
        'update/UpdateValidation',
        'fetchRecordForVerification'
      ).error(
        `Failed to fetch ${resourceType} record ${recordId} for verification`,
        error
      );
      return null;
    }
  },

  /**
   * Check if a field is a status-type field (stage, status, etc.)
   * Enhanced to recognize more status field variations (Issue #995)
   *
   * Uses exact matching and suffix patterns to avoid false positives
   * from unrelated fields like "status_code" or "status_updated_at"
   */
  isStatusField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();

    // Exact matches for canonical status fields
    if (lowerFieldName === 'stage' || lowerFieldName === 'status') {
      return true;
    }

    // Suffix patterns for common variations
    // e.g., deal_stage, pipeline_stage, company_status, deal_status
    return (
      lowerFieldName.endsWith('_stage') || lowerFieldName.endsWith('_status')
    );
  },

  /**
   * Handle null or undefined values
   */
  handleNullValues(
    expectedValue: unknown,
    actualValue: unknown
  ): { matches: boolean } | null {
    if (expectedValue === null || expectedValue === undefined) {
      return { matches: actualValue === null || actualValue === undefined };
    }
    if (actualValue === null || actualValue === undefined) {
      return { matches: false };
    }
    return null; // Continue with other comparisons
  },

  /**
   * Unwrap array responses from Attio API
   * Handles both status fields and regular value fields
   */
  unwrapArrayValue(fieldName: string, actualValue: unknown): unknown {
    if (!Array.isArray(actualValue) || actualValue.length === 0) {
      return actualValue;
    }

    const firstItem = actualValue[0];

    // Guard: only proceed with status/title logic if firstItem is an object
    // and contains status or title properties
    if (
      this.isStatusField(fieldName) &&
      firstItem &&
      typeof firstItem === 'object' &&
      !Array.isArray(firstItem)
    ) {
      const firstItemObj = firstItem as Record<string, unknown>;

      // Only use status/title extraction if the object actually has those properties
      if ('status' in firstItemObj || 'title' in firstItemObj) {
        const statusValue = firstItemObj.status ?? firstItemObj.title;
        if (statusValue !== undefined) {
          return actualValue.length === 1
            ? statusValue
            : (actualValue as Record<string, unknown>[]).map(
                (v: Record<string, unknown>) => v.status ?? v.title
              );
        }
      }
    }

    // Handle regular value fields
    if (
      firstItem &&
      typeof firstItem === 'object' &&
      !Array.isArray(firstItem)
    ) {
      const firstItemObj = firstItem as Record<string, unknown>;
      if (firstItemObj.value !== undefined) {
        return actualValue.length === 1
          ? firstItemObj.value
          : (actualValue as Record<string, unknown>[]).map(
              (v: Record<string, unknown>) => v.value
            );
      }
    }

    return actualValue;
  },

  /**
   * Compare array values using set comparison
   */
  compareArrayValues(
    expectedValue: unknown[],
    actualValue: unknown
  ): { matches: boolean } {
    if (!Array.isArray(actualValue)) {
      return { matches: false };
    }

    const expectedSet = new Set(expectedValue.map((v) => String(v)));
    const actualSet = new Set((actualValue as unknown[]).map((v) => String(v)));

    return {
      matches:
        expectedSet.size === actualSet.size &&
        Array.from(expectedSet).every((v) => actualSet.has(v)),
    };
  },

  /**
   * Compare string values with case-insensitive fallback
   */
  compareStringValues(
    fieldName: string,
    expectedValue: string,
    actualValue: unknown
  ): { matches: boolean; warning?: string } {
    const actualStr = String(actualValue);
    const matches = expectedValue === actualStr;

    if (!matches && expectedValue.toLowerCase() === actualStr.toLowerCase()) {
      return {
        matches: true,
        warning: `Field "${fieldName}" case mismatch: expected "${expectedValue}", got "${actualStr}"`,
      };
    }

    return { matches };
  },

  /**
   * Compare status objects (like deal stages)
   */
  compareStatusObjects(
    fieldName: string,
    expectedValue: Record<string, unknown>,
    actualValue: unknown
  ): { matches: boolean } | null {
    if (!this.isStatusField(fieldName) || !('status' in expectedValue)) {
      return null; // Not a status object comparison
    }

    const expectedStatus = expectedValue.status;
    const actualStr = String(actualValue);
    return { matches: String(expectedStatus) === actualStr };
  },

  /**
   * Compare primitive values (number, boolean, string)
   */
  comparePrimitiveValues(
    expectedValue: unknown,
    actualValue: unknown
  ): { matches: boolean } {
    if (typeof expectedValue === 'number') {
      const actualNum = Number(actualValue);
      return { matches: !isNaN(actualNum) && expectedValue === actualNum };
    }

    if (typeof expectedValue === 'boolean') {
      const actualBool = Boolean(actualValue);
      return { matches: expectedValue === actualBool };
    }

    // String fallback
    return { matches: String(expectedValue) === String(actualValue) };
  },

  compareFieldValues(
    fieldName: string,
    expectedValue: unknown,
    actualValue: unknown
  ): { matches: boolean; warning?: string } {
    // Handle null/undefined values
    const nullCheck = this.handleNullValues(expectedValue, actualValue);
    if (nullCheck) return nullCheck;

    // Unwrap array responses from Attio API
    const unwrappedActual = this.unwrapArrayValue(fieldName, actualValue);

    // Handle array comparisons
    if (Array.isArray(expectedValue)) {
      return this.compareArrayValues(expectedValue, unwrappedActual);
    }

    // Handle string comparisons with case handling
    if (typeof expectedValue === 'string') {
      return this.compareStringValues(
        fieldName,
        expectedValue,
        unwrappedActual
      );
    }

    // Handle status objects (like deal stages)
    if (
      typeof expectedValue === 'object' &&
      expectedValue !== null &&
      !Array.isArray(expectedValue)
    ) {
      const statusComparison = this.compareStatusObjects(
        fieldName,
        expectedValue as Record<string, unknown>,
        unwrappedActual
      );
      if (statusComparison) return statusComparison;
    }

    // Handle primitive values (number, boolean, string fallback)
    return this.comparePrimitiveValues(expectedValue, unwrappedActual);
  },
};
