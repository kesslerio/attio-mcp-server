import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  UniversalCreateNoteParams,
  UniversalGetNotesParams,
} from '@/handlers/tool-configs/universal/types.js';

vi.mock('@/handlers/tool-configs/universal/schemas.js', () => ({
  createNoteSchema: {},
  listNotesSchema: {},
  validateUniversalToolParams: vi.fn(),
}));

const mockCreateUniversalError = vi.fn(
  (_operation: string, _resource: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`universal-error:${message}`);
  }
);

vi.mock('@/services/ErrorService.js', () => ({
  ErrorService: {
    createUniversalError: mockCreateUniversalError,
  },
}));

const mockHandleUniversalCreateNote = vi.fn();
const mockHandleUniversalGetNotes = vi.fn();

vi.mock('@/handlers/tool-configs/universal/shared-handlers.js', () => ({
  handleUniversalCreateNote: mockHandleUniversalCreateNote,
  handleUniversalGetNotes: mockHandleUniversalGetNotes,
}));

const mockIsValidUUID = vi.fn();

vi.mock('@/utils/validation/uuid-validation.js', () => ({
  isValidUUID: mockIsValidUUID,
}));

const { createNoteConfig, listNotesConfig } =
  await import('@/handlers/tool-configs/universal/core/notes-operations.js');
const { extractNoteFields } =
  await import('@/handlers/tool-configs/universal/core/utils/note-formatters.js');
const { validateUniversalToolParams } =
  await import('@/handlers/tool-configs/universal/schemas.js');

describe('extractNoteFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns direct note fields when provided', () => {
    const note = {
      title: 'Direct Title',
      content: 'Direct Content',
      id: { record_id: 'note-123' },
      created_at: '2024-01-01T00:00:00Z',
    };

    const fields = extractNoteFields(note);

    expect(fields).toMatchObject({
      title: 'Direct Title',
      content: 'Direct Content',
      id: 'note-123',
      timestamp: '2024-01-01T00:00:00Z',
    });
    expect(fields.preview).toBe('Direct Content');
  });

  it('falls back to nested values arrays and generates preview', () => {
    const note = {
      values: {
        title: [{ value: 'Nested Title' }],
        content: [{ value: 'Nested content from values that is quite long' }],
      },
      id: 'fallback-id',
      timestamp: '2024-02-02T00:00:00Z',
    };

    const fields = extractNoteFields(note);

    expect(fields.title).toBe('Nested Title');
    expect(fields.content).toBe(
      'Nested content from values that is quite long'
    );
    expect(fields.id).toBe('fallback-id');
    expect(fields.timestamp).toBe('2024-02-02T00:00:00Z');
    expect(fields.preview).toBe(
      'Nested content from values that is quite long'.slice(0, 50)
    );
  });
});

