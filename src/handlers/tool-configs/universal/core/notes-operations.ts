import { UniversalToolConfig } from '../types.js';
import {
  createNoteSchema,
  listNotesSchema,
  validateUniversalToolParams,
} from '../schemas.js';
import {
  handleUniversalCreateNote,
  handleUniversalGetNotes,
} from '../shared-handlers.js';
import { ErrorService } from '../../../../services/ErrorService.js';

export const createNoteConfig: UniversalToolConfig = {
  name: 'create-note',
  handler: async (
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'create-note',
        params
      );
      const res = await handleUniversalCreateNote(sanitizedParams);
      return res;
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status: number;
          data?: { error?: { message: string }; message?: string };
        };
      };
      const status = error?.response?.status;
      const body = error?.response?.data;

      const upstreamMsg =
        body?.error?.message ||
        body?.message ||
        (typeof body?.error === 'string' ? body.error : undefined);

      const mapped =
        status === 404
          ? 'record not found'
          : status === 400 || status === 422
            ? 'invalid or missing required parameter'
            : upstreamMsg || 'invalid request';

      return { isError: true, error: mapped };
    }
  },
  formatResult: (note: Record<string, unknown>): string => {
    if (!note) {
      return 'No note created';
    }

    const title =
      (note.title as string) ||
      (note.values as { title?: { value: string }[] })?.title?.[0]?.value ||
      'Untitled';
    const content =
      (note.content as string) ||
      (note.values as { content?: { value: string }[] })?.content?.[0]?.value ||
      '';
    const id =
      (note.id as { record_id: string })?.record_id || note.id || 'unknown';

    return `✅ Note created successfully: ${title} (ID: ${id})${content ? `\n${content}` : ''}`;
  },
};

export const listNotesConfig: UniversalToolConfig = {
  name: 'list-notes',
  handler: async (
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams('list-notes', params);
      return await handleUniversalGetNotes(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError('list-notes', 'notes', error);
    }
  },
  formatResult: (notes: Record<string, unknown>[]): string => {
    const notesArray = notes || [];

    if (notesArray.length === 0) {
      return 'Found 0 notes';
    }

    const formattedNotes = notesArray
      .map((note, index) => {
        const title =
          (note.title as string) ||
          (note.values as { title?: { value: string }[] })?.title?.[0]?.value ||
          'Untitled';
        const content =
          (note.content as string) ||
          (note.values as { content?: { value: string }[] })?.content?.[0]
            ?.value ||
          '';
        const id =
          (note.id as { record_id: string })?.record_id || note.id || 'unknown';
        const timestamp =
          (note.created_at as string) ||
          (note.timestamp as string) ||
          'unknown date';

        const preview =
          (content as string).length > 50
            ? (content as string).substring(0, 50) + '...'
            : (content as string);
        return `${index + 1}. ${title} (${timestamp}) (ID: ${id})${preview ? `\n   ${preview}` : ''}`;
      })
      .join('\n\n');

    return `Found ${notesArray.length} notes:\n${formattedNotes}`;
  },
};

export const createNoteDefinition = {
  name: 'create-note',
  description: 'Create a note for any record type (companies, people, deals)',
  inputSchema: createNoteSchema,
};

export const listNotesDefinition = {
  name: 'list-notes',
  description: 'Get notes for any record type (companies, people, deals)',
  inputSchema: listNotesSchema,
};
