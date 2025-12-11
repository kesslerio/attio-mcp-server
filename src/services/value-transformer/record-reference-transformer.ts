/**
 * Record-reference transformer - formats record IDs to Attio's expected format
 *
 * Issue #997: Record-reference attributes like people.company or deals.associated_people
 * require a specific format: [{ target_object: "companies", target_record_id: "uuid" }]
 *
 * Problem: Users commonly pass:
 * - Simple string ID: "company-uuid"
 * - Legacy object: { record_id: "uuid" }
 * - Incomplete object: { target_record_id: "uuid" } (missing target_object)
 *
 * Solution: Auto-detect record-reference attributes and format to Attio's expected structure.
 */

import {
  TransformContext,
  TransformResult,
  AttributeMetadata,
  RecordReferenceValue,
} from './types.js';
import { debug, OperationType } from '@/utils/logger.js';

/**
 * Mapping from field names to their target object types
 * Used as fallback when relationship metadata is not available
 */
const FIELD_TO_TARGET_OBJECT: Record<string, string> = {
  company: 'companies',
  associated_company: 'companies',
  associated_companies: 'companies',
  main_contact: 'people',
  associated_people: 'people',
  associated_person: 'people',
  person: 'people',
  people: 'people',
  owner: 'workspace-members', // Note: owner might be workspace-member, not people
  assignee: 'workspace-members',
};

/**
 * Check if an attribute type is a record-reference
 */
export function isRecordReferenceType(type: string): boolean {
  return type === 'record-reference';
}

/**
 * Check if a value is already in the correct Attio record-reference format
 */
function isCorrectFormat(value: unknown): value is RecordReferenceValue[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true; // Empty array is valid (clears the field)

  // Check first element has both required fields
  const first = value[0];
  return (
    first &&
    typeof first === 'object' &&
    'target_object' in first &&
    'target_record_id' in first &&
    typeof first.target_object === 'string' &&
    typeof first.target_record_id === 'string'
  );
}

/**
 * Infer the target object type from field name or metadata
 */
function inferTargetObject(
  field: string,
  metadata: AttributeMetadata
): string | null {
  // Priority 1: Use relationship.object from metadata
  if (metadata.relationship?.object) {
    return metadata.relationship.object;
  }

  // Priority 2: Infer from field name
  const fieldLower = field.toLowerCase();
  for (const [pattern, target] of Object.entries(FIELD_TO_TARGET_OBJECT)) {
    if (fieldLower === pattern || fieldLower.includes(pattern)) {
      return target;
    }
  }

  return null;
}

/**
 * Extract record ID from various input formats
 */
function extractRecordId(item: unknown): string | null {
  // String: "uuid" → "uuid"
  if (typeof item === 'string') {
    return item.trim() || null;
  }

  // Object formats
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;

    // Already correct format: { target_record_id: "uuid" }
    if (typeof obj.target_record_id === 'string') {
      return obj.target_record_id;
    }

    // Legacy format: { record_id: "uuid" }
    if (typeof obj.record_id === 'string') {
      return obj.record_id;
    }

    // Sometimes: { id: "uuid" }
    if (typeof obj.id === 'string') {
      return obj.id;
    }
  }

  return null;
}

/**
 * Transform a single value to record-reference format
 */
function transformSingleValue(
  item: unknown,
  targetObject: string
): RecordReferenceValue | null {
  const recordId = extractRecordId(item);
  if (!recordId) return null;

  return {
    target_object: targetObject,
    target_record_id: recordId,
  };
}

/**
 * Transform a record-reference value to Attio API format
 *
 * @param value - The value to transform
 * @param field - The field/attribute slug
 * @param context - Transformation context
 * @param attrMeta - Attribute metadata
 * @returns Transform result
 */
export async function transformRecordReferenceValue(
  value: unknown,
  field: string,
  context: TransformContext,
  attrMeta: AttributeMetadata
): Promise<TransformResult> {
  // Only transform record-reference attributes
  if (!isRecordReferenceType(attrMeta.type)) {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Skip null/undefined values
  if (value === null || value === undefined) {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Skip if already in correct format
  if (isCorrectFormat(value)) {
    debug(
      'record-reference-transformer',
      `Value already in correct format, skipping`,
      {
        field,
        resourceType: context.resourceType,
      },
      'transformRecordReferenceValue',
      OperationType.DATA_PROCESSING
    );
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Determine target object type
  const targetObject = inferTargetObject(field, attrMeta);
  if (!targetObject) {
    debug(
      'record-reference-transformer',
      `Could not determine target object for field ${field}, skipping transformation`,
      {
        field,
        resourceType: context.resourceType,
        metadataRelationship: attrMeta.relationship,
      },
      'transformRecordReferenceValue',
      OperationType.DATA_PROCESSING
    );
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
      description: `Could not determine target object for record-reference field ${field}`,
    };
  }

  // Transform based on input type
  let transformedValue: RecordReferenceValue[];

  if (Array.isArray(value)) {
    // Array of values (strings or objects)
    const transformed: RecordReferenceValue[] = [];
    for (const item of value) {
      const ref = transformSingleValue(item, targetObject);
      if (ref) {
        transformed.push(ref);
      }
    }
    transformedValue = transformed;
  } else {
    // Single value (string or object)
    const ref = transformSingleValue(value, targetObject);
    if (!ref) {
      return {
        transformed: false,
        originalValue: value,
        transformedValue: value,
        description: `Could not extract record ID from value for field ${field}`,
      };
    }
    transformedValue = [ref];
  }

  debug(
    'record-reference-transformer',
    `Transformed record-reference value`,
    {
      field,
      targetObject,
      originalType: Array.isArray(value) ? 'array' : typeof value,
      transformedCount: transformedValue.length,
      resourceType: context.resourceType,
    },
    'transformRecordReferenceValue',
    OperationType.DATA_PROCESSING
  );

  return {
    transformed: true,
    originalValue: value,
    transformedValue,
    description: `Formatted ${field} as record-reference array with target_object="${targetObject}"`,
  };
}

/**
 * Check if a value needs record-reference formatting
 * Useful for validation without transformation
 *
 * @param value - The value to check
 * @param attrMeta - Attribute metadata
 * @returns true if the value needs formatting
 */
export function needsRecordReferenceFormatting(
  value: unknown,
  attrMeta: AttributeMetadata
): boolean {
  if (!isRecordReferenceType(attrMeta.type)) return false;
  if (value === null || value === undefined) return false;
  if (isCorrectFormat(value)) return false;
  return true;
}
