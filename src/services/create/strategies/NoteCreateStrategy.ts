import type { AttioRecord } from '../../../types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../../handlers/tool-configs/universal/schemas.js';
import { createNote, normalizeNoteResponse } from '../../../objects/notes.js';

export class NoteCreateStrategy implements CreateStrategy {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    const { values } = params;
    const mapped = values as Record<string, unknown>;

    // Validate required content field (trimmed)
    const rawContent = mapped.content;
    const content =
      typeof rawContent === 'string' && rawContent.trim()
        ? rawContent.trim()
        : undefined;
    if (!content) {
      throw new UniversalValidationError(
        `Invalid content provided for notes: ${String(rawContent)}`,
        ErrorType.USER_ERROR,
        { field: 'content', suggestion: 'Provide non-empty content' }
      );
    }

    const parentObject = mapped.parent_object as string;
    if (!parentObject || typeof parentObject !== 'string') {
      throw new UniversalValidationError(
        'parent_object is required and must be a valid object slug',
        ErrorType.USER_ERROR,
        { field: 'parent_object' }
      );
    }

    const parentRecordId = mapped.parent_record_id as string;
    if (!parentRecordId) {
      throw new UniversalValidationError(
        'parent_record_id is required',
        ErrorType.USER_ERROR,
        { field: 'parent_record_id' }
      );
    }

    const format = (mapped.format as 'markdown' | 'plaintext') || 'plaintext';
    const response = await createNote({
      parent_object: parentObject,
      parent_record_id: parentRecordId,
      content,
      format,
      title: (mapped.title as string) || undefined,
    });

    const normalized = normalizeNoteResponse(response.data);
    return normalized as unknown as AttioRecord;
  }
}
