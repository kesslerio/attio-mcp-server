import { afterEach, describe, expect, it, vi } from 'vitest';

const { handleUniversalSearch, handleUniversalUpdate, handleUniversalCreate } =
  vi.hoisted(() => ({
    handleUniversalSearch: vi.fn(),
    handleUniversalUpdate: vi.fn(),
    handleUniversalCreate: vi.fn(),
  }));

const { handleUniversalGetDetails } = vi.hoisted(() => ({
  handleUniversalGetDetails: vi.fn(),
}));

vi.mock('@/handlers/tool-configs/universal/shared-handlers.js', () => ({
  handleUniversalSearch,
  handleUniversalUpdate,
  handleUniversalCreate,
  handleUniversalGetDetails,
}));

import {
  upsertRecordConfig,
  upsertRecordDefinition,
} from '@/handlers/tool-configs/universal/core/upsert-operations.js';
import {
  AmbiguousUpsertMatchError,
  fieldAlreadyMatches,
} from '@/services/UniversalUpsertService.js';

const RECORD_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function personRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: { record_id: RECORD_ID },
    values: {
      name: [{ value: 'Jane Doe' }],
      email: [{ value: 'jane@acme.com' }],
      job_title: [{ value: 'Engineer' }],
      ...overrides,
    },
  };
}

describe('upsert_record tool surface', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('registers with write annotations and a schema without top-level combinators', () => {
    expect(upsertRecordDefinition.name).toBe('upsert_record');
    expect(upsertRecordDefinition.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
    });
    const schema = upsertRecordDefinition.inputSchema as Record<
      string,
      unknown
    >;
    expect(schema).not.toHaveProperty('oneOf');
    expect(schema).not.toHaveProperty('allOf');
    expect(schema).not.toHaveProperty('anyOf');
    expect(schema.required).toEqual(['resource_type', 'match', 'values']);
  });

  it('rejects missing match before any search or write', async () => {
    await expect(
      upsertRecordConfig.handler({
        resource_type: 'people',
        values: { job_title: 'CEO' },
      })
    ).rejects.toThrow('match');
    expect(handleUniversalSearch).not.toHaveBeenCalled();
    expect(handleUniversalCreate).not.toHaveBeenCalled();
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });

  it('rejects empty values before any search or write', async () => {
    await expect(
      upsertRecordConfig.handler({
        resource_type: 'people',
        match: { attribute: 'email', value: 'jane@acme.com' },
        values: {},
      })
    ).rejects.toThrow('values');
    expect(handleUniversalSearch).not.toHaveBeenCalled();
  });

  it('rejects non-boolean create_if_missing before any search', async () => {
    await expect(
      upsertRecordConfig.handler({
        resource_type: 'people',
        match: { attribute: 'email', value: 'jane@acme.com' },
        values: { job_title: 'CEO' },
        create_if_missing: 'false' as unknown as boolean,
      })
    ).rejects.toThrow('create_if_missing must be a boolean');
    expect(handleUniversalSearch).not.toHaveBeenCalled();
  });

  it('rejects a malformed record_id before any write', async () => {
    await expect(
      upsertRecordConfig.handler({
        resource_type: 'people',
        match: { attribute: 'email', value: 'jane@acme.com' },
        values: { job_title: 'CEO' },
        record_id: 'not-a-uuid',
      })
    ).rejects.toThrow('UUID');
    expect(handleUniversalCreate).not.toHaveBeenCalled();
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });
});

