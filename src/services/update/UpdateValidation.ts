import type { AttioRecord } from '../../types/attio.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import { shouldUseMockData } from '../create/index.js';
import { UniversalUtilityService } from '../UniversalUtilityService.js';
import { getCompanyDetails } from '../../objects/companies/index.js';
import { getListDetails } from '../../objects/lists.js';
import { getPersonDetails } from '../../objects/people/basic.js';
import { getObjectRecord } from '../../objects/records/index.js';
import { getTask } from '../../objects/tasks.js';
import type { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
import { createScopedLogger } from '../../utils/logger.js';

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
    expectedUpdates: Record<string, unknown>,
    _updatedRecord: AttioRecord
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
    if (shouldUseMockData() || process.env.SKIP_FIELD_VERIFICATION === 'true') {
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

  compareFieldValues(
    fieldName: string,
    expectedValue: unknown,
    actualValue: unknown
  ): { matches: boolean; warning?: string } {
    if (expectedValue === null || expectedValue === undefined) {
      return { matches: actualValue === null || actualValue === undefined };
    }
    if (actualValue === null || actualValue === undefined) {
      return { matches: false };
    }
    let unwrappedActual = actualValue;
    if (
      Array.isArray(actualValue) &&
      actualValue.length > 0 &&
      (actualValue as Record<string, unknown>[])[0]?.value !== undefined
    ) {
      unwrappedActual =
        (actualValue as Record<string, unknown>[]).length === 1
          ? (actualValue as Record<string, unknown>[])[0].value
          : (actualValue as Record<string, unknown>[]).map(
              (v: Record<string, unknown>) => v.value
            );
    }
    if (Array.isArray(expectedValue)) {
      if (!Array.isArray(unwrappedActual)) return { matches: false };
      const expectedSet = new Set(
        (expectedValue as unknown[]).map((v) => String(v))
      );
      const actualSet = new Set(
        (unwrappedActual as unknown[]).map((v) => String(v))
      );
      return {
        matches:
          expectedSet.size === actualSet.size &&
          Array.from(expectedSet).every((v) => actualSet.has(v)),
      };
    }
    if (typeof expectedValue === 'string') {
      const actualStr = String(unwrappedActual);
      const matches = expectedValue === actualStr;
      if (!matches && expectedValue.toLowerCase() === actualStr.toLowerCase()) {
        return {
          matches: true,
          warning: `Field "${fieldName}" case mismatch: expected "${expectedValue}", got "${actualStr}"`,
        };
      }
      return { matches };
    }
    if (typeof expectedValue === 'number') {
      const actualNum = Number(unwrappedActual);
      return { matches: !isNaN(actualNum) && expectedValue === actualNum };
    }
    if (typeof expectedValue === 'boolean') {
      const actualBool = Boolean(unwrappedActual);
      return { matches: expectedValue === actualBool };
    }
    return { matches: String(expectedValue) === String(unwrappedActual) };
  },
};
