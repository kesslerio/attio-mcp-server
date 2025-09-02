import { UniversalResourceType } from '../types.js';
import {
  paginationProperties,
  resourceTypeProperty,
} from './common/properties.js';

export const createNoteSchema = {
  type: 'object' as const,
  properties: {
    resource_type: {
      type: 'string' as const,
      enum: Object.values(UniversalResourceType),
      description: 'Target resource type',
    },
    record_id: {
      type: 'string' as const,
      description: 'ID of the record to attach the note to',
    },
    title: { type: 'string' as const, description: 'Title of the note' },
    content: { type: 'string' as const, description: 'Content of the note' },
  },
  required: [
    'resource_type' as const,
    'record_id' as const,
    'title' as const,
    'content' as const,
  ],
  additionalProperties: false,
};

export const getNotesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: {
      type: 'string' as const,
      enum: Object.values(UniversalResourceType),
      description: 'Resource type (optional)',
    },
    record_id: { type: 'string' as const, description: 'Record ID (optional)' },
    limit: {
      type: 'number' as const,
      description: 'Max notes',
      minimum: 1,
      maximum: 100,
    },
    offset: { type: 'number' as const, description: 'Skip notes', minimum: 0 },
  },
  additionalProperties: false,
};

export const updateNoteSchema = {
  type: 'object' as const,
  properties: {
    note_id: { type: 'string' as const, description: 'Note ID to update' },
    title: { type: 'string' as const, description: 'New title' },
    content: { type: 'string' as const, description: 'New content' },
  },
  additionalProperties: false,
};

export const searchNotesSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string' as const,
      description: 'Search query for note content or title',
    },
    limit: {
      type: 'number' as const,
      description: 'Max notes',
      minimum: 1,
      maximum: 100,
    },
    offset: { type: 'number' as const, description: 'Skip notes', minimum: 0 },
  },
  additionalProperties: false,
};

export const deleteNoteSchema = {
  type: 'object' as const,
  properties: {
    note_id: { type: 'string' as const, description: 'Note ID to delete' },
  },
  required: ['note_id' as const],
  additionalProperties: false,
};

export const listNotesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: {
      type: 'string' as const,
      description: 'Record ID to list notes for',
    },
    parent_record_id: {
      type: 'string' as const,
      description: 'Alias for record_id (backward compatibility)',
    },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};
