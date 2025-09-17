/**
 * Note operations for people
 */
import {
  getPersonNotes,
  createPersonNote,
} from '../../../objects/people/index.js';
import { NotesToolConfig, CreateNoteToolConfig } from '../../tool-types.js';
import { NoteDisplay } from '../../../types/tool-types.js';
import { createScopedLogger } from '../../../utils/logger.js';

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
        const log = createScopedLogger('people.notes', 'get-person-notes');
        log.debug('Raw notes response (first item)', {
          first: notes.slice(0, 1),
        });
      }

      return `Found ${notes.length} notes:\n${notes
        .map(
          (note: {
            title?: string;
            content?: string;
            created_at?: string;
            [key: string]: unknown;
          }) => {
            // Check multiple possible field structures from the API (Issue #365)
            // Field Priority Order (why this specific order was chosen):
            // 1. note.title/content - Standard API response fields (most common)
            // 2. note.timestamp - Person-specific timestamp field (checked first for person notes)
            // 3. note.created_at - Standard creation timestamp (fallback)
            // 4. note.data?.* - Nested data structure (seen in some API versions)
            // 5. note.values?.* - Attio-style custom field responses
            // 6. note.text/body - Alternative content field names (legacy/third-party support)
            // Note: Person notes include note.timestamp check that company notes don't have
            // This is intentional as person notes may use different timestamp field naming
            const title =
              note.title ||
              (note as any).data?.title ||
              (note as any).values?.title ||
              'Untitled';
            const content =
              note.content ||
              (note as any).data?.content ||
              (note as any).values?.content ||
              (note as any).text ||
              (note as any).body ||
              '';
            const timestamp =
              (note as any).timestamp ||
              note.created_at ||
              (note as any).data?.created_at ||
              (note as any).values?.created_at ||
              'unknown';

            // Additional debug logging for each note
            if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
              const log = createScopedLogger(
                'people.notes',
                'get-person-notes'
              );
              log.debug('Note fields available', { keys: Object.keys(note) });
              log.debug('Content presence', {
                hasContent: !!content,
                length: content ? content.length : 0,
              });
            }

            // Truncate at 100 chars for person notes (shorter for readability in lists)
            // This is intentionally shorter than company notes (200 chars) as person notes
            // are often briefer and displayed in longer lists where conciseness is valued
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
