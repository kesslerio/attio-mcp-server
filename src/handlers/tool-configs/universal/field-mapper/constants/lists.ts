/**
 * Lists field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';

/**
 * Field mapping configuration for lists resource type
 */
export const LISTS_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Name variations
    list_name: 'name',
    title: 'name',
    // Description variations
    description: 'description',
    notes: 'description',
    // Parent variations
    parent: 'parent_object',
    parent_id: 'parent_object',
    object: 'parent_object',
  },
  validFields: [
    'name',
    'description',
    'parent_object',
    'api_slug',
    'workspace_id',
    'workspace_member_access',
  ],
  commonMistakes: {
    title: 'Use "name" field for the list name',
    parent: 'Use "parent_object" to specify the parent object type',
  },
  requiredFields: ['name'],
  uniqueFields: ['api_slug'],
};
