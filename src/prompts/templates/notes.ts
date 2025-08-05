/**
 * Notes-related prompt templates
 */
import type { PromptTemplate } from '../types.js';

/**
 * Prompt templates for note operations
 */
export const notesPrompts: PromptTemplate[] = [
  {
    id: 'create-note',
    title: 'Create a new note',
    description: 'Create a new note for a person or company in Attio',
    category: 'notes',
    parameters: [
      {
        name: 'objectType',
        type: 'string',
        description: 'Type of object to add the note to (people or companies)',
        required: true,
        enum: ['people', 'companies'],
      },
      {
        name: 'recordId',
        type: 'string',
        description: 'ID of the record to add the note to',
        required: true,
      },
      {
        name: 'title',
        type: 'string',
        description: 'Title of the note',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: 'Content of the note',
        required: true,
      },
    ],
    template:
      'Create a note titled "{{title}}" with content "{{content}}" for the {{objectType}} record with ID {{recordId}}.',
  },
  {
    id: 'get-notes-for-record',
    title: 'Get notes for a record',
    description: 'Retrieve all notes for a specific person or company',
    category: 'notes',
    parameters: [
      {
        name: 'objectType',
        type: 'string',
        description: 'Type of object to get notes for (people or companies)',
        required: true,
        enum: ['people', 'companies'],
      },
      {
        name: 'recordId',
        type: 'string',
        description: 'ID of the record to get notes for',
        required: true,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of notes to retrieve',
        required: false,
        default: 10,
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Number of notes to skip',
        required: false,
        default: 0,
      },
    ],
    template:
      'Get {{limit}} notes for the {{objectType}} record with ID {{recordId}}{{#if offset}}, skipping the first {{offset}} notes{{/if}}.',
  },
  {
    id: 'update-note',
    title: 'Update a note',
    description: 'Update an existing note in Attio',
    category: 'notes',
    parameters: [
      {
        name: 'noteId',
        type: 'string',
        description: 'ID of the note to update',
        required: true,
      },
      {
        name: 'title',
        type: 'string',
        description: 'New title for the note',
        required: false,
      },
      {
        name: 'content',
        type: 'string',
        description: 'New content for the note',
        required: false,
      },
    ],
    template:
      'Update the note with ID {{noteId}}{{#if title}} to change its title to "{{title}}"{{/if}}{{#if content}} and update its content to "{{content}}"{{/if}}.',
  },
  {
    id: 'delete-note',
    title: 'Delete a note',
    description: 'Delete an existing note in Attio',
    category: 'notes',
    parameters: [
      {
        name: 'noteId',
        type: 'string',
        description: 'ID of the note to delete',
        required: true,
      },
    ],
    template: 'Delete the note with ID {{noteId}}.',
  },
];

export default notesPrompts;
