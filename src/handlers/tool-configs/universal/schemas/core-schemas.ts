import {
  resourceTypeProperty,
  paginationProperties,
} from './common/properties.js';

export const searchRecordsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    query: { type: 'string' as const, description: 'Search query string' },
    filters: {
      type: 'object' as const,
      description: 'Advanced filter conditions',
      additionalProperties: true,
    },
    search_type: {
      type: 'string' as const,
      enum: ['basic', 'content', 'timeframe'] as const,
      description: 'Type of search',
    },
    fields: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Fields to search (content)',
    },
    match_type: {
      type: 'string' as const,
      enum: ['exact', 'partial', 'fuzzy'] as const,
      description: 'String matching',
    },
    sort: {
      type: 'string' as const,
      enum: ['relevance', 'created', 'modified', 'name'] as const,
      description: 'Sort order',
    },
    // Date range filtering parameters
    date_from: {
      type: 'string' as const,
      description: 'Start date for filtering (ISO 8601 format)',
      format: 'date-time',
    },
    date_to: {
      type: 'string' as const,
      description: 'End date for filtering (ISO 8601 format)',
      format: 'date-time',
    },
    created_after: {
      type: 'string' as const,
      description: 'Filter records created after this date (ISO 8601)',
      format: 'date-time',
    },
    created_before: {
      type: 'string' as const,
      description: 'Filter records created before this date (ISO 8601)',
      format: 'date-time',
    },
    updated_after: {
      type: 'string' as const,
      description: 'Filter records updated after this date (ISO 8601)',
      format: 'date-time',
    },
    updated_before: {
      type: 'string' as const,
      description: 'Filter records updated before this date (ISO 8601)',
      format: 'date-time',
    },
    timeframe: {
      type: 'string' as const,
      enum: [
        'today',
        'yesterday',
        'this_week',
        'last_week',
        'this_month',
        'last_month',
        'last_7_days',
        'last_30_days',
        'last_90_days',
      ] as const,
      description: 'Relative timeframe filter',
    },
    date_field: {
      type: 'string' as const,
      enum: ['created_at', 'updated_at'] as const,
      default: 'created_at',
      description: 'Which date field to filter on',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'people',
      query: 'customer@example.com',
      limit: 5,
    },
  ],
};

export const getRecordDetailsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Record ID to retrieve',
    },
    fields: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Fields to include',
    },
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'companies',
      record_id: 'company_123456',
      fields: ['name', 'domains'],
    },
  ],
};

export const createRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_data: {
      type: 'object' as const,
      description: 'Data to create',
      additionalProperties: true,
    },
    return_details: {
      type: 'boolean' as const,
      default: true,
      description: 'Return full details',
    },
  },
  required: ['resource_type' as const, 'record_data' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'people',
      record_data: {
        name: 'Taylor Swift',
        email_addresses: [{ email_address: 'taylor@example.com' }],
      },
      return_details: true,
    },
  ],
};

export const updateRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: { type: 'string' as const, description: 'Record ID to update' },
    record_data: {
      type: 'object' as const,
      description: 'Updated data',
      additionalProperties: true,
    },
    return_details: {
      type: 'boolean' as const,
      default: true,
      description: 'Return full details',
    },
  },
  required: [
    'resource_type' as const,
    'record_id' as const,
    'record_data' as const,
  ],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'records',
      record_id: 'record_987654',
      record_data: {
        status: 'Qualified',
      },
      return_details: false,
    },
  ],
};

export const deleteRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: { type: 'string' as const, description: 'Record ID to delete' },
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'tasks',
      record_id: 'task_abc123',
    },
  ],
};
