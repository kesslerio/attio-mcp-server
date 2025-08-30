/**
 * Records field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';

/**
 * Field mapping configuration for records resource type
 */
export const RECORDS_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Generic record mappings
    title: 'name',
    record_name: 'name',
    // ❌ Removed dangerous mappings that break People/Company fields:
    // description: 'notes',  // Can incorrectly map People.description
    // note: 'notes',         // Can incorrectly map People.description
  },
  validFields: [
    'object', // Required: object slug for routing
    'object_api_slug', // Alternative object slug
    'object_slug', // Alternative object slug
    'values', // When caller provides values wrapper
    'name',
    'notes',
    'created_at',
    'updated_at',
    // Note: Records can have dynamic fields based on the object type
  ],
  commonMistakes: {
    title: 'Use "name" for record titles',
    description: 'Use "notes" for descriptions or additional text',
  },
  requiredFields: [],
  uniqueFields: [],
};
