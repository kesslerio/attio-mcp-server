import {
  AttioFieldValue,
  AttioNote,
  AttioNoteIdentifier,
  AttioNoteValues,
} from '@/types/attio.js';

export interface NoteFields {
  title: string;
  content: string;
  id: string;
  timestamp: string;
  preview: string;
}

const DEFAULT_PREVIEW_LENGTH = 50;

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
};

const toNoteIdentifier = (id: unknown): AttioNoteIdentifier | undefined => {
  if (!id || typeof id !== 'object') {
    return undefined;
  }
  return id as AttioNoteIdentifier;
};

const fromValuesArray = (
  values?: AttioFieldValue[] | null
): string | undefined => {
  if (!Array.isArray(values) || values.length === 0) {
    return undefined;
  }
  for (const entry of values) {
    const value = toStringValue(entry?.value ?? entry?.full_name);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const extractFromNoteValues = (
  values: AttioNoteValues | null | undefined,
  field: keyof AttioNoteValues
): string | undefined => {
  if (!values) {
    return undefined;
  }
  const fieldValue = values[field];
  if (!fieldValue) {
    return undefined;
  }
  if (Array.isArray(fieldValue)) {
    return fromValuesArray(fieldValue);
  }
  if (
    fieldValue &&
    typeof fieldValue === 'object' &&
    'value' in fieldValue &&
    typeof (fieldValue as AttioFieldValue).value === 'string'
  ) {
    return String((fieldValue as AttioFieldValue).value);
  }
  return undefined;
};

/**
 * Normalize note fields from multiple potential Attio response shapes.
 */
export const extractNoteFields = (
  note: Record<string, unknown> | undefined,
  options?: { previewLength?: number }
): NoteFields => {
  const attioNote = (note ?? {}) as AttioNote;

  const title =
    toStringValue(attioNote.title) ||
    extractFromNoteValues(attioNote.values, 'title') ||
    'Untitled';

  const content =
    toStringValue(attioNote.content) ||
    toStringValue(attioNote.content_markdown) ||
    toStringValue(attioNote.content_plaintext) ||
    extractFromNoteValues(attioNote.values, 'content') ||
    '';

  const noteId = toNoteIdentifier(attioNote.id);
  const id =
    toStringValue(attioNote.record_id) ||
    toStringValue(attioNote.note_id) ||
    (typeof attioNote.id === 'string'
      ? toStringValue(attioNote.id)
      : undefined) ||
    toStringValue(noteId?.record_id) ||
    toStringValue(noteId?.note_id) ||
    toStringValue(noteId?.id) ||
    'unknown';

  const timestamp =
    toStringValue(attioNote.created_at) ||
    toStringValue(attioNote.timestamp) ||
    'unknown date';

  const previewLength = options?.previewLength ?? DEFAULT_PREVIEW_LENGTH;
  const trimmedContent = content.trim();
  const preview =
    trimmedContent.length > previewLength
      ? `${trimmedContent.slice(0, previewLength)}...`
      : trimmedContent;

  return {
    title,
    content,
    id,
    timestamp,
    preview,
  };
};
