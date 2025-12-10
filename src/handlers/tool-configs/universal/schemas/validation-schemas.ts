import { resourceTypeProperty } from './common/properties.js';

export const getAttributesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Record ID to get attributes for (optional)',
    },
    categories: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Attribute categories',
    },
    fields: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Specific attribute field names',
    },
  },
  required: ['resource_type' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'companies',
      categories: ['standard'],
    },
  ],
};

export const discoverAttributesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    categories: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Attribute categories',
    },
  },
  required: ['resource_type' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'people',
      categories: ['custom'],
    },
  ],
};

export const getAttributeOptionsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    attribute: {
      type: 'string' as const,
      description:
        'The attribute slug or ID (e.g., "channel", "stage", "categories")',
    },
    show_archived: {
      type: 'boolean' as const,
      default: false,
      description: 'Include archived options in the response',
    },
  },
  required: ['resource_type' as const, 'attribute' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'companies',
      attribute: 'channel',
    },
    {
      resource_type: 'deals',
      attribute: 'stage',
      show_archived: true,
    },
  ],
};
