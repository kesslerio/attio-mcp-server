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
  name: 'create-note',
  handler: async (
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'create-note',
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
      throw ErrorService.createUniversalError('create-note', 'notes', err);
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
        'create-note#format',
        'FORMAT'
      ) as McpErrorPayload;
      const message = fallback.content?.[0]?.text;
      return typeof message === 'string'
        ? message
        : 'Error formatting note result';
    }
  },
};

export const listNotesConfig: UniversalToolConfig<
  Record<string, unknown>,
  Record<string, unknown>[]
> = {
  name: 'list-notes',
  handler: async (
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'list-notes',
        params
      ) as UniversalGetNotesParams;

      const recordId = sanitizedParams.record_id;
      if (!recordId || typeof recordId !== 'string' || !isValidUUID(recordId)) {
        throw new Error(
          `Invalid record_id: must be a UUID. Got: ${recordId ?? 'undefined'}`
        );
      }

      return await handleUniversalGetNotes(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError('list-notes', 'notes', error);
    }
  },
  formatResult: (notes: Record<string, unknown>[]): string => {
    try {
      const notesArray = Array.isArray(notes) ? notes : [];

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
        'list-notes#format',
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
  name: 'create-note',
  description: formatToolDescription({
    capability:
      'Create note for companies, people, or deals with optional markdown formatting.',
    boundaries: 'update or delete notes; creates only.',
    requiresApproval: true,
    constraints:
      'Requires resource_type, record_id, title, content. Optional format (plaintext or markdown).',
    recoveryHint: 'If record not found, use records_search first.',
  }),
  inputSchema: createNoteSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
};

export const listNotesDefinition = {
  name: 'list-notes',
  description: formatToolDescription({
    capability: 'Retrieve notes for a record with timestamps.',
    boundaries: 'create or modify notes; read-only.',
    constraints: 'Requires resource_type, record_id; sorted by creation date.',
    recoveryHint: 'If empty, verify record has notes with records_get_details.',
  }),
  inputSchema: listNotesSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};
