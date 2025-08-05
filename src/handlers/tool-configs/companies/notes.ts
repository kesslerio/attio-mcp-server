/**
 * Notes-related tool configurations for companies
 */
import {
  createCompanyNote,
  getCompanyNotes,
} from '../../../objects/companies/index.js';
import type {
  CreateNoteToolConfig,
  NotesToolConfig,
} from '../../tool-types.js';

// Company notes tool configurations
export const notesToolConfigs = {
  notes: {
    name: 'get-company-notes',
    handler: getCompanyNotes,
    formatResult: (notes: any) => {
      if (!notes || notes.length === 0) {
        return 'No notes found for this company.';
      }

      // Debug logging in development to help identify API response structure
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.log(
          '[get-company-notes] Debug - Raw notes response:',
          JSON.stringify(notes.slice(0, 1), null, 2)
        );
      }

      return `Found ${notes.length} notes:\n${notes
        .map((note: any) => {
          // The AttioNote interface shows these are direct properties
          const title = note.title || 'Untitled';
          const content = note.content || '';
          const timestamp = note.created_at || 'unknown';

          // Additional debug logging for each note
          if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
            console.log(
              '[get-company-notes] Note fields available:',
              Object.keys(note)
            );
            console.log(
              '[get-company-notes] Content found:',
              !!content,
              content ? `(${content.length} chars)` : '(none)'
            );
          }

          return `- ${title} (Created: ${timestamp})\n  ${
            content
              ? content.length > 200
                ? content.substring(0, 200) + '...'
                : content
              : 'No content'
          }`;
        })
        .join('\n\n')}`;
    },
  } as NotesToolConfig,

  createNote: {
    name: 'create-company-note',
    handler: createCompanyNote,
    idParam: 'companyId',
    formatResult: (note: any) => {
      if (!note) {
        return 'Failed to create note.';
      }
      // Truncate content at 100 chars for readability in console output
      return `Successfully created note: ${
        note.title || 'Untitled'
      }\nContent: ${
        note.content
          ? note.content.length > 100
            ? note.content.substring(0, 100) + '...'
            : note.content
          : 'No content'
      }\nCreated at: ${note.created_at || 'unknown'}`;
    },
  } as CreateNoteToolConfig,
};

// Notes tool definitions
export const notesToolDefinitions = [
  {
    name: 'get-company-notes',
    description: 'Get notes for a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description:
            'ID of the company to get notes for (provide either this or uri)',
        },
        uri: {
          type: 'string',
          description:
            "URI of the company in the format 'attio://companies/{id}' (provide either this or companyId)",
        },
        limit: {
          type: 'number',
          description: 'Maximum number of notes to fetch (default: 10)',
        },
        offset: {
          type: 'number',
          description: 'Number of notes to skip for pagination (default: 0)',
        },
      },
    },
  },
  {
    name: 'create-company-note',
    description: 'Create a note for a specific company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description:
            'ID of the company to create a note for (provide either this or uri)',
        },
        uri: {
          type: 'string',
          description:
            "URI of the company in the format 'attio://companies/{id}' (provide either this or companyId)",
        },
        title: {
          type: 'string',
          description: 'Title of the note (required)',
        },
        content: {
          type: 'string',
          description: 'Content of the note',
        },
      },
      required: ['title', 'content'],
    },
  },
];
