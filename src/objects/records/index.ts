/**
 * Record-related functionality
 */
import { getAttioClient } from '../../api/attio-client.js';
import {
  type BatchConfig,
  type BatchResponse,
  batchCreateRecords,
  batchUpdateRecords,
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  updateRecord,
} from '../../api/operations/index.js';
import type {
  AttioRecord,
  RecordAttributes,
  RecordListParams,
  ResourceType,
} from '../../types/attio.js';

/**
 * Creates a new record for a specific object type
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param attributes - Record attributes as key-value pairs
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Created record
 */
export async function createObjectRecord<T extends AttioRecord>(
  objectSlug: string | ResourceType,
  attributes: RecordAttributes,
  objectId?: string
): Promise<T> {
  // Ensure objectSlug is a string value, not undefined
  if (!objectSlug) {
    throw new Error(
      '[createObjectRecord] Object slug is required for creating records'
    );
  }

  // Normalize objectSlug to ensure proper type handling
  const normalizedSlug =
    typeof objectSlug === 'string' ? objectSlug : String(objectSlug);

  // Add debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[createObjectRecord] Creating record for object type: ${normalizedSlug}`
    );
    console.log(
      '[createObjectRecord] Attributes:',
      JSON.stringify(attributes, null, 2)
    );
  }

  try {
    // Use the core API function
    return await createRecord<T>({
      objectSlug: normalizedSlug,
      objectId,
      attributes,
    });
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    }
    if (typeof error === 'string') {
      throw new Error(error);
    }

    // Fallback implementation in case the core function fails
    try {
      const api = getAttioClient();
      const path = `/objects/${objectId || objectSlug}/records`;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[createObjectRecord:fallback] API path: ${path}`);
        console.log('[createObjectRecord:fallback] Sending payload:', {
          data: {
            values: attributes,
          },
        });
      }

      // Use the same payload format as the main implementation
      const response = await api.post(path, {
        data: {
          values: attributes,
        },
      });

      return response.data.data;
    } catch (fallbackError) {
      throw fallbackError instanceof Error
        ? fallbackError
        : new Error(String(fallbackError));
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
    return await getRecord<T>(objectSlug, recordId, attributes, objectId);
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
      throw fallbackError instanceof Error
        ? fallbackError
        : new Error(String(fallbackError));
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
      attributes,
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
        attributes,
      });

      return response.data.data;
    } catch (fallbackError) {
      throw fallbackError instanceof Error
        ? fallbackError
        : new Error(String(fallbackError));
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
    return await deleteRecord(objectSlug, recordId, objectId);
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
      throw fallbackError instanceof Error
        ? fallbackError
        : new Error(String(fallbackError));
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
      ...options,
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

      const path = `/objects/${objectId || objectSlug}/records${
        queryParams.toString() ? '?' + queryParams.toString() : ''
      }`;

      const response = await api.get(path);
      return response.data.data || [];
    } catch (fallbackError) {
      throw fallbackError instanceof Error
        ? fallbackError
        : new Error(String(fallbackError));
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
    const recordItems = records.map((attributes) => ({ attributes }));

    // Use the core API function
    const createdRecords = await batchCreateRecords<T>(
      {
        objectSlug,
        objectId,
        records: recordItems,
      },
      batchConfig?.retryConfig
    );

    // Format as batch response
    return {
      results: createdRecords.map((record) => ({
        success: true,
        data: record,
      })),
      summary: {
        total: records.length,
        succeeded: createdRecords.length,
        failed: records.length - createdRecords.length,
      },
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
        failed: 0,
      },
    };

    // Process each record individually
    await Promise.all(
      records.map(async (recordAttributes, index) => {
        try {
          const record = await createObjectRecord<T>(
            objectSlug,
            recordAttributes,
            objectId
          );

          results.results.push({
            id: `create_record_${index}`,
            success: true,
            data: record,
          });

          results.summary.succeeded++;
        } catch (createError) {
          results.results.push({
            id: `create_record_${index}`,
            success: false,
            error: createError,
          });

          results.summary.failed++;
        }
      })
    );

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
    const updatedRecords = await batchUpdateRecords<T>(
      {
        objectSlug,
        objectId,
        records,
      },
      batchConfig?.retryConfig
    );

    // Format as batch response
    return {
      results: updatedRecords.map((record, index) => ({
        id: records[index].id,
        success: true,
        data: record,
      })),
      summary: {
        total: records.length,
        succeeded: updatedRecords.length,
        failed: records.length - updatedRecords.length,
      },
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
        failed: 0,
      },
    };

    // Process each record individually
    await Promise.all(
      records.map(async (record) => {
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
            data: updatedRecord,
          });

          results.summary.succeeded++;
        } catch (updateError) {
          results.results.push({
            id: record.id,
            success: false,
            error: updateError,
          });

          results.summary.failed++;
        }
      })
    );

    return results;
  }
}

// Re-export formatting utilities
export { formatRecordAttribute, formatRecordAttributes } from './formatters.js';