describe('UniversalUpsertService matching behavior', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const base = {
    resource_type: 'people',
    match: { attribute: 'email', value: 'jane@acme.com' },
    values: { job_title: 'VP Engineering' },
  };

  it('updates the single matched record with only changed fields', async () => {
    handleUniversalSearch.mockResolvedValueOnce([personRecord()]);
    handleUniversalUpdate.mockResolvedValueOnce(personRecord());

    const result = await upsertRecordConfig.handler(base);

    expect(result.action).toBe('updated');
    expect(result.record_id).toBe(RECORD_ID);
    expect(result.changed_fields).toEqual(['job_title']);
    expect(handleUniversalUpdate).toHaveBeenCalledWith({
      resource_type: 'people',
      record_id: RECORD_ID,
      record_data: { job_title: 'VP Engineering' },
    });
    expect(handleUniversalCreate).not.toHaveBeenCalled();
    expect(upsertRecordConfig.formatResult(result)).toEqual(expect.any(String));
  });

  it('creates and merges the match pair when nothing matches', async () => {
    handleUniversalSearch.mockResolvedValue([]);
    handleUniversalCreate.mockResolvedValueOnce({
      id: { record_id: OTHER_ID },
      values: {},
    });

    const result = await upsertRecordConfig.handler(base);

    expect(result.action).toBe('created');
    expect(result.record_id).toBe(OTHER_ID);
    expect(handleUniversalCreate).toHaveBeenCalledWith({
      resource_type: 'people',
      record_data: {
        email: 'jane@acme.com',
        job_title: 'VP Engineering',
      },
    });
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });

  it('lets values win over the match pair for the same attribute on create', async () => {
    handleUniversalSearch.mockResolvedValue([]);
    handleUniversalCreate.mockResolvedValueOnce({
      id: { record_id: OTHER_ID },
      values: {},
    });

    await upsertRecordConfig.handler({
      resource_type: 'people',
      match: { attribute: 'email', value: 'jane@acme.com' },
      values: {
        email: [{ value: 'jane@acme.com' }, { value: 'jane@oldco.com' }],
      },
    });

    expect(handleUniversalCreate).toHaveBeenCalledWith({
      resource_type: 'people',
      record_data: {
        email: [{ value: 'jane@acme.com' }, { value: 'jane@oldco.com' }],
      },
    });
  });

  it('reports noop without a write when the match already has the values', async () => {
    handleUniversalSearch.mockResolvedValue([
      personRecord({ job_title: [{ value: 'VP Engineering' }] }),
    ]);

    const result = await upsertRecordConfig.handler(base);

    expect(result.action).toBe('noop');
    expect(result.record_id).toBe(RECORD_ID);
    expect(result.changed_fields).toEqual([]);
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
    expect(handleUniversalCreate).not.toHaveBeenCalled();
  });

  it('reports ambiguity when a full page of matches returns', async () => {
    handleUniversalSearch.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) => ({
        id: { record_id: `11111111-1111-4111-8111-00000000000${i}` },
        values: {},
      }))
    );

    await expect(upsertRecordConfig.handler(base)).rejects.toThrow(
      /Ambiguous match/
    );
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
    expect(handleUniversalCreate).not.toHaveBeenCalled();
  });

  it('reports concurrent duplicates after create without failing', async () => {
    handleUniversalSearch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: { record_id: OTHER_ID }, values: {} }]);
    handleUniversalCreate.mockResolvedValueOnce({
      id: { record_id: RECORD_ID },
      values: {},
    });

    const result = await upsertRecordConfig.handler(base);

    expect(result.action).toBe('created');
    expect(result.concurrent_duplicates).toEqual([OTHER_ID]);
    expect(result.message).toContain('duplicate records');
  });

  it('fails with candidate ids on an ambiguous match and never writes', async () => {
    handleUniversalSearch.mockResolvedValue([
      personRecord(),
      { id: { record_id: OTHER_ID }, values: {} },
    ]);

    const error = await upsertRecordConfig
      .handler(base)
      .then(() => null)
      .catch((thrown: unknown) => thrown);

    // ErrorService.createUniversalError wraps with a UniversalValidationError
    // and preserves the original as `cause`.
    const cause = (error as { cause?: unknown }).cause;
    expect(cause).toBeInstanceOf(AmbiguousUpsertMatchError);
    expect((cause as AmbiguousUpsertMatchError).recordIds).toEqual([
      RECORD_ID,
      OTHER_ID,
    ]);
    expect((error as Error).message).toContain('Ambiguous match');
    expect((error as Error).message).toContain(RECORD_ID);
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
    expect(handleUniversalCreate).not.toHaveBeenCalled();
  });

  it('errors without creating when create_if_missing is false', async () => {
    handleUniversalSearch.mockResolvedValueOnce([]);

    await expect(
      upsertRecordConfig.handler({ ...base, create_if_missing: false })
    ).rejects.toThrow(/create_if_missing is false/);
    expect(handleUniversalCreate).not.toHaveBeenCalled();
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });

  it('dry_run previews create without calling create', async () => {
    handleUniversalSearch.mockResolvedValueOnce([]);

    const result = await upsertRecordConfig.handler({ ...base, dry_run: true });

    expect(result.action).toBe('dry_run');
    expect(result.planned_action).toBe('created');
    expect(result.changed_fields).toContain('job_title');
    expect(result.changed_fields).toContain('email');
    expect(handleUniversalCreate).not.toHaveBeenCalled();
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });

  it('dry_run previews update without calling update', async () => {
    handleUniversalSearch.mockResolvedValueOnce([personRecord()]);

    const result = await upsertRecordConfig.handler({ ...base, dry_run: true });

    expect(result.action).toBe('dry_run');
    expect(result.planned_action).toBe('updated');
    expect(result.record_id).toBe(RECORD_ID);
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });

  it('dry_run reports noop when the record already matches', async () => {
    handleUniversalSearch.mockResolvedValue([
      personRecord({ job_title: [{ value: 'VP Engineering' }] }),
    ]);

    const result = await upsertRecordConfig.handler({ ...base, dry_run: true });

    expect(result.action).toBe('dry_run');
    expect(result.planned_action).toBe('noop');
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });

  it('targets record_id via get-details and enforces the match pair on the record', async () => {
    handleUniversalGetDetails.mockResolvedValueOnce(personRecord());
    handleUniversalUpdate.mockResolvedValueOnce(personRecord());

    const result = await upsertRecordConfig.handler({
      resource_type: 'people',
      match: { attribute: 'email', value: 'new@acme.com' },
      values: { job_title: 'Engineer' },
      record_id: RECORD_ID,
    });

    expect(result.action).toBe('updated');
    expect(result.matched_on).toEqual({ record_id: RECORD_ID });
    expect(handleUniversalGetDetails).toHaveBeenCalledWith({
      resource_type: 'people',
      record_id: RECORD_ID,
    });
    // email differs from the record's stored value -> merged into payload;
    // job_title already equals the stored value -> skipped.
    expect(handleUniversalUpdate).toHaveBeenCalledWith({
      resource_type: 'people',
      record_id: RECORD_ID,
      record_data: { email: 'new@acme.com' },
    });
  });

  it('errors when record_id targets a nonexistent record and never creates', async () => {
    handleUniversalGetDetails.mockRejectedValueOnce(
      new Error('Record not found')
    );

    await expect(
      upsertRecordConfig.handler({
        ...base,
        record_id: OTHER_ID,
      })
    ).rejects.toThrow(/not found/i);
    expect(handleUniversalCreate).not.toHaveBeenCalled();
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });

  it('refuses to write when get-details returns a different record id', async () => {
    handleUniversalGetDetails.mockResolvedValueOnce(personRecord());

    await expect(
      upsertRecordConfig.handler({
        ...base,
        record_id: OTHER_ID,
      })
    ).rejects.toThrow(/refusing to write an unrelated record/);
    expect(handleUniversalUpdate).not.toHaveBeenCalled();
  });

  it('routes config-discovered custom objects through search/create unchanged', async () => {
    handleUniversalSearch.mockResolvedValue([]);
    handleUniversalCreate.mockResolvedValueOnce({
      id: { record_id: OTHER_ID },
      values: {},
    });

    const result = await upsertRecordConfig.handler({
      resource_type: 'users',
      match: { attribute: 'email', value: 'bot@acme.com' },
      values: { name: 'Sync Bot' },
    });

    expect(result.action).toBe('created');
    expect(result.resource_type).toBe('users');
    expect(handleUniversalSearch).toHaveBeenCalledWith(
      expect.objectContaining({ resource_type: 'users' })
    );
    expect(handleUniversalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: 'users',
        record_data: { name: 'Sync Bot', email: 'bot@acme.com' },
      })
    );
  });
});

