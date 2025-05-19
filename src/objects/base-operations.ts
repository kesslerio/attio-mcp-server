/**
 * Base operations for all Attio objects with dynamic field detection
 */
import { formatAllAttributes } from '../api/attribute-types.js';
import { createObjectRecord, updateObjectRecord, deleteObjectRecord } from './records.js';
import { ResourceType, AttioRecord } from '../types/attio.js';

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
  validator?: (attrs: any) => Promise<any>
): Promise<T> {
  // Validate if validator provided
  const validatedAttributes = validator ? await validator(attributes) : attributes;
  
  // Use dynamic field type detection to format attributes correctly
  const transformedAttributes = await formatAllAttributes(objectType, validatedAttributes);
  
  // Debug log to help diagnose issues
  if (process.env.NODE_ENV === 'development') {
    console.log(`[createObjectWithDynamicFields:${objectType}] Attributes after transformation:`, 
      JSON.stringify(transformedAttributes, null, 2));
  }
  
  try {
    // Create the object
    return await createObjectRecord<T>(objectType, transformedAttributes);
  } catch (error) {
    console.error(`[createObjectWithDynamicFields:${objectType}] Error creating record:`, 
      error instanceof Error ? error.message : String(error));
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
  validator?: (id: string, attrs: any) => Promise<any>
): Promise<T> {
  // Validate if validator provided
  const validatedAttributes = validator ? await validator(recordId, attributes) : attributes;
  
  // Use dynamic field type detection to format attributes correctly
  const transformedAttributes = await formatAllAttributes(objectType, validatedAttributes);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[update${objectType}] Original attributes:`, JSON.stringify(validatedAttributes, null, 2));
    console.log(`[update${objectType}] Transformed attributes:`, JSON.stringify(transformedAttributes, null, 2));
  }
  
  // Update the object
  return await updateObjectRecord<T>(objectType, recordId, transformedAttributes);
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
export async function updateObjectAttributeWithDynamicFields<T extends AttioRecord>(
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