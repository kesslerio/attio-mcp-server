/**
 * Record-related functionality
 */
import { getAttioClient } from "../api/attio-client.js";
import {
  createRecord,
  getRecord,
  updateRecord,
  deleteRecord,
  listRecords,
  batchCreateRecords,
  batchUpdateRecords,
  BatchConfig,
  BatchResponse
} from "../api/attio-operations.js";
import {
  ResourceType,
  AttioRecord,
  RecordAttributes,
  RecordCreateParams,
  RecordUpdateParams,
  RecordListParams,
  RecordBatchCreateParams,
  RecordBatchUpdateParams
} from "../types/attio.js";

/**
 * Creates a new record for a specific object type
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param attributes - Record attributes as key-value pairs
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Created record
 */
export async function createObjectRecord<T extends AttioRecord>(
  objectSlug: string,
  attributes: RecordAttributes,
  objectId?: string
): Promise<T> {
  try {
    // Use the core API function
    return await createRecord<T>({
      objectSlug,
      objectId,
      attributes
    });
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    } else if (typeof error === 'string') {
      throw new Error(error);
    }
    
    // Fallback implementation in case the core function fails
    try {
      const api = getAttioClient();
      const path = `/objects/${objectId || objectSlug}/records`;
      
      const response = await api.post(path, {
        attributes
      });
      
      return response.data.data;
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Gets details for a specific record
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to retrieve
 * @param attributes - Optional list of attribute slugs to include
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Record details
 */
export async function getObjectRecord<T extends AttioRecord>(
  objectSlug: string,
  recordId: string,
  attributes?: string[],
  objectId?: string
): Promise<T> {
  try {
    // Use the core API function
    return await getRecord<T>(
      objectSlug,
      recordId,
      attributes,
      objectId
    );
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation in case the core function fails
    try {
      const api = getAttioClient();
      let path = `/objects/${objectId || objectSlug}/records/${recordId}`;
      
      // Add attributes parameter if provided
      if (attributes && attributes.length > 0) {
        const attributesParam = attributes.join(',');
        path += `?attributes=${encodeURIComponent(attributesParam)}`;
      }
      
      const response = await api.get(path);
      return response.data.data;
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Updates a specific record
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to update
 * @param attributes - Record attributes to update
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Updated record
 */
export async function updateObjectRecord<T extends AttioRecord>(
  objectSlug: string,
  recordId: string,
  attributes: RecordAttributes,
  objectId?: string
): Promise<T> {
  try {
    // Use the core API function
    return await updateRecord<T>({
      objectSlug,
      objectId,
      recordId,
      attributes
    });
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation in case the core function fails
    try {
      const api = getAttioClient();
      const path = `/objects/${objectId || objectSlug}/records/${recordId}`;
      
      const response = await api.patch(path, {
        attributes
      });
      
      return response.data.data;
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Deletes a specific record
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to delete
 * @param objectId - Optional object ID (alternative to slug)
 * @returns True if deletion was successful
 */
export async function deleteObjectRecord(
  objectSlug: string,
  recordId: string,
  objectId?: string
): Promise<boolean> {
  try {
    // Use the core API function
    return await deleteRecord(
      objectSlug,
      recordId,
      objectId
    );
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation in case the core function fails
    try {
      const api = getAttioClient();
      const path = `/objects/${objectId || objectSlug}/records/${recordId}`;
      
      await api.delete(path);
      return true;
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Lists records for a specific object type with filtering options
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param options - Optional listing options (pagination, filtering, etc.)
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Array of records
 */
export async function listObjectRecords<T extends AttioRecord>(
  objectSlug: string,
  options: Omit<RecordListParams, 'objectSlug' | 'objectId'> = {},
  objectId?: string
): Promise<T[]> {
  try {
    // Use the core API function
    return await listRecords<T>({
      objectSlug,
      objectId,
      ...options
    });
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation in case the core function fails
    try {
      const api = getAttioClient();
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.page) {
        queryParams.append('page', String(options.page));
      }
      
      if (options.pageSize) {
        queryParams.append('pageSize', String(options.pageSize));
      }
      
      if (options.query) {
        queryParams.append('query', options.query);
      }
      
      if (options.attributes && options.attributes.length > 0) {
        queryParams.append('attributes', options.attributes.join(','));
      }
      
      if (options.sort) {
        queryParams.append('sort', options.sort);
      }
      
      if (options.direction) {
        queryParams.append('direction', options.direction);
      }
      
      const path = `/objects/${objectId || objectSlug}/records${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await api.get(path);
      return response.data.data || [];
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Creates multiple records in a batch operation
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param records - Array of record attributes to create
 * @param objectId - Optional object ID (alternative to slug)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with created records
 */
export async function batchCreateObjectRecords<T extends AttioRecord>(
  objectSlug: string,
  records: RecordAttributes[],
  objectId?: string,
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<T>> {
  try {
    // Map records to the expected format
    const recordItems = records.map(attributes => ({ attributes }));
    
    // Use the core API function
    const createdRecords = await batchCreateRecords<T>({
      objectSlug,
      objectId,
      records: recordItems
    }, batchConfig?.retryConfig);
    
    // Format as batch response
    return {
      results: createdRecords.map(record => ({
        success: true,
        data: record
      })),
      summary: {
        total: records.length,
        succeeded: createdRecords.length,
        failed: records.length - createdRecords.length
      }
    };
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation - execute each creation individually
    const results: BatchResponse<T> = {
      results: [],
      summary: {
        total: records.length,
        succeeded: 0,
        failed: 0
      }
    };
    
    // Process each record individually
    await Promise.all(records.map(async (recordAttributes, index) => {
      try {
        const record = await createObjectRecord<T>(
          objectSlug,
          recordAttributes,
          objectId
        );
        
        results.results.push({
          id: `create_record_${index}`,
          success: true,
          data: record
        });
        
        results.summary.succeeded++;
      } catch (createError) {
        results.results.push({
          id: `create_record_${index}`,
          success: false,
          error: createError
        });
        
        results.summary.failed++;
      }
    }));
    
    return results;
  }
}

/**
 * Updates multiple records in a batch operation
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param records - Array of records with IDs and attributes to update
 * @param objectId - Optional object ID (alternative to slug)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with updated records
 */
export async function batchUpdateObjectRecords<T extends AttioRecord>(
  objectSlug: string,
  records: Array<{ id: string; attributes: RecordAttributes }>,
  objectId?: string,
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<T>> {
  try {
    // Use the core API function
    const updatedRecords = await batchUpdateRecords<T>({
      objectSlug,
      objectId,
      records
    }, batchConfig?.retryConfig);
    
    // Format as batch response
    return {
      results: updatedRecords.map((record, index) => ({
        id: records[index].id,
        success: true,
        data: record
      })),
      summary: {
        total: records.length,
        succeeded: updatedRecords.length,
        failed: records.length - updatedRecords.length
      }
    };
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation - execute each update individually
    const results: BatchResponse<T> = {
      results: [],
      summary: {
        total: records.length,
        succeeded: 0,
        failed: 0
      }
    };
    
    // Process each record individually
    await Promise.all(records.map(async (record) => {
      try {
        const updatedRecord = await updateObjectRecord<T>(
          objectSlug,
          record.id,
          record.attributes,
          objectId
        );
        
        results.results.push({
          id: record.id,
          success: true,
          data: updatedRecord
        });
        
        results.summary.succeeded++;
      } catch (updateError) {
        results.results.push({
          id: record.id,
          success: false,
          error: updateError
        });
        
        results.summary.failed++;
      }
    }));
    
    return results;
  }
}

/**
 * Helper function to format record attribute values based on their type
 * 
 * @param key - Attribute key
 * @param value - Attribute value to format
 * @returns Properly formatted attribute value for the API
 */
export function formatRecordAttribute(key: string, value: any): any {
  // If value is null or undefined, return it as is
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Handle different attribute types based on common patterns
  
  // Currency attributes
  if (typeof value === 'number' && (key.includes('price') || key.includes('revenue') || key.includes('cost'))) {
    // Simple number format
    return value;
    
    // Alternative: Full currency object format
    // return {
    //   amount: value,
    //   currency: 'USD' // Default currency
    // };
  }
  
  // Address attributes
  if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
      (key.includes('address') || key.includes('location'))) {
    // Check if it's already in the expected format
    if ('street' in value || 'city' in value || 'country' in value) {
      return value;
    }
  }
  
  // Link attributes (references to other records)
  if (typeof value === 'string' && value.match(/^record_[a-z0-9]+$/)) {
    return {
      record_id: value
    };
  }
  
  // Default: return as is
  return value;
}

/**
 * Formats a complete set of record attributes for API requests
 * 
 * @param attributes - Raw attribute key-value pairs
 * @returns Formatted attributes object ready for API submission
 */
export function formatRecordAttributes(attributes: Record<string, any>): RecordAttributes {
  const formattedAttributes: RecordAttributes = {};
  
  for (const [key, value] of Object.entries(attributes)) {
    formattedAttributes[key] = formatRecordAttribute(key, value);
  }
  
  return formattedAttributes;
}