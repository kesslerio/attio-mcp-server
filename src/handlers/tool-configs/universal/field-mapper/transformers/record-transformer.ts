/**
 * Record-level field transformation and mapping
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';
import { RESOURCE_TYPE_MAPPINGS as FIELD_MAPPINGS } from '../constants/index.js';
import { detectFieldCollisions } from '../validators/collision-detector.js';
import { processCategories } from '../validators/category-validator.js';
import { mapFieldName } from './field-mapper.js';
import { transformFieldValue } from './value-transformer.js';

/**
 * Maps and transforms all fields in a record for a specific resource type
 * Performs comprehensive field processing including collision detection,
 * field mapping, value transformation, and special handling for complex fields
 */
export async function mapRecordFields(
  resourceType: UniversalResourceType,
  recordData: Record<string, unknown>,
  availableAttributes?: string[]
): Promise<{
  mapped: Record<string, unknown>;
  warnings: string[];
  errors?: string[];
}> {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return { mapped: recordData, warnings: [] };
  }

  // First pass: detect field collisions
  const collisionResult = await detectFieldCollisions(
    resourceType,
    recordData,
    availableAttributes
  );
  if (collisionResult.hasCollisions) {
    return {
      mapped: {},
      warnings: [],
      errors: collisionResult.errors,
    };
  }

  const mapped: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(recordData)) {
    const mappedKey = await mapFieldName(
      resourceType,
      key,
      availableAttributes
    );

    // Harden against Promise-as-key bugs: validate mappedKey is a valid string
    if (typeof mappedKey !== 'string' || !mappedKey) {
      warnings.push(`Skipped field "${key}" due to invalid mapped key.`);
      continue;
    }

    // Skip null-mapped fields
    if (mapping.fieldMappings[key.toLowerCase()] === null) {
      warnings.push(
        `Field "${key}" is not available for ${resourceType}. ${mapping.commonMistakes[key.toLowerCase()] || ''}`
      );
      continue;
    }

    // Check if this field was mapped
    if (mappedKey !== key) {
      const mistake = mapping.commonMistakes[key.toLowerCase()];
      if (mistake) {
        warnings.push(`Field "${key}" mapped to "${mappedKey}": ${mistake}`);
      } else {
        warnings.push(
          `Field "${key}" was automatically mapped to "${mappedKey}"`
        );
      }
    }

    // Special handling for certain fields
    if (
      resourceType === UniversalResourceType.PEOPLE &&
      (key === 'first_name' || key === 'last_name')
    ) {
      // Combine first and last name into full name
      if (!mapped.name) {
        const firstName = recordData.first_name || '';
        const lastName = recordData.last_name || '';
        mapped.name = `${firstName} ${lastName}`.trim();
        warnings.push(`Combined first_name and last_name into "name" field`);
      }
    } else {
      // Process categories field with validation and auto-conversion (Issues #220/#218)
      if (
        key.toLowerCase() === 'categories' ||
        mappedKey.toLowerCase() === 'categories'
      ) {
        const categoryResult = processCategories(resourceType, key, value);

        if (categoryResult.errors.length > 0) {
          warnings.push(...categoryResult.errors);
          // Don't assign invalid categories, but continue processing other fields
          continue;
        }

        if (categoryResult.warnings.length > 0) {
          warnings.push(...categoryResult.warnings);
        }

        mapped[mappedKey] = categoryResult.processedValue;
      } else {
        // Apply field value transformation before assignment
        const transformedValue = await transformFieldValue(
          resourceType,
          mappedKey,
          value
        );
        mapped[mappedKey] = transformedValue;
      }
    }
  }

  return { mapped, warnings };
}