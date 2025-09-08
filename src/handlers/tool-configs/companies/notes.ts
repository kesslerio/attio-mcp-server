/**
 * Notes-related tool configurations for companies
 */
import { NoteDisplay } from '../../../types/tool-types.js';
import { NotesToolConfig, CreateNoteToolConfig } from '../../tool-types.js';

// Company notes tool configurations
export const notesToolConfigs = {
  notes: {
    name: 'get-company-notes',
    handler: getCompanyNotes,
    formatResult: (notes: NoteDisplay[]): string => {
      if (!notes || notes.length === 0) {
        return 'No notes found for this company.';
      }

      return `Found ${notes.length} notes:\n${notes
        .map((note: NoteDisplay) => {
          // The AttioNote interface shows these are direct properties
          // Check multiple possible field structures from the API (Issue #365)
          // Field Priority Order (why this specific order was chosen):
          // 1. note.title/content/created_at - Standard API response fields (most common)
          // 2. note.data?.* - Nested data structure (seen in some API versions)
          // 3. note.values?.* - Attio-style custom field responses
          // 4. note.text - Alternative content field name (legacy support)
          // 5. note.body - Another alternative content field (third-party integrations)
          // This order ensures backward compatibility while supporting API variations
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

          // Truncate at 200 chars for company notes (more detail for business context)
          // This is intentionally longer than person notes (100 chars) as company notes
          // often contain more detailed business information that benefits from extra context
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