describe('createNoteConfig.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid UUIDs before invoking upstream handler', async () => {
    const sanitizedParams: UniversalCreateNoteParams = {
      resource_type: 'notes',
      record_id: 'not-a-uuid',
      title: 'Invalid',
      content: 'Invalid',
    };

    vi.mocked(validateUniversalToolParams).mockReturnValueOnce(sanitizedParams);
    mockIsValidUUID.mockReturnValue(false);

    await expect(createNoteConfig.handler({})).rejects.toThrow(
      /Invalid record_id: must be a UUID/
    );

    expect(mockIsValidUUID).toHaveBeenCalledWith('not-a-uuid');
    expect(mockHandleUniversalCreateNote).not.toHaveBeenCalled();
    expect(mockCreateUniversalError).toHaveBeenCalled();
  });

  it('maps upstream error responses into universal errors', async () => {
    const sanitizedParams: UniversalCreateNoteParams = {
      resource_type: 'notes',
      record_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Example',
      content: 'Body',
    };

    vi.mocked(validateUniversalToolParams).mockReturnValueOnce(sanitizedParams);
    mockIsValidUUID.mockReturnValue(true);
    mockHandleUniversalCreateNote.mockResolvedValueOnce({
      success: false,
      error: 'invalid response from upstream',
    });

    await expect(createNoteConfig.handler({})).rejects.toThrow(
      /invalid response from upstream/
    );

    expect(mockCreateUniversalError).toHaveBeenCalled();
  });

  it('returns successful note payloads when upstream succeeds', async () => {
    const sanitizedParams: UniversalCreateNoteParams = {
      resource_type: 'notes',
      record_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Title',
      content: 'Content',
    };

    const upstreamResult = { id: { record_id: 'note-1' } };

    vi.mocked(validateUniversalToolParams).mockReturnValueOnce(sanitizedParams);
    mockIsValidUUID.mockReturnValue(true);
    mockHandleUniversalCreateNote.mockResolvedValueOnce(upstreamResult);

    await expect(createNoteConfig.handler({})).resolves.toEqual(upstreamResult);
  });

  it('passes markdown format through to the upstream handler', async () => {
    const sanitizedParams: UniversalCreateNoteParams = {
      resource_type: 'notes',
      record_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Markdown Title',
      content: '# Heading',
      format: 'markdown',
    };

    const upstreamResult = { id: { record_id: 'note-2' } };

    vi.mocked(validateUniversalToolParams).mockReturnValueOnce(sanitizedParams);
    mockIsValidUUID.mockReturnValue(true);
    mockHandleUniversalCreateNote.mockResolvedValueOnce(upstreamResult);

    await expect(createNoteConfig.handler({})).resolves.toEqual(upstreamResult);
    expect(mockHandleUniversalCreateNote).toHaveBeenCalledWith(sanitizedParams);
  });
});

describe('listNotesConfig.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid record IDs', async () => {
    const sanitizedParams: UniversalGetNotesParams = {
      resource_type: 'notes',
      record_id: 'invalid',
    };

    vi.mocked(validateUniversalToolParams).mockReturnValueOnce(sanitizedParams);
    mockIsValidUUID.mockReturnValue(false);

    await expect(listNotesConfig.handler({})).rejects.toThrow(
      /Invalid record_id: must be a UUID/
    );

    expect(mockHandleUniversalGetNotes).not.toHaveBeenCalled();
    expect(mockCreateUniversalError).toHaveBeenCalled();
  });

  it('returns normalized notes when upstream succeeds', async () => {
    const sanitizedParams: UniversalGetNotesParams = {
      resource_type: 'notes',
      record_id: '123e4567-e89b-12d3-a456-426614174000',
    };

    vi.mocked(validateUniversalToolParams).mockReturnValueOnce(sanitizedParams);
    mockIsValidUUID.mockReturnValue(true);
    const upstreamNotes = [{ title: 'Note', id: { record_id: 'note-1' } }];
    mockHandleUniversalGetNotes.mockResolvedValueOnce(upstreamNotes);

    await expect(listNotesConfig.handler({})).resolves.toEqual(upstreamNotes);
  });
});

describe('notes formatters', () => {
  it('formats created note response', () => {
    const message = createNoteConfig.formatResult({
      title: 'Meeting',
      content: 'Discussed roadmap',
      id: { record_id: 'note-1' },
    });

    expect(message).toContain(
      '✅ Note created successfully: Meeting (ID: note-1)'
    );
    expect(message).toContain('Discussed roadmap');
  });

  it('formats list notes response with preview', () => {
    const response = listNotesConfig.formatResult([
      {
        values: {
          title: [{ value: 'Nested' }],
          content: [{ value: 'Preview content for nested note extraction' }],
        },
        id: { record_id: 'note-xyz' },
        created_at: '2024-05-20T00:00:00Z',
      },
    ]);

    expect(response).toContain('Found 1 notes');
    expect(response).toContain('Nested (2024-05-20T00:00:00Z) (ID: note-xyz)');
    expect(response).toContain(
      'Preview content for nested note extraction'.slice(0, 50)
    );
  });
});
