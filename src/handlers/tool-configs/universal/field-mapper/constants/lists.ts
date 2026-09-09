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
    // Access controls for lists are wired through the dedicated
    // create-list / update-list-configuration tools; the universal
    // resource_type "lists" entry point is gated in shared-handlers.ts.
    // These entries stay current so field suggestions and mapping
    // validation match the dedicated tools if the gate is lifted.
    'workspace_access',
    'workspace_member_access',
  ],
  commonMistakes: {
    title: 'Use "name" field for the list name',
    parent: 'Use "parent_object" to specify the parent object type',
  },
  requiredFields: ['name'],
  uniqueFields: ['api_slug'],
};
