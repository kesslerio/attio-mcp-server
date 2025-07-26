/**
 * MCP-compliant schemas for universal tools
 * 
 * These schemas follow MCP protocol requirements:
 * - No oneOf/allOf/anyOf at top level
 * - Enum-based operation discrimination
 * - Runtime parameter validation
 */

import {
  UniversalResourceType,
  DetailedInfoType,
  BatchOperationType,
  TimeframeType,
  ContentSearchType,
  RelationshipType
} from './types.js';

/**
 * Base resource type schema property
 */
const resourceTypeProperty = {
  type: 'string' as const,
  enum: Object.values(UniversalResourceType),
  description: 'Type of resource to operate on (companies, people, records, tasks)'
};

/**
 * Common pagination properties
 */
const paginationProperties = {
  limit: {
    type: 'number' as const,
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Maximum number of results to return'
  },
  offset: {
    type: 'number' as const,
    minimum: 0,
    default: 0,
    description: 'Number of results to skip for pagination'
  }
};

/**
 * Universal search records schema
 */
export const searchRecordsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    query: {
      type: 'string' as const,
      description: 'Search query string'
    },
    filters: {
      type: 'object' as const,
      description: 'Advanced filter conditions',
      additionalProperties: true
    },
    ...paginationProperties
  },
  required: ['resource_type' as const],
  additionalProperties: false
};

/**
 * Universal get record details schema
 */
export const getRecordDetailsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Unique identifier of the record to retrieve'
    },
    fields: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Specific fields to include in the response'
    }
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false
};

/**
 * Universal create record schema
 */
export const createRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_data: {
      type: 'object' as const,
      description: 'Data for creating the new record',
      additionalProperties: true
    },
    return_details: {
      type: 'boolean' as const,
      default: true,
      description: 'Whether to return full record details after creation'
    }
  },
  required: ['resource_type' as const, 'record_data' as const],
  additionalProperties: false
};

/**
 * Universal update record schema
 */
export const updateRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Unique identifier of the record to update'
    },
    record_data: {
      type: 'object' as const,
      description: 'Updated data for the record',
      additionalProperties: true
    },
    return_details: {
      type: 'boolean' as const,
      default: true,
      description: 'Whether to return full record details after update'
    }
  },
  required: ['resource_type' as const, 'record_id' as const, 'record_data' as const],
  additionalProperties: false
};

/**
 * Universal delete record schema
 */
export const deleteRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Unique identifier of the record to delete'
    }
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false
};

/**
 * Universal get attributes schema
 */
export const getAttributesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Record ID to get attributes for (optional for schema discovery)'
    },
    categories: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Categories of attributes to retrieve (basic, business, contact, social, custom)'
    },
    fields: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Specific attribute field names to retrieve'
    }
  },
  required: ['resource_type' as const],
  additionalProperties: false
};

/**
 * Universal discover attributes schema
 */
export const discoverAttributesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty
  },
  required: ['resource_type' as const],
  additionalProperties: false
};

/**
 * Universal get detailed info schema
 */
export const getDetailedInfoSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Unique identifier of the record'
    },
    info_type: {
      type: 'string' as const,
      enum: Object.values(DetailedInfoType),
      description: 'Type of detailed information to retrieve (contact, business, social, basic, custom)'
    }
  },
  required: ['resource_type' as const, 'record_id' as const, 'info_type' as const],
  additionalProperties: false
};

/**
 * Advanced search schema
 */
export const advancedSearchSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    query: {
      type: 'string' as const,
      description: 'Search query string'
    },
    filters: {
      type: 'object' as const,
      description: 'Complex filter conditions',
      additionalProperties: true
    },
    sort_by: {
      type: 'string' as const,
      description: 'Field to sort results by'
    },
    sort_order: {
      type: 'string' as const,
      enum: ['asc', 'desc'],
      default: 'asc',
      description: 'Sort order (ascending or descending)'
    },
    ...paginationProperties
  },
  required: ['resource_type' as const],
  additionalProperties: false
};

