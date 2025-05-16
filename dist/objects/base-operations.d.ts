import { ResourceType, AttioRecord } from '../types/attio.js';
/**
 * Creates a new object record with dynamic field formatting
 *
 * @param objectType - The type of object (companies, people, etc.)
 * @param attributes - Raw attributes for object creation
 * @param validator - Optional validator function
 * @returns Created object record
 */
export declare function createObjectWithDynamicFields<T extends AttioRecord>(objectType: ResourceType, attributes: any, validator?: (attrs: any) => Promise<any>): Promise<T>;
/**
 * Updates an existing object record with dynamic field formatting
 *
 * @param objectType - The type of object (companies, people, etc.)
 * @param recordId - ID of the record to update
 * @param attributes - Raw attributes to update
 * @param validator - Optional validator function
 * @returns Updated object record
 */
export declare function updateObjectWithDynamicFields<T extends AttioRecord>(objectType: ResourceType, recordId: string, attributes: any, validator?: (id: string, attrs: any) => Promise<any>): Promise<T>;
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
export declare function updateObjectAttributeWithDynamicFields<T extends AttioRecord>(objectType: ResourceType, recordId: string, attributeName: string, attributeValue: any, updateFn: (id: string, attrs: any) => Promise<T>): Promise<T>;
/**
 * Deletes an object record
 *
 * @param objectType - The type of object (companies, people, etc.)
 * @param recordId - ID of the record to delete
 * @param validator - Optional validator function
 * @returns True if deletion was successful
 */
export declare function deleteObjectWithValidation(objectType: ResourceType, recordId: string, validator?: (id: string) => void): Promise<boolean>;
//# sourceMappingURL=base-operations.d.ts.map