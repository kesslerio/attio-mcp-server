/**
 * OpenAI-compliant fetch tool implementation
 * Retrieves detailed information for a specific record
 */

import { getAttioClient } from '../api/attio-client.js';
import { executeToolRequest } from '../handlers/tools/dispatcher.js';
import { debug, warn } from '../utils/logger.js';
import { transformToFetchResult } from './transformers/index.js';
import type { OpenAIFetchResult, SupportedAttioType } from './types.js';

/**
 * Fetch detailed information for a specific record
 * @param id - Record identifier (can be in format "type:id" or just "id")
 * @returns Detailed record information in OpenAI format
 */
export async function fetch(id: string): Promise<OpenAIFetchResult> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID parameter is required and must be a string');
  }

  debug('OpenAI', 'Fetching record with ID', { id }, 'fetch');

  // Parse the ID to determine resource type
  const { resourceType, recordId } = parseRecordId(id);

  try {
    // Use the universal get-record-details tool
    const request = {
      method: 'tools/call' as const,
      params: {
        name: 'get-record-details',
        arguments: {
          resource_type: resourceType,
          record_id: recordId,
        },
      },
    };

    const result = await executeToolRequest(request);

    if (result.toolResult?.type === 'text') {
      // Parse the detailed response
      const record = parseDetailResponse(
        result.toolResult.content,
        resourceType,
        recordId
      );

      // Get additional details using get-detailed-info tool
      const detailsRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'get-detailed-info',
          arguments: {
            resource_type: resourceType,
            record_id: recordId,
            info_type: 'full',
            format: 'object',
          },
        },
      };

      const detailsResult = await executeToolRequest(detailsRequest);

      if (detailsResult.toolResult?.type === 'text') {
        const additionalDetails = parseDetailResponse(
          detailsResult.toolResult.content,
          resourceType,
          recordId
        );
        // Merge additional details
        Object.assign(record, additionalDetails);
      }

      // Transform to OpenAI format
      const transformed = transformToFetchResult(record, resourceType);
      if (transformed) {
        debug('OpenAI', 'Successfully fetched record', { id }, 'fetch');
        return transformed;
      }
    }

    throw new Error(`Record not found: ${id}`);
  } catch (error: any) {
    // Fallback to direct API call
    debug(
      'OpenAI',
      'Falling back to direct API call',
      { resourceType, recordId },
      'fetch'
    );
    return fetchDirect(resourceType, recordId);
  }
}

/**
 * Parse record ID to extract resource type and actual ID
 * @param id - ID string (format: "companies:abc123" or just "abc123")
 * @returns Parsed resource type and record ID
 */
function parseRecordId(id: string): {
  resourceType: SupportedAttioType;
  recordId: string;
} {
  // Check if ID includes resource type prefix
  const parts = id.split(':');

  if (parts.length === 2) {
    const [type, recordId] = parts;
    if (isValidResourceType(type)) {
      return { resourceType: type as SupportedAttioType, recordId };
    }
  }

  // Try to determine type by ID format or default to companies
  // In a real implementation, we might want to search across types
  return { resourceType: 'companies', recordId: id };
}

/**
 * Check if a string is a valid resource type
 */
function isValidResourceType(type: string): boolean {
  return ['companies', 'people', 'lists', 'tasks', 'records'].includes(type);
}

/**
 * Parse the text response from universal detail tools
 * @param content - Text content from tool response
 * @param resourceType - Type of resource
 * @param recordId - Record ID
 * @returns Parsed record object
 */
function parseDetailResponse(
  content: string,
  resourceType: string,
  recordId: string
): any {
  const record: any = {
    id: { record_id: recordId, object: resourceType },
  };

  try {
    // Parse the formatted text response
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        if (key && value && !key.includes('ID')) {
          const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');

          // Handle nested attributes
          if (cleanKey === 'attributes' || line.startsWith('  ')) {
            if (!record.attributes) record.attributes = {};
            const attrKey = key.trim().replace(/^-\s*/, '');
            record.attributes[attrKey] = { value };
          } else {
            record[cleanKey] = value;
          }
        }
      }
    }

    return record;
  } catch (error: any) {
    warn('[OpenAI Fetch] Failed to parse detail response:', error);
    return record;
  }
}

/**
 * Direct API implementation for fetching records
 * @param resourceType - Type of resource
 * @param recordId - Record ID
 * @returns Fetch result in OpenAI format
 */
async function fetchDirect(
  resourceType: SupportedAttioType,
  recordId: string
): Promise<OpenAIFetchResult> {
  const client = getAttioClient();

  try {
    let endpoint: string;

    switch (resourceType) {
      case 'companies':
        endpoint = `/objects/companies/records/${recordId}`;
        break;
      case 'people':
        endpoint = `/objects/people/records/${recordId}`;
        break;
      case 'lists':
        endpoint = `/lists/${recordId}`;
        break;
      case 'tasks':
        endpoint = `/tasks/${recordId}`;
        break;
      default:
        endpoint = `/objects/${resourceType}/records/${recordId}`;
    }

    const response = await client.get(endpoint);
    const record = response.data.data || response.data;

    const transformed = transformToFetchResult(record, resourceType);
    if (transformed) {
      return transformed;
    }

    throw new Error(`Failed to transform record: ${recordId}`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Record not found: ${recordId}`);
    }
    throw error;
  }
}
