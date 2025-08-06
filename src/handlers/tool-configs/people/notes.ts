/**
 * Note operations for people
 */
import {
  getPersonNotes,
  createPersonNote,
} from '../../../objects/people/index.js';
import { NotesToolConfig, CreateNoteToolConfig } from '../../tool-types.js';
import { NoteDisplay } from '../../../types/tool-types.js';

export const notesToolConfigs = {
  notes: {
    name: 'get-person-notes',
    handler: getPersonNotes,
    formatResult: (notes: NoteDisplay[]) => {
      if (!notes || notes.length === 0) {
        return 'No notes found for this person.';
      }
      
      // Debug logging in development to help identify API response structure (Issue #365)
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.log(
          '[get-person-notes] Debug - Raw notes response:',
          JSON.stringify(notes.slice(0, 1), null, 2)
        );
      }
      
      return `Found ${notes.length} notes:\n${notes
        .map(
          (note: any) => {
            // Check multiple possible field structures from the API (Issue #365)
            const title = note.title || note.data?.title || note.values?.title || 'Untitled';
            const content = note.content || note.data?.content || note.values?.content || note.text || note.body || '';
            const timestamp = note.timestamp || note.created_at || note.data?.created_at || note.values?.created_at || 'unknown';
            
            // Additional debug logging for each note
            if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
              console.log(
                `[get-person-notes] Note fields available:`,
                Object.keys(note)
              );
              console.log(
                `[get-person-notes] Content found:`,
                !!content,
                content ? `(${content.length} chars)` : '(none)'
              );
            }
            
            return `- ${title} (Created: ${timestamp})\n  ${
              content
                ? content.length > 100
                  ? content.substring(0, 100) + '...'
                  : content
                : 'No content'
            }`;
          }
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