/**
 * Search by relationship schema
 */
export const searchByRelationshipSchema = {
  type: 'object' as const,
  properties: {
    relationship_type: {
      type: 'string' as const,
      enum: Object.values(RelationshipType),
      description: 'Type of relationship to search (company_to_people, people_to_company, etc.)'
    },
    source_id: {
      type: 'string' as const,
      description: 'ID of the source record for the relationship'
    },
    target_resource_type: {
      type: 'string' as const,
      enum: Object.values(UniversalResourceType),
      description: 'Target resource type for the relationship'
    },
    ...paginationProperties
  },
  required: ['relationship_type' as const, 'source_id' as const],
  additionalProperties: false
};

/**
 * Search by content schema
 */
export const searchByContentSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    content_type: {
      type: 'string' as const,
      enum: Object.values(ContentSearchType),
      description: 'Type of content to search (notes, activity, interactions)'
    },
    search_query: {
      type: 'string' as const,
      description: 'Query to search within the content'
    },
    ...paginationProperties
  },
  required: ['resource_type' as const, 'content_type' as const, 'search_query' as const],
  additionalProperties: false
};

/**
 * Search by timeframe schema
 */
export const searchByTimeframeSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    timeframe_type: {
      type: 'string' as const,
      enum: Object.values(TimeframeType),
      description: 'Type of timeframe to filter by (created, modified, last_interaction)'
    },
    start_date: {
      type: 'string' as const,
      format: 'date',
      description: 'Start date for the timeframe filter (ISO 8601 date)'
    },
    end_date: {
      type: 'string' as const,
      format: 'date',
      description: 'End date for the timeframe filter (ISO 8601 date)'
    },
    ...paginationProperties
  },
  required: ['resource_type' as const, 'timeframe_type' as const],
  additionalProperties: false
};

/**
 * Batch operations schema
 */
export const batchOperationsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    operation_type: {
      type: 'string' as const,
      enum: Object.values(BatchOperationType),
      description: 'Type of batch operation to perform (create, update, delete, search, get)'
    },
    records: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        additionalProperties: true
      },
      description: 'Array of record data for create/update operations'
    },
    record_ids: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Array of record IDs for delete/get operations'
    },
    ...paginationProperties
  },
  required: ['resource_type' as const, 'operation_type' as const],
  additionalProperties: false
};

/**
 * Schema validation utility function
 */
export function validateUniversalToolParams(toolName: string, params: any): void {
  // Runtime validation logic will be implemented here
  // This ensures operation-specific parameter requirements are met
  
  switch (toolName) {
    case 'search-records':
      if (!params.resource_type) {
        throw new Error('resource_type is required for search-records');
      }
      break;
      
    case 'get-record-details':
      if (!params.resource_type || !params.record_id) {
        throw new Error('resource_type and record_id are required for get-record-details');
      }
      break;
      
    case 'create-record':
      if (!params.resource_type || !params.record_data) {
        throw new Error('resource_type and record_data are required for create-record');
      }
      break;
      
    case 'update-record':
      if (!params.resource_type || !params.record_id || !params.record_data) {
        throw new Error('resource_type, record_id, and record_data are required for update-record');
      }
      break;
      
    case 'delete-record':
      if (!params.resource_type || !params.record_id) {
        throw new Error('resource_type and record_id are required for delete-record');
      }
      break;
      
    case 'batch-operations':
      if (!params.resource_type || !params.operation_type) {
        throw new Error('resource_type and operation_type are required for batch-operations');
      }
      if (['create', 'update'].includes(params.operation_type) && !params.records) {
        throw new Error('records array is required for batch create/update operations');
      }
      if (['delete', 'get'].includes(params.operation_type) && !params.record_ids) {
        throw new Error('record_ids array is required for batch delete/get operations');
      }
      break;
      
    default:
      // Additional validation for other tools can be added here
      break;
  }
}