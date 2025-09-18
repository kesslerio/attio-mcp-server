/**
 * NoteCreator - Strategy implementation for note resource creation
 *
 * Handles note-specific creation logic by delegating to the existing notes
 * object and normalizing the response format.
 */

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
 * Note-specific resource creator
 * Implements Strategy Pattern for note creation via delegation
 */
export class NoteCreator extends BaseCreator {
  readonly resourceType = 'notes';
  readonly endpoint = '/objects/notes/records';

  // Lazy-loaded dependencies to prevent resource leaks from repeated dynamic imports
  private noteModule: Record<string, unknown> | null = null;
  private responseUtilsModule: Record<string, unknown> | null = null;

  /**
   * Lazy-loads note dependencies to prevent repeated dynamic imports
   */
  private async ensureDependencies(): Promise<void> {
    if (!this.noteModule) {
      this.noteModule = await import('../../../objects/notes.js');
    }
    if (!this.responseUtilsModule) {
      this.responseUtilsModule = await import(
        '../../../utils/attio-response.js'
      );
    }
  }

  /**
   * Creates a note record via delegation to notes object
   *
   * @param input - Note data including resource_type, record_id, title, content, format
   * @param context - Shared context with client and utilities
   * @returns Promise<any> - Created note record (normalized)
   */
  async create(
    input: Record<string, unknown>,
    context: ResourceCreatorContext
  ): Promise<Record<string, unknown>> {
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

      const noteData = {
        parent_object: noteInput.resource_type,
        parent_record_id,
        title: noteInput.title,
        content: noteInput.content,
        format: coercedFormat,
      };

      context.debug(this.constructor.name, 'Creating note with data', noteData);

      const response = await this.noteModule.createNote(noteData);

      // Unwrap varying API envelopes and normalize to stable shape
      const attioNote = this.responseUtilsModule.unwrapAttio(response);
      const normalizedNote = this.responseUtilsModule.normalizeNote(attioNote);

      context.debug(this.constructor.name, 'Note creation response', {
        hasResponse: !!response,
        hasAttioNote: !!attioNote,
        hasNormalizedNote: !!normalizedNote,
        noteId: normalizedNote?.id,
      });

      return normalizeRecordForOutput(normalizedNote);
    } catch (err: unknown) {
      context.logError(this.constructor.name, 'Note creation error', {
        error: err instanceof Error ? err.message : String(err),
        input: noteInput,
      });

      return this.handleApiError(err, context, noteInput);
    }
  }

  /**
   * Validates and structures note input
   */
  private validateNoteInput(input: Record<string, unknown>): NoteInput {
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
  protected normalizeInput(
    input: Record<string, unknown>
  ): Record<string, unknown> {
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
  ): Promise<never> {
    // Notes are handled via delegation, so no direct recovery needed
    throw this.createEnhancedError(
      new Error('Note creation failed via delegation - no recovery available'),
      context,
      500
    );
  }
}
