import {
  recordWriteResultContract,
  recordSearchResultContract,
} from '@/handlers/tools/result-schemas.js';
import {
  UniversalToolConfig,
  UniversalCreateNoteParams,
  UniversalGetNotesParams,
} from '@/handlers/tool-configs/universal/types.js';
import {
  createNoteSchema,
  listNotesSchema,
  validateUniversalToolParams,
} from '@/handlers/tool-configs/universal/schemas.js';
import {
  handleUniversalCreateNote,
  handleUniversalGetNotes,
  handleUniversalGetNotesPage,
} from '@/handlers/tool-configs/universal/shared-handlers.js';
import { ErrorService } from '@/services/ErrorService.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import { extractNoteFields } from '@/handlers/tool-configs/universal/core/utils/note-formatters.js';
import { isValidUUID } from '@/utils/validation/uuid-validation.js';
import { createErrorResult } from '@/utils/error-handler.js';

type McpErrorPayload = {
  content?: Array<{ type: string; text?: string }>;
};

export const createNoteConfig: UniversalToolConfig<
  Record<string, unknown>,
  Record<string, unknown>
> = {
  name: 'create_note',
  ...recordWriteResultContract,
  handler: async (
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'create_note',
        params
      ) as UniversalCreateNoteParams;

      if (!isValidUUID(sanitizedParams.record_id)) {
        throw new Error(
          `Invalid record_id: must be a UUID. Got: ${sanitizedParams.record_id}`
        );
      }

      const result = await handleUniversalCreateNote(sanitizedParams);
      const { success, error } = result as Record<string, unknown> & {
        success?: boolean;
        error?: unknown;
      };

      if (success === false) {
        throw new Error(
          typeof error === 'string' && error.length
            ? error
            : 'Universal note creation failed'
        );
      }

      return result;
    } catch (err: unknown) {
      throw ErrorService.createUniversalError('create_note', 'notes', err);
    }
  },
  formatResult: (note: Record<string, unknown>): string => {
    try {
      if (!note) {
        return 'No note created';
      }

      const { title, content, id } = extractNoteFields(note);

      return `✅ Note created successfully: ${title} (ID: ${id})${
        content ? `\n${content}` : ''
      }`;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const fallback = createErrorResult(
        err,
        'create_note#format',
        'FORMAT'
      ) as McpErrorPayload;
      const message = fallback.content?.[0]?.text;
      return typeof message === 'string'
        ? message
        : 'Error formatting note result';
    }
  },
  structuredOutput: (
    note: Record<string, unknown>
  ): Record<string, unknown> => {
    if (!note) return {};

    // Normalize content fields to top-level, but preserve original id object
    const { title, content } = extractNoteFields(note);
    return {
      ...note,
      // Keep original id (object) - don't replace with extracted string
      title: title || note.title || '',
      content:
        content ||
        note.content ||
        note.content_markdown ||
        note.content_plaintext ||
        '',
    };
  },
};

export const listNotesConfig: UniversalToolConfig<
  Record<string, unknown>,
  | Record<string, unknown>[]
  | {
      data: Record<string, unknown>[];
      next_cursor?: string | null;
      pagination?: Record<string, unknown>;
    }
> = {
  name: 'list_notes',
  ...recordSearchResultContract,
  structuredOutput: (
    notes:
      | Record<string, unknown>[]
      | {
          data: Record<string, unknown>[];
          next_cursor?: string | null;
          pagination?: Record<string, unknown>;
        }
  ) => {
    // U5: cursor-bearing calls return the page envelope from the notes seam.
    if (
      notes &&
      typeof notes === 'object' &&
      !Array.isArray(notes) &&
      Array.isArray((notes as { data?: unknown }).data)
    ) {
      const envelope = notes as {
        data: Record<string, unknown>[];
        next_cursor?: string | null;
        pagination?: Record<string, unknown>;
      };
      return {
        data: envelope.data,
        count: envelope.data.length,
        ...(envelope.next_cursor !== undefined
          ? { next_cursor: envelope.next_cursor }
          : { next_cursor: null }),
        ...(envelope.pagination ? { pagination: envelope.pagination } : {}),
      };
    }
    const noteArray = notes as Record<string, unknown>[];
    return {
      data: noteArray,
      count: noteArray.length,
      next_cursor: null,
    };
  },
  handler: async (
    params: Record<string, unknown>
  ): Promise<
    | Record<string, unknown>[]
    | {
        data: Record<string, unknown>[];
        next_cursor?: string | null;
        pagination?: Record<string, unknown>;
      }
  > => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'list_notes',
        params
      ) as UniversalGetNotesParams;

      const recordId = sanitizedParams.record_id;
      if (!recordId || typeof recordId !== 'string' || !isValidUUID(recordId)) {
        throw new Error(
          `Invalid record_id: must be a UUID. Got: ${recordId ?? 'undefined'}`
        );
      }

      // U5 (KTD6): cursor-bearing calls page through the continuation-aware
      // seam so the sealed token and native upstream cursor stay bound to the
      // caller's scope; legacy offset calls keep their existing path.
      if (
        typeof sanitizedParams.cursor === 'string' &&
        sanitizedParams.cursor.length > 0
      ) {
        return await handleUniversalGetNotesPage(sanitizedParams);
      }
      return await handleUniversalGetNotes(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError('list_notes', 'notes', error);
    }
  },
  formatResult: (
    notes:
      | Record<string, unknown>[]
      | {
          data: Record<string, unknown>[];
          next_cursor?: string | null;
          pagination?: Record<string, unknown>;
        }
  ): string => {
    try {
      const notesArray = Array.isArray(notes)
        ? notes
        : Array.isArray(notes.data)
          ? notes.data
          : [];

      if (notesArray.length === 0) {
        return 'Found 0 notes';
      }

      const formattedNotes = notesArray
        .map((note, index) => {
          const { title, timestamp, id, preview } = extractNoteFields(note);
          return `${index + 1}. ${title} (${timestamp}) (ID: ${id})${
            preview ? `\n   ${preview}` : ''
          }`;
        })
        .join('\n\n');

      return `Found ${notesArray.length} notes:\n${formattedNotes}`;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const fallback = createErrorResult(
        err,
        'list_notes#format',
        'FORMAT'
      ) as McpErrorPayload;
      const message = fallback.content?.[0]?.text;
      return typeof message === 'string'
        ? message
        : 'Error formatting notes list';
    }
  },
};

export const createNoteDefinition = {
  name: 'create_note',
  description: formatToolDescription({
    capability:
      'Create note for companies, people, or deals with full markdown support.',
    boundaries: 'update or delete notes; creates only.',
    requiresApproval: true,
    constraints:
      'Requires resource_type, record_id, title, content. Set format="markdown" for rich formatting: headings (# ## ###), lists (- or 1.), nested bullets (2-space indent), bold (**text**), code blocks. Use \\n for line breaks.',
    recoveryHint: 'If record not found, use search_records first.',
  }),
  inputSchema: createNoteSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
};

export const listNotesDefinition = {
  name: 'list_notes',
  description: formatToolDescription({
    capability: 'Retrieve notes for a record with timestamps.',
    boundaries: 'create or modify notes; read-only.',
    constraints: 'Requires resource_type, record_id; sorted by creation date.',
    recoveryHint: 'If empty, verify record has notes with get_record_details.',
  }),
  inputSchema: listNotesSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};
