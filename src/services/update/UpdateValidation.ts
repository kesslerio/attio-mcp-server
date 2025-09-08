/**
 * UpdateValidation - Shared validation and persistence utilities for update strategies
 * 
 * Extracted from UniversalUpdateService to reduce duplication
 */

import { AttioRecord } from '../../types/attio.js';
import { UniversalValidationError, ErrorType } from '../../handlers/tool-configs/universal/schemas.js';

export class UpdateValidation {
  /**
   * Check if a record exists and can be updated
   */
  static async validateRecordExists(
    record_id: string,
    fetchFunction: () => Promise<AttioRecord | null>
  ): Promise<AttioRecord> {
    const record = await fetchFunction();
    
    if (!record) {
      throw new UniversalValidationError(
        `Record with ID "${record_id}" not found`,
        ErrorType.NOT_FOUND,
        { record_id }
      );
    }
    
    return record;
  }

  /**
   * Merge fields for persistence
   */
  static mergeFieldsForPersistence(
    newFields: Record<string, unknown>,
    existingFields: Record<string, unknown>,
    persistUnlisted: boolean
  ): Record<string, unknown> {
    if (!persistUnlisted) {
      return newFields;
    }

    // Start with existing fields
    const merged = { ...existingFields };
    
    // Override with new fields
    Object.entries(newFields).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        // Allow explicit null/undefined to clear fields
        delete merged[key];
      } else {
        merged[key] = value;
      }
    });
    
    return merged;
  }

  /**
   * Identify which fields changed
   */
  static identifyChangedFields(
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): {
    added: string[];
    modified: string[];
    removed: string[];
  } {
    const added: string[] = [];
    const modified: string[] = [];
    const removed: string[] = [];
    
    // Check for added/modified fields
    Object.keys(after).forEach(key => {
      if (!(key in before)) {
        added.push(key);
      } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        modified.push(key);
      }
    });
    
    // Check for removed fields
    Object.keys(before).forEach(key => {
      if (!(key in after)) {
        removed.push(key);
      }
    });
    
    return { added, modified, removed };
  }

  /**
   * Validate field types match expected schema
   */
  static validateFieldTypes(
    fields: Record<string, unknown>,
    schema: Record<string, any>
  ): string[] {
    const errors: string[] = [];
    
    Object.entries(fields).forEach(([key, value]) => {
      if (schema[key]) {
        const expectedType = schema[key].type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (expectedType && expectedType !== actualType) {
          errors.push(
            `Field "${key}" expected type "${expectedType}" but got "${actualType}"`
          );
        }
      }
    });
    
    return errors;
  }

  /**
   * Compare field values with smart comparison logic
   */
  static compareFieldValues(
    fieldName: string,
    expectedValue: unknown,
    actualValue: unknown
  ): { matches: boolean; warning?: string } {
    // Handle null/undefined cases
    if (expectedValue === null || expectedValue === undefined) {
      return { matches: actualValue === null || actualValue === undefined };
    }
    if (actualValue === null || actualValue === undefined) {
      return { matches: false };
    }
    
    // Handle Attio's wrapped value format [{ value: "actual_value" }]
    let unwrappedActual = actualValue;
    if (
      Array.isArray(actualValue) &&
      actualValue.length > 0 &&
      actualValue[0]?.value !== undefined
    ) {
      unwrappedActual = actualValue.map((item: any) => item.value);
      if (unwrappedActual.length === 1) {
        unwrappedActual = unwrappedActual[0];
      }
    }
    
    // Handle array comparison
    if (Array.isArray(expectedValue) && Array.isArray(unwrappedActual)) {
      return {
        matches: JSON.stringify(expectedValue.sort()) === JSON.stringify(unwrappedActual.sort())
      };
    }
    
    // Handle string comparison (case-insensitive for some fields)
    if (typeof expectedValue === 'string' && typeof unwrappedActual === 'string') {
      const emailFields = ['email', 'email_address', 'primary_email'];
      if (emailFields.includes(fieldName.toLowerCase())) {
        return { matches: expectedValue.toLowerCase() === unwrappedActual.toLowerCase() };
      }
    }
    
    // Default comparison
    return { matches: JSON.stringify(expectedValue) === JSON.stringify(unwrappedActual) };
  }

  /**
   * Normalize response format for consistency
   */
  static normalizeResponseFormat(
    resourceType: string,
    record: AttioRecord
  ): AttioRecord {
    switch (resourceType) {
      case 'companies':
        return UpdateValidation.normalizeCompanyRecord(record);
      case 'people':
        return UpdateValidation.normalizePersonRecord(record);
      case 'lists':
        return UpdateValidation.normalizeListRecord(record);
      case 'tasks':
        return UpdateValidation.normalizeTaskRecord(record);
      case 'deals':
        return UpdateValidation.normalizeDealRecord(record);
      case 'records':
        return UpdateValidation.normalizeGenericRecord(record);
      default:
        return record;
    }
  }

  /**
   * Normalize company record format
   */
  private static normalizeCompanyRecord(record: AttioRecord): AttioRecord {
    return {
      ...record,
      id: {
        ...record.id,
        object_id: record.id.object_id || 'companies',
      },
      values: {
        ...record.values,
        // Ensure domains field is properly formatted as array
        domains:
          record.values.domains && Array.isArray(record.values.domains)
            ? record.values.domains
            : record.values.domains
              ? [record.values.domains]
              : record.values.domains,
      },
    };
  }

  /**
   * Normalize person record format
   */
  private static normalizePersonRecord(record: AttioRecord): AttioRecord {
    return {
      ...record,
      id: {
        ...record.id,
        object_id: record.id.object_id || 'people',
      },
    };
  }

  /**
   * Normalize list record format
   */
  private static normalizeListRecord(record: AttioRecord): AttioRecord {
    return {
      ...record,
      id: {
        ...record.id,
        object_id: record.id.object_id || 'lists',
        list_id: record.id.list_id || record.id.record_id,
      },
    };
  }

  /**
   * Normalize task record format (Issue #480 compatibility)
   */
  private static normalizeTaskRecord(record: AttioRecord): AttioRecord {
    return {
      ...record,
      id: {
        ...record.id,
        object_id: record.id.object_id || 'tasks',
        task_id: record.id.task_id || record.id.record_id,
      },
      values: {
        ...record.values,
        // Ensure both content and title fields are present for compatibility
        content: record.values.content || record.values.title,
        title: record.values.title || record.values.content,
      },
    };
  }

  /**
   * Normalize deal record format
   */
  private static normalizeDealRecord(record: AttioRecord): AttioRecord {
    return {
      ...record,
      id: {
        ...record.id,
        object_id: record.id.object_id || 'deals',
      },
      values: {
        ...record.values,
        // Ensure numeric value field is properly formatted
        value:
          record.values.value && typeof record.values.value === 'string'
            ? parseFloat(record.values.value) || record.values.value
            : record.values.value,
      },
    };
  }

  /**
   * Normalize generic record format
   */
  private static normalizeGenericRecord(record: AttioRecord): AttioRecord {
    return {
      ...record,
      id: {
        ...record.id,
        object_id: record.id.object_id || 'records',
      },
    };
  }
}