/**
 * Note operations for deals
 */
import { getDealNotes, createDealNote } from '../../../objects/deals/notes.js';
import { NoteDisplay } from '../../../types/tool-types.js';
import { NotesToolConfig, CreateNoteToolConfig } from '../../tool-types.js';

export const notesToolConfigs = {
  notes: {
    name: 'get-deal-notes',
    handler: getDealNotes,
    formatResult: (notes: NoteDisplay[]): string => {
      if (!notes || notes.length === 0) {
        return 'No notes found for this deal.';
      }

      return `Found ${notes.length} notes:\n${notes
        .map((note: NoteDisplay) => {
          // Check multiple possible field structures from the API (Issue #365)
          // Field Priority Order (why this specific order was chosen):
          // 1. note.title/content - Standard API response fields (most common)
          // 2. note.created_at - Standard creation timestamp
          // 3. note.data?.* - Nested data structure (seen in some API versions)
          // 4. note.values?.* - Attio-style custom field responses
          // 5. note.text/body - Alternative content field names (legacy/third-party support)
            note.title || note.data?.title || note.values?.title || 'Untitled';
            note.content ||
            note.data?.content ||
            note.values?.content ||
            note.text ||
            note.body ||
            '';
            note.created_at ||
            note.data?.created_at ||
            note.values?.created_at ||
            'unknown';

          // Truncate at 150 chars for deal notes (between person notes at 100 and company at 200)
          // This provides sufficient context for deal-related notes which often contain
          // important deal progress information that benefits from more detail than person notes
          // but doesn't need as much context as comprehensive company business notes
          return `- ${title} (Created: ${timestamp})\n  ${
            content
              ? content.length > 150
                ? content.substring(0, 150) + '...'
                : content
              : 'No content'
          }`;
        })
        .join('\n\n')}`;
    },
  } as NotesToolConfig,

  createNote: {
    name: 'create-deal-note',
    handler: createDealNote,
    idParam: 'dealId',
    formatResult: (note: NoteDisplay | null): string => {
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

export const notesToolDefinitions = [
  {
    name: 'get-deal-notes',
    description: 'Get notes for a deal',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'ID of the deal to get notes for',
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
      required: ['dealId'],
    },
  },
  {
    name: 'create-deal-note',
    description: 'Create a note for a specific deal',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'ID of the deal to create a note for',
        },
        title: {
          type: 'string',
          description: 'Title of the note (required)',
        },
        content: { type: 'string', description: 'Content of the note' },
      },
      required: ['dealId', 'title', 'content'],
    },
  },
];
