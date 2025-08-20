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

  // Debug log to help diagnose issues
  if (process.env.NODE_ENV === 'development') {
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

    if (process.env.NODE_ENV === 'development') {
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
  return await updateObjectRecord<T>(
    objectType,
    recordId,
    transformedAttributes
  );
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
