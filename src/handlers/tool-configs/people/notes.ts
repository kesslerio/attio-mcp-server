/**
 * Note operations for people
 */
import {
  createPersonNote,
  getPersonNotes,
} from '../../../objects/people/index.js';
import type { NoteDisplay } from '../../../types/tool-types.js';
import type {
  CreateNoteToolConfig,
  NotesToolConfig,
} from '../../tool-types.js';

export const notesToolConfigs = {
  notes: {
    name: 'get-person-notes',
    handler: getPersonNotes,
    formatResult: (notes: NoteDisplay[]) => {
      if (!notes || notes.length === 0) {
        return 'No notes found for this person.';
      }
      return `Found ${notes.length} notes:\n${notes
        .map(
          (note) =>
            `- ${note.title || 'Untitled'} (Created: ${
              note.timestamp || 'unknown'
            })\n  ${
              note.content
                ? note.content.length > 100
                  ? note.content.substring(0, 100) + '...'
                  : note.content
                : 'No content'
            }`
        )
        .join('\n\n')}`;
    },
  } as NotesToolConfig,

  createNote: {
    name: 'create-person-note',
    handler: createPersonNote,
    idParam: 'personId',
  } as CreateNoteToolConfig,
};

export const notesToolDefinitions = [
  {
    name: 'get-person-notes',
    description: 'Get notes for a person',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'ID of the person to get notes for',
        },
      },
      required: ['personId'],
    },
  },
  {
    name: 'create-person-note',
    description: 'Create a note for a specific person',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'ID of the person to create a note for',
        },
        title: {
          type: 'string',
          description: 'Title of the note (required)',
        },
        content: { type: 'string', description: 'Content of the note' },
      },
      required: ['personId', 'title', 'content'],
    },
  },
];