describe('fieldAlreadyMatches', () => {
  it('treats Attio array-value shapes as matching plain values', () => {
    expect(fieldAlreadyMatches([{ value: 'acme.com' }], 'acme.com')).toBe(true);
    expect(fieldAlreadyMatches([{ value: 'acme.com' }], ' acme.com ')).toBe(
      true
    );
    expect(fieldAlreadyMatches([{ value: 'other.com' }], 'acme.com')).toBe(
      false
    );
    // Case is preserved on the truthy side: a case-only difference must NOT
    // be treated as equal (that would silently drop the requested write).
    expect(fieldAlreadyMatches([{ value: 'ACME.com' }], 'acme.com')).toBe(
      false
    );
    // Multi-entry arrays are only equal as full multisets.
    expect(
      fieldAlreadyMatches(
        [{ value: 'a@x.com' }, { value: 'b@y.com' }],
        'a@x.com'
      )
    ).toBe(false);
    expect(
      fieldAlreadyMatches(
        [{ value: 'b@y.com' }, { value: 'a@x.com' }],
        ['a@x.com', 'b@y.com']
      )
    ).toBe(true);
    // Attio-native entry shapes without a value key (record references) are
    // never assumed equal.
    expect(
      fieldAlreadyMatches([{ target_record: { record_id: 'x' } }], 'x')
    ).toBe(false);
  });

  it('treats missing and differing values as changed', () => {
    expect(fieldAlreadyMatches(undefined, 'x')).toBe(false);
    expect(fieldAlreadyMatches('x', 'y')).toBe(false);
    expect(fieldAlreadyMatches('x', 'x')).toBe(true);
  });
});
