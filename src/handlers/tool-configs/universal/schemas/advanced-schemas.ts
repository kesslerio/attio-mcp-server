import {
  resourceTypeProperty,
  paginationProperties,
} from './common/properties.js';
import {
  UniversalResourceType,
  RelationshipType,
  ContentSearchType,
  TimeframeType,
  BatchOperationType,
} from '../types.js';

export const getDetailedInfoSchema = {
  type: 'object' as const,
  properties: {
    resource_type: {
      type: 'string' as const,
      enum: Object.values(UniversalResourceType),
      description: 'Type of resource',
    },
    record_id: {
      type: 'string' as const,
      description: 'Unique identifier of the record',
    },
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'companies',
      record_id: 'company_123456',
    },
  ],
};

export const advancedSearchSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    query: { type: 'string' as const, description: 'Search query string' },
    filters: {
      type: 'object' as const,
      description: `Complex filter conditions with nested array structure.

Required format:
{
  "filters": [
    {
      "attribute": {"slug": "field_name"}, 
      "condition": "operator", 
      "value": "search_value"
    }
  ]
}

Examples:
- Single filter: {"filters": [{"attribute": {"slug": "name"}, "condition": "contains", "value": "Tech"}]}
- Multiple filters: {"filters": [{"attribute": {"slug": "name"}, "condition": "contains", "value": "Tech"}, {"attribute": {"slug": "categories"}, "condition": "equals", "value": "Technology"}]}
- OR logic: {"filters": [...], "matchAny": true}

Supported conditions: contains, equals, starts_with, ends_with, greater_than, less_than, is_empty, is_not_empty`,
      additionalProperties: true,
    },
    sort_by: {
      type: 'string' as const,
      description: 'Field to sort results by',
    },
    sort_order: {
      type: 'string' as const,
      enum: ['asc', 'desc'],
      default: 'asc',
      description: 'Sort order',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'people',
      filters: {
        filters: [
          {
            attribute: { slug: 'email_addresses.email_address' },
            condition: 'contains',
            value: '@example.com',
          },
        ],
      },
      limit: 10,
    },
  ],
};

export const searchByRelationshipSchema = {
  type: 'object' as const,
  properties: {
    relationship_type: {
      type: 'string' as const,
      enum: Object.values(RelationshipType),
      description: 'Relationship type',
    },
    source_id: { type: 'string' as const, description: 'Source record ID' },
    target_resource_type: {
      type: 'string' as const,
      enum: Object.values(UniversalResourceType),
      description: 'Target resource type',
    },
    listId: {
      type: 'string' as const,
      description: '(Optional) List ID (must be a valid UUID if provided)',
    },
    ...paginationProperties,
  },
  required: ['relationship_type' as const, 'source_id' as const],
  additionalProperties: false,
  examples: [
    {
      relationship_type: RelationshipType.COMPANY_TO_PEOPLE,
      source_id: 'company_123456',
      target_resource_type: 'people',
      limit: 5,
    },
  ],
};

export const searchByContentSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    content_type: {
      type: 'string' as const,
      enum: Object.values(ContentSearchType),
      description: 'Type of content to search',
    },
    search_query: {
      type: 'string' as const,
      description: 'Query to search within content',
    },
    ...paginationProperties,
  },
  required: [
    'resource_type' as const,
    'content_type' as const,
    'search_query' as const,
  ],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'notes',
      content_type: ContentSearchType.NOTES,
      search_query: 'follow-up call',
      limit: 3,
    },
  ],
};

export const searchByTimeframeSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    timeframe_type: {
      type: 'string' as const,
      enum: Object.values(TimeframeType),
      description: 'Timeframe filter type',
    },
    start_date: {
      type: 'string' as const,
      format: 'date',
      description: 'Start date (ISO 8601 format)',
    },
    end_date: {
      type: 'string' as const,
      format: 'date',
      description: 'End date (ISO 8601 format)',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'deals',
      timeframe_type: TimeframeType.CREATED,
      start_date: '2025-01-01',
      end_date: '2025-01-31',
    },
  ],
};

export const batchOperationsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    // New flexible format: operations array
    operations: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          operation: {
            type: 'string' as const,
            enum: ['create', 'update', 'delete'],
            description: 'Operation type for this specific operation',
          },
          record_data: {
            type: 'object' as const,
            additionalProperties: true,
            description: 'Record data for the operation',
          },
        },
        required: ['operation', 'record_data'],
        additionalProperties: false,
      },
      description: 'Array of operations to perform',
    },
    // Legacy format: single operation type applied to multiple records
    operation_type: {
      type: 'string' as const,
      enum: Object.values(BatchOperationType),
      description: 'Batch operation type (legacy format)',
    },
    records: {
      type: 'array' as const,
      items: { type: 'object' as const, additionalProperties: true },
      description: 'Record data for create/update (legacy format)',
    },
    record_ids: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Record IDs for delete/get (legacy format)',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'companies',
      operation_type: BatchOperationType.CREATE,
      records: [
        { name: 'Example Ltd.', domain: 'example.com' },
        { name: 'Sample Inc.', domain: 'sample.io' },
      ],
    },
  ],
};
