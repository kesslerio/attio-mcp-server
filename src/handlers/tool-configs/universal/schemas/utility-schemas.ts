import { UniversalResourceType } from '../types.js';
import { paginationProperties, resourceTypeProperty } from './common/properties.js';

export const createNoteSchema = {
  type: 'object',
  properties: {
    resource_type: { type: 'string', enum: Object.values(UniversalResourceType), description: 'Target resource type' },
    record_id: { type: 'string', description: 'ID of the record to attach the note to' },
    title: { type: 'string', description: 'Title of the note' },
    content: { type: 'string', description: 'Content of the note' },
  },
  required: ['resource_type', 'record_id', 'title', 'content'],
  additionalProperties: false,
};

export const getNotesSchema = {
  type: 'object',
  properties: {
    resource_type: { type: 'string', enum: Object.values(UniversalResourceType), description: 'Resource type (optional)' },
    record_id: { type: 'string', description: 'Record ID (optional)' },
    limit: { type: 'number', description: 'Max notes', minimum: 1, maximum: 100 },
    offset: { type: 'number', description: 'Skip notes', minimum: 0 },
  },
  additionalProperties: false,
};

export const updateNoteSchema = {
  type: 'object',
  properties: {
    note_id: { type: 'string', description: 'Note ID to update' },
    title: { type: 'string', description: 'New title' },
    content: { type: 'string', description: 'New content' },
  },
  additionalProperties: false,
};

export const searchNotesSchema = {
  type: 'object',
  properties: {
    query: { type: 'string', description: 'Search query for note content or title' },
    limit: { type: 'number', description: 'Max notes', minimum: 1, maximum: 100 },
    offset: { type: 'number', description: 'Skip notes', minimum: 0 },
  },
  additionalProperties: false,
};

export const deleteNoteSchema = {
  type: 'object',
  properties: { note_id: { type: 'string', description: 'Note ID to delete' } },
  required: ['note_id'],
  additionalProperties: false,
};

export const listNotesSchema = {
  type: 'object' as const,
  properties: {
    resource_type: resourceTypeProperty,
    record_id: { type: 'string' as const, description: 'Record ID to list notes for' },
    parent_record_id: { type: 'string' as const, description: 'Alias for record_id (backward compatibility)' },
    ...paginationProperties,
  },
  required: ['resource_type' as const],
  additionalProperties: false,
};

