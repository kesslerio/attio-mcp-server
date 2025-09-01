import { resourceTypeProperty } from './common/properties.js';

export const getAttributesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: { type: 'string' as const, description: 'Record ID to get attributes for (optional)' },
    categories: { type: 'array' as const, items: { type: 'string' as const }, description: 'Attribute categories' },
    fields: { type: 'array' as const, items: { type: 'string' as const }, description: 'Specific attribute field names' },
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};

export const discoverAttributesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    categories: { type: 'array' as const, items: { type: 'string' as const }, description: 'Attribute categories' },
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};

