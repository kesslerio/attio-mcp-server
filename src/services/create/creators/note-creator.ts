/**
 * NoteCreator - Strategy implementation for note resource creation
 *
 * Handles note-specific creation logic by delegating to the existing notes
 * object and normalizing the response format.
 */

import type { AttioRecord, JsonObject } from '../../../types/attio.js';
import type { ResourceCreatorContext } from './types.js';
import { BaseCreator } from './base-creator.js';
import { resolveMockId } from '../../../test-support/test-data-registry.js';
import { isValidUUID } from '../../../utils/validation/uuid-validation.js';
import { normalizeRecordForOutput } from '../extractor.js';

/**
 * Note input interface matching the expected format
 */
interface NoteInput {
  resource_type: string;
  record_id: string;
  title: string;
  content: string;
  format?: string;
}

/**
 * Interface for the note module
 */
interface NoteModule {
  createNote: (data: {
    parent_object: string;
    parent_record_id: string;
    title: string;
    content: string;
    format: string;
  }) => Promise<JsonObject>;
}

/**
 * Interface for the response utils module
 */
interface ResponseUtilsModule {
  unwrapAttio: (response: JsonObject) => JsonObject;
  normalizeNote: (note: JsonObject) => JsonObject;
}

/**
 * Note-specific resource creator
 * Implements Strategy Pattern for note creation via delegation
 */
export class NoteCreator extends BaseCreator {
  readonly resourceType = 'notes';
  readonly endpoint = '/objects/notes/records';

  // Lazy-loaded dependencies to prevent resource leaks from repeated dynamic imports
  private noteModule: NoteModule | null = null;
  private responseUtilsModule: ResponseUtilsModule | null = null;

  /**
   * Lazy-loads note dependencies to prevent repeated dynamic imports
   */
  private async ensureDependencies(): Promise<void> {
    if (!this.noteModule) {
      this.noteModule = (await import(
        '../../../objects/notes.js'
      )) as NoteModule;
    }
    if (!this.responseUtilsModule) {
      this.responseUtilsModule = (await import(
        '../../../utils/attio-response.js'
      )) as ResponseUtilsModule;
    }
  }

  /**
   * Creates a note record via delegation to notes object
   *
   * @param input - Note data including resource_type, record_id, title, content, format
   * @param context - Shared context with client and utilities
   * @returns Promise<AttioRecord> - Created note record (normalized)
   */
  async create(
    input: JsonObject,
    context: ResourceCreatorContext
  ): Promise<AttioRecord> {
    this.assertClientHasAuth(context);
    // Validate note input format
    const noteInput = this.validateNoteInput(input);

    // Resolve parent record ID (handles mock aliases in E2E)
    const rawParentId = noteInput.record_id;
    const parent_record_id = resolveMockId(rawParentId);

    if (!parent_record_id || !isValidUUID(parent_record_id)) {
      throw this.createEnhancedError(
        new Error(
          `Invalid parent_record_id (alias unresolved): ${rawParentId}`
        ),
        context,
        400
      );
    }

    context.debug(this.constructor.name, '🔍 Note creation input', {
      resource_type: noteInput.resource_type,
      original_record_id: rawParentId,
      resolved_record_id: parent_record_id,
      title: noteInput.title,
      content: noteInput.content,
      format: noteInput.format,
    });

    try {
      // Ensure dependencies are loaded
      await this.ensureDependencies();

      // Coerce format to Attio-accepted values (converts 'html' to 'plaintext')
      const coercedFormat =
        noteInput.format === 'markdown' ? 'markdown' : 'plaintext'; // Any non-markdown format becomes plaintext

      const noteData: JsonObject = {
        parent_object: noteInput.resource_type,
        parent_record_id,
        title: noteInput.title,
        content: noteInput.content,
        format: coercedFormat,
      };

      context.debug(this.constructor.name, 'Creating note with data', noteData);

      const response = await this.noteModule?.createNote(
        noteData as {
          parent_object: string;
          parent_record_id: string;
          title: string;
          content: string;
          format: string;
        }
      );

      // Unwrap varying API envelopes and normalize to stable shape
      const attioNote = this.responseUtilsModule?.unwrapAttio(
        (response || {}) as JsonObject
      );
      const normalizedNote = this.responseUtilsModule?.normalizeNote(
        (attioNote || {}) as JsonObject
      );

      context.debug(this.constructor.name, 'Note creation response', {
        hasResponse: !!response,
        hasAttioNote: !!attioNote,
        hasNormalizedNote: !!normalizedNote,
        noteId: normalizedNote?.id,
      });

      if (!normalizedNote) {
        throw new Error('Failed to normalize note response');
      }

      return normalizeRecordForOutput(normalizedNote as AttioRecord);
    } catch (err: unknown) {
      context.logError(this.constructor.name, 'Note creation error', {
        error: (err as Error)?.message,
        input: noteInput,
      });

      return this.handleApiError(
        err,
        context,
        noteInput as unknown as JsonObject
      );
    }
  }

  /**
   * Validates and structures note input
   */
  private validateNoteInput(input: JsonObject): NoteInput {
    const requiredFields = ['resource_type', 'record_id', 'title', 'content'];

    for (const field of requiredFields) {
      if (!input[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      resource_type: input.resource_type as string,
      record_id: input.record_id as string,
      title: input.title as string,
      content: input.content as string,
      format: (input.format as string) || 'plaintext',
    };
  }

  /**
   * Notes use delegation to notes object, so no input normalization needed
   */
  protected normalizeInput(input: JsonObject): JsonObject {
    return input;
  }

  /**
   * Notes use delegation, so no direct recovery needed
   * The notes object handles its own error cases
   */
  protected getRecoveryOptions(): null {
    return null;
  }

  /**
   * Override attemptRecovery to handle delegation approach
   */
  protected async attemptRecovery(
    context: ResourceCreatorContext
  ): Promise<AttioRecord> {
    // Notes are handled via delegation, so no direct recovery needed
    throw this.createEnhancedError(
      new Error('Note creation failed via delegation - no recovery available'),
      context,
      500
    );
  }
}
