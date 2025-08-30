/**
 * Notes field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';

/**
 * Field mapping configuration for notes resource type
 */
export const NOTES_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Normalize universal/legacy field names to Attio Notes API fields
    parent_object_type: 'parent_object', // 'companies' | 'people' | 'deals'
    parent_record_id: 'parent_record_id', // UUID
    linked_record_type: 'parent_object', // Legacy compatibility
    linked_record_id: 'parent_record_id', // Legacy compatibility
    note: 'content',
    description: 'content',
    body: 'content',
    text: 'content',
    // title and content pass through unchanged
  },
  validFields: [
    'title',
    'content',
    'format',
    'parent_object', // companies, people, deals
    'parent_record_id', // UUID of linked record
    'created_at',
    'meeting_id',
  ],
  commonMistakes: {
    linked_record_type:
      'Use "parent_object" with resource type (companies, people, deals)',
    linked_record_id: 'Use "parent_record_id" with record UUID',
    note: 'Use "content" for note body text',
    description: 'Use "content" for note body text',
    notes:
      'Notes are separate objects. Use "content" field for note text and link with parent_object/parent_record_id',
  },
  requiredFields: ['content', 'parent_object', 'parent_record_id'],
  uniqueFields: [],
};
