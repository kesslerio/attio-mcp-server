/**
 * Base operations for all Attio objects with dynamic field detection
 */
import { formatAllAttributes } from '../api/attribute-types.js';
import {
  createObjectRecord,
  updateObjectRecord,
  deleteObjectRecord,
} from './records/index.js';
import { ResourceType, AttioRecord } from '../types/attio.js';
import { getAttributeSlug } from '../utils/attribute-mapping/index.js';

/**
 * Translates all attribute names in a record using the attribute mapping system
 *
 * @param objectType - The type of object (companies, people, etc.)
 * @param attributes - Raw attributes object with user-friendly names
 * @returns Attributes object with API-compatible attribute names
 */
function translateAttributeNames(
  objectType: ResourceType,
  attributes: Record<string, unknown>
): Record<string, unknown> {
  const translated: Record<string, unknown> = {};

  for (const [userKey, value] of Object.entries(attributes)) {
    // Translate the attribute name using the mapping system
    const apiKey = getAttributeSlug(userKey, objectType);

    // Log the translation in development mode
    if (process.env.NODE_ENV === 'development' && userKey !== apiKey) {
      console.error(
        `[translateAttributeNames:${objectType}] Mapped "${userKey}" -> "${apiKey}"`
      );
    }

    translated[apiKey] = value;
  }

  return translated;
}

/**
 * Creates a new object record with dynamic field formatting
 *
 * @param objectType - The type of object (companies, people, etc.)
 * @param attributes - Raw attributes for object creation
 * @param validator - Optional validator function
 * @returns Created object record
 */
