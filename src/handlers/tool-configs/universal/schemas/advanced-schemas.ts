import {
  resourceTypeProperty,
  paginationProperties,
} from './common/properties.js';
import {
  UniversalResourceType,
  DetailedInfoType,
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
    info_type: {
      type: 'string' as const,
      enum: Object.values(DetailedInfoType),
      description: 'Type of detailed info to retrieve',
    },
  },
  required: [
    'resource_type' as const,
    'record_id' as const,
    'info_type' as const,
  ],
  additionalProperties: false,
};

export const advancedSearchSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    query: { type: 'string' as const, description: 'Search query string' },
    filters: {
      type: 'object' as const,
      description: 'Complex filter conditions',
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
      description: 'Start date (ISO 8601)',
    },
    end_date: {
      type: 'string' as const,
      format: 'date',
      description: 'End date (ISO 8601)',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const, 'timeframe_type' as const],
  additionalProperties: false,
};

export const batchOperationsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    operation_type: {
      type: 'string' as const,
      enum: Object.values(BatchOperationType),
      description: 'Batch operation type',
    },
    records: {
      type: 'array' as const,
      items: { type: 'object' as const, additionalProperties: true },
      description: 'Record data for create/update',
    },
    record_ids: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Record IDs for delete/get',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const, 'operation_type' as const],
  additionalProperties: false,
};
