/**
 * Field collision detection and resolution
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { mapFieldName } from '../transformers/field-mapper.js';
import { RESOURCE_TYPE_MAPPINGS as FIELD_MAPPINGS } from '../constants/index.js';
import { UniversalResourceType } from '../types.js';

/**
 * Gets suggestions for resolving field collisions
 * Provides intelligent recommendations based on field characteristics
 */
function getFieldCollisionSuggestion(
  resourceType: UniversalResourceType,
  targetField: string,
  conflictingFields: string[]
): string {
  if (!mapping) return '';

  // Check if any of the conflicting fields is the actual target field
  if (preferredField) {
    return `Recommended: Use "${preferredField}" instead of the mapped alternatives.`;
  }

  // Find the most "canonical" field name (shortest, most direct)
    // Prefer fields without underscores/prefixes
      (a.includes('_') ? 1 : 0) + (a.includes(resourceType) ? 1 : 0);
      (b.includes('_') ? 1 : 0) + (b.includes(resourceType) ? 1 : 0);
    if (aScore !== bScore) return aScore - bScore;
    return a.length - b.length;
  });

  return `Recommended: Use "${sortedFields[0]}" for clarity.`;
}

/**
 * Detects field name collisions where multiple input fields map to the same output field
 * Essential for preventing data overwrites and API conflicts
 */
export async function detectFieldCollisions(
  resourceType: UniversalResourceType,
  recordData: Record<string, unknown>,
  availableAttributes?: string[]
): Promise<{
  hasCollisions: boolean;
  errors: string[];
  collisions: Record<string, string[]>;
}> {
  if (!mapping) {
    return { hasCollisions: false, errors: [], collisions: {} };
  }

  // Map each target field to all input fields that map to it
  const targetToInputs: Record<string, string[]> = {};
  const errors: string[] = [];

  for (const [inputField] of Object.entries(recordData)) {
    // Skip null-mapped fields
    if (mapping.fieldMappings[inputField.toLowerCase()] === null) {
      continue;
    }

      resourceType,
      inputField,
      availableAttributes
    );

    // Harden against Promise-as-key bugs: validate targetField is a valid string
    if (typeof targetField !== 'string' || !targetField) {
      errors.push(
        `Internal mapping error: non-string target for "${inputField}". ` +
          `Got ${Object.prototype.toString.call(targetField)}`
      );
      continue;
    }

    if (!targetToInputs[targetField]) {
      targetToInputs[targetField] = [];
    }
    targetToInputs[targetField].push(inputField);
  }

  // Find collisions (multiple inputs mapping to same target)
  const collisions: Record<string, string[]> = {};
  let hasCollisions = false;

  for (const [targetField, inputFields] of Object.entries(targetToInputs)) {
    if (inputFields.length > 1) {
      // Special case: first_name + last_name → name is allowed
      if (
        resourceType === UniversalResourceType.PEOPLE &&
        targetField === 'name' &&
        inputFields.every((f) => ['first_name', 'last_name'].includes(f))
      ) {
        continue; // This collision is handled specially
      }

      collisions[targetField] = inputFields;
      hasCollisions = true;

        resourceType,
        targetField,
        inputFields
      );

      errors.push(
        `Field collision detected: ${inputFieldsList} all map to "${targetField}". ` +
          `Please use only one field. ${suggestion}`
      );
    }
  }

  return { hasCollisions, errors, collisions };
}