export async function createObjectWithDynamicFields<T extends AttioRecord>(
  objectType: ResourceType,
  attributes: any,
  validator?: (attrs: any) => Promise<unknown>
): Promise<T> {
  // Validate if validator provided
  const validatedAttributes = validator
    ? await validator(attributes)
    : attributes;

  // Translate attribute names using the mapping system (e.g., "b2b_segment" -> "type_persona")
  const mappedAttributes = translateAttributeNames(
    objectType,
    validatedAttributes
  );

  // Use dynamic field type detection to format attributes correctly
  const transformedAttributes = await formatAllAttributes(
    objectType,
    mappedAttributes
  );

  // Debug log to help diagnose issues (includes E2E mode)
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.E2E_MODE === 'true'
  ) {
    console.error(
      `[createObjectWithDynamicFields:${objectType}] Original attributes:`,
      JSON.stringify(validatedAttributes, null, 2)
    );
    console.error(
      `[createObjectWithDynamicFields:${objectType}] Mapped attributes:`,
      JSON.stringify(mappedAttributes, null, 2)
    );
    console.error(
      `[createObjectWithDynamicFields:${objectType}] Final transformed attributes:`,
      JSON.stringify(transformedAttributes, null, 2)
    );
  }

  try {
    // Create the object
    const result = await createObjectRecord<T>(
      objectType,
      transformedAttributes
    );

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.E2E_MODE === 'true'
    ) {
      console.error(
        `[createObjectWithDynamicFields:${objectType}] Result from createObjectRecord:`,
        {
          result,
          hasId: !!result?.id,
          hasValues: !!result?.values,
          resultType: typeof result,
          isEmptyObject: result && Object.keys(result).length === 0,
        }
      );
    }

    // Additional check for empty objects that might slip through, but allow legitimate create responses
    const looksLikeCreatedRecord =
      result &&
      typeof result === 'object' &&
      (('id' in result && (result as any).id?.record_id) ||
        'record_id' in result ||
        'web_url' in result ||
        'created_at' in result);

    if (
      !result ||
      (typeof result === 'object' &&
        Object.keys(result).length === 0 &&
        !looksLikeCreatedRecord)
    ) {
      // For companies, allow empty results to pass through to createObjectRecord fallback logic
      if (objectType === ResourceType.COMPANIES) {
        if (
          process.env.NODE_ENV === 'development' ||
          process.env.E2E_MODE === 'true'
        ) {
          console.error(
            `[createObjectWithDynamicFields:${objectType}] Empty result detected, passing to createObjectRecord fallback`
          );
        }
        return result; // Let createObjectRecord handle the fallback
      }

      throw new Error(
        `Create operation returned empty result for ${objectType}`
      );
    }

    return result;
  } catch (error: unknown) {
    console.error(
      `[createObjectWithDynamicFields:${objectType}] Error creating record:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Updates an existing object record with dynamic field formatting
 *
 * @param objectType - The type of object (companies, people, etc.)
 * @param recordId - ID of the record to update
 * @param attributes - Raw attributes to update
 * @param validator - Optional validator function
 * @returns Updated object record
 */
export async function updateObjectWithDynamicFields<T extends AttioRecord>(
  objectType: ResourceType,
  recordId: string,
  attributes: any,
  validator?: (id: string, attrs: any) => Promise<unknown>
): Promise<T> {
  // Validate if validator provided
  const validatedAttributes = validator
    ? await validator(recordId, attributes)
    : attributes;

  // Translate attribute names using the mapping system (e.g., "b2b_segment" -> "type_persona")
  const mappedAttributes = translateAttributeNames(
    objectType,
    validatedAttributes
  );

  // Use dynamic field type detection to format attributes correctly
  const transformedAttributes = await formatAllAttributes(
    objectType,
    mappedAttributes
  );

  if (process.env.NODE_ENV === 'development') {
    console.error(
      `[updateObjectWithDynamicFields:${objectType}] Original attributes:`,
      JSON.stringify(validatedAttributes, null, 2)
    );
    console.error(
      `[updateObjectWithDynamicFields:${objectType}] Mapped attributes:`,
      JSON.stringify(mappedAttributes, null, 2)
    );
    console.error(
      `[updateObjectWithDynamicFields:${objectType}] Final transformed attributes:`,
      JSON.stringify(transformedAttributes, null, 2)
    );
  }

  // Update the object
  const result = await updateObjectRecord<T>(
    objectType,
    recordId,
    transformedAttributes
  );

  // Additional check for empty objects that might slip through
  // For companies, allow empty results to pass through since updateRecord has fallback logic
  if (
    !result ||
    (typeof result === 'object' && Object.keys(result).length === 0)
  ) {
    // For companies, the updateRecord function has fallback logic that should handle empty responses
    if (objectType === ResourceType.COMPANIES) {
      if (
        process.env.NODE_ENV === 'development' ||
        process.env.E2E_MODE === 'true'
      ) {
        console.error(
          `[updateObjectWithDynamicFields:${objectType}] Empty result detected for update, allowing fallback logic to handle`
        );
      }
      // The fallback should have been handled in updateRecord, if we still get empty result, something is wrong
      if (!result) {
        throw new Error(
          `Update operation returned null result for ${objectType} record: ${recordId}`
        );
      }
      // Empty object might be a valid result from fallback, return it
      return result;
    }

    throw new Error(
      `Update operation returned empty result for ${objectType} record: ${recordId}`
    );
  }

  return result;
}

/**
 * Updates a specific attribute of an object with dynamic field formatting
 *
 * @param objectType - The type of object (companies, people, etc.)
 * @param recordId - ID of the record to update
 * @param attributeName - Name of the attribute to update
 * @param attributeValue - New value for the attribute
 * @param updateFn - The update function to use
 * @returns Updated object record
 */
export async function updateObjectAttributeWithDynamicFields<
  T extends AttioRecord,
>(
  objectType: ResourceType,
  recordId: string,
  attributeName: string,
  attributeValue: any,
  updateFn: (id: string, attrs: any) => Promise<T>
): Promise<T> {
  // Update the specific attribute using the provided update function
  const attributes = { [attributeName]: attributeValue };
  return await updateFn(recordId, attributes);
}

/**
 * Deletes an object record
 *
 * @param objectType - The type of object (companies, people, etc.)
 * @param recordId - ID of the record to delete
 * @param validator - Optional validator function
 * @returns True if deletion was successful
 */
export async function deleteObjectWithValidation(
  objectType: ResourceType,
  recordId: string,
  validator?: (id: string) => void
): Promise<boolean> {
  // Validate if validator provided
  if (validator) {
    validator(recordId);
  }

  // Delete the object
  return await deleteObjectRecord(objectType, recordId);
}
