import { resourceTypeProperty, paginationProperties } from './common/properties.js';

export const searchRecordsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    query: { type: 'string' as const, description: 'Search query string' },
    filters: { type: 'object' as const, description: 'Advanced filter conditions', additionalProperties: true },
    search_type: { type: 'string' as const, enum: ['basic', 'content'] as const, description: 'Type of search' },
    fields: { type: 'array' as const, items: { type: 'string' as const }, description: 'Fields to search (content)'},
    match_type: { type: 'string' as const, enum: ['exact','partial','fuzzy'] as const, description: 'String matching' },
    sort: { type: 'string' as const, enum: ['relevance','created','modified','name'] as const, description: 'Sort order' },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};

export const getRecordDetailsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: { type: 'string' as const, description: 'Record ID to retrieve' },
    fields: { type: 'array' as const, items: { type: 'string' as const }, description: 'Fields to include' },
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false,
};

export const createRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_data: { type: 'object' as const, description: 'Data to create', additionalProperties: true },
    return_details: { type: 'boolean' as const, default: true, description: 'Return full details' },
  },
  required: ['resource_type' as const, 'record_data' as const],
  additionalProperties: false,
};

export const updateRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: { type: 'string' as const, description: 'Record ID to update' },
    record_data: { type: 'object' as const, description: 'Updated data', additionalProperties: true },
    return_details: { type: 'boolean' as const, default: true, description: 'Return full details' },
  },
  required: ['resource_type' as const, 'record_id' as const, 'record_data' as const],
  additionalProperties: false,
};

export const deleteRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: { type: 'string' as const, description: 'Record ID to delete' },
  },
  required: ['resource_type' as const, 'record_id' as const],
  additionalProperties: false,
};

