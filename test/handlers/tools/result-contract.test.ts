import { afterEach, describe, expect, it, vi } from 'vitest';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  buildStructuredToolResult,
  finalizeLegacyToolResult,
  ResultEncodingError,
} from '@/handlers/tools/result-contract.js';
import {
  executionErrorSchema,
  recordDetailsResultContract,
  recordSearchResultContract,
} from '@/handlers/tools/result-schemas.js';
import { getRecordDetailsConfig } from '@/handlers/tool-configs/universal/core/record-details-operations.js';
import { searchRecordsConfig } from '@/handlers/tool-configs/universal/core/search-operations.js';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';
import * as serializer from '@/utils/json-serializer.js';
import { UniversalUtilityService } from '@/services/UniversalUtilityService.js';
import { normalizeNoteResponse } from '@/objects/notes.js';
import type { AttioNote } from '@/types/attio.js';
import { ErrorEnhancer } from '@/errors/enhanced-api-errors.js';
import { filterListEntriesByParent } from '@/objects/lists/filtering.js';
import * as genericLists from '@/api/operations/lists.js';
import * as lazyClient from '@/api/lazy-client.js';
import { createErrorResult } from '@/utils/error-handler.js';
import { ErrorService } from '@/services/ErrorService.js';
import {
  CompanyMockFactory,
  ListMockFactory,
  PersonMockFactory,
  TaskMockFactory,
} from '@test/utils/mock-factories/index.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('result contract serialization', () => {
  it.each([undefined, '', 'true', 'false'])(
    'preserves machine output and honors text setting %s',
    (setting) => {
      vi.stubEnv('MCP_TEXT_RESULTS', setting);
      const record = CompanyMockFactory.create();
      const formatter = vi.fn(() => 'Company details');
      const result = buildStructuredToolResult(
        { ...getRecordDetailsConfig, formatResult: formatter },
        record,
        { resource_type: 'companies' }
      );
      expect(formatter).toHaveBeenCalledTimes(setting === 'false' ? 0 : 1);
      expect(result.content).toHaveLength(setting === 'false' ? 2 : 3);
      expect(JSON.parse(result.content[0].text as string)).toEqual(
        result.structuredContent?.data
      );
      expect(JSON.parse(result.content.at(-1)!.text as string)).toEqual(
        result.structuredContent
      );
      expect(
        CallToolResultSchema.parse(JSON.parse(JSON.stringify(result)))
          .structuredContent
      ).toEqual(result.structuredContent);
    }
  );

  it.each([getRecordDetailsConfig, searchRecordsConfig])(
    'keeps %s machine projections equal when optional prose is disabled',
    (config) => {
      const record = CompanyMockFactory.create();
      const raw = config === searchRecordsConfig ? [record] : record;
      const formatter = vi.fn(() => 'Optional prose');
      vi.stubEnv('MCP_TEXT_RESULTS', 'true');
      const enabled = buildStructuredToolResult({ ...config, formatResult: formatter }, raw, {});
      vi.stubEnv('MCP_TEXT_RESULTS', 'false');
      const disabled = buildStructuredToolResult({ ...config, formatResult: formatter }, raw, {});
      expect(formatter).toHaveBeenCalledOnce();
      expect(disabled.structuredContent).toEqual(enabled.structuredContent);
      expect(disabled.content).toEqual(enabled.content.filter((block) => block.text !== 'Optional prose'));
    }
  );

  it.each([false, true])('serializes converted tasks with optional fields present=%s', (assigned) => {
    const task = TaskMockFactory.create(assigned ? {
      assignee_id: 'assignee-id', due_date: '2026-10-02', linked_records: [],
    } : {});
    delete task.id.workspace_id;
    const record = UniversalUtilityService.convertTaskToRecord(task);
    for (const [config, raw] of [
      [getRecordDetailsConfig, record], [searchRecordsConfig, [record]],
    ] as const) {
      const result = buildStructuredToolResult(config, raw, { resource_type: 'tasks' });
      const data = result.structuredContent?.data;
      const encoded = Array.isArray(data) ? data[0] : data;
      expect(encoded).toMatchObject({ id: { task_id: task.id.task_id }, values: { content: task.content } });
      expect(config.resultSchema!.safeParse(JSON.parse(JSON.stringify(result.structuredContent))).success).toBe(true);
      if (assigned) {
        expect(encoded).toMatchObject({ assignee_id: 'assignee-id', values: { assignee: 'assignee-id', due_date: '2026-10-02', linked_records: [] } });
      } else {
        expect(encoded.values).not.toHaveProperty('assignee');
        expect(encoded.values).not.toHaveProperty('due_date');
        expect(encoded).not.toHaveProperty('assignee_id');
      }
    }
  });

  it('serializes normalized notes with absent or populated optional content', () => {
    const id = CompanyMockFactory.create().id.record_id;
    for (const fields of [{}, { title: 'Notes', content: 'Keep this CRM body.' }]) {
      const note = { id, parent_object: 'companies', parent_record_id: id, created_at: '2026-10-02', ...fields } as AttioNote;
      const record = normalizeNoteResponse(note);
      const result = buildStructuredToolResult(getRecordDetailsConfig, record, { resource_type: 'notes' });
      expect(result.isError).toBe(false);
      expect(result.structuredContent).toMatchObject({ data: { id: { record_id: id }, raw: note } });
      if ('content' in fields) {
        expect(result.structuredContent).toMatchObject({ data: { values: { content_markdown: fields.content } } });
      } else {
        expect(record.values).not.toHaveProperty('title');
        expect(record.values).not.toHaveProperty('content_markdown');
        expect(record.values).not.toHaveProperty('content_plaintext');
      }
    }
  });

  it('returns validated success when a companion formatter fails after completion', () => {
    const record = CompanyMockFactory.create();
    const formatter = vi.fn(() => {
      throw new Error('prose failed');
    });
    const result = buildStructuredToolResult(
      { ...getRecordDetailsConfig, formatResult: formatter },
      record,
      { resource_type: 'companies' }
    );
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({ data: { id: record.id } });
    expect(result.content).toHaveLength(2);
    expect(formatter).toHaveBeenCalledOnce();
  });

  it('validates representative detail resources without losing identifiers or note bodies', () => {
    const records = [
      CompanyMockFactory.create(),
      PersonMockFactory.create(),
      TaskMockFactory.create({ content: 'Task content', title: 'Task title' }),
      ListMockFactory.create(),
    ];
    const validator = new AjvJsonSchemaValidator().getValidator(
      recordDetailsResultContract.outputSchema!
    );
    for (const record of records) {
      const result = buildStructuredToolResult(
        getRecordDetailsConfig,
        record,
        {}
      );
      expect(validator(result.structuredContent).valid).toBe(true);
      expect(result.structuredContent).toMatchObject({
        data: { id: record.id },
      });
    }
    const record = CompanyMockFactory.create();
    const body =
      'Call notes: ask for a revised quote.\nKeep original CRM prose.';
    record.values.note_body = body;
    expect(
      buildStructuredToolResult(getRecordDetailsConfig, record, {})
        .structuredContent
    ).toMatchObject({ data: { values: { note_body: body } } });
  });

  it('validates empty search pages, exact counts, and exclusive success/error schemas', () => {
    const result = buildStructuredToolResult(searchRecordsConfig, [], {});
    expect(result.structuredContent).toEqual({
      data: [],
      count: 0,
      next_cursor: null,
    });
    const validator = new AjvJsonSchemaValidator().getValidator(
      recordSearchResultContract.outputSchema!
    );
    expect(validator(result.structuredContent).valid).toBe(true);
    const failure = createSecureToolErrorResult(
      new Error('Unknown failure')
    ).structuredContent;
    expect(validator(failure).valid).toBe(true);
    expect(validator({ ...result.structuredContent, ...failure }).valid).toBe(
      false
    );
    expect(
      validator({ data: [{ id: {} }], count: 1, next_cursor: null }).valid
    ).toBe(false);
    expect(() =>
      buildStructuredToolResult(
        {
          ...searchRecordsConfig,
          structuredOutput: () => ({ data: [], count: 1, next_cursor: null }),
        },
        [],
        {}
      )
    ).toThrow(ResultEncodingError);
  });

  it.each([null, undefined])(
    'rejects absent detail results (%s) rather than returning invalid success',
    (raw) => {
      expect(() =>
        buildStructuredToolResult(getRecordDetailsConfig, raw, {})
      ).toThrow(ResultEncodingError);
      expect(() =>
        buildStructuredToolResult(searchRecordsConfig, raw, {})
      ).toThrow(ResultEncodingError);
    }
  );

  it.each([NaN, Infinity, undefined, 1n])(
    'rejects unsupported attribute values (%s)',
    (value) => {
      const record = CompanyMockFactory.create();
      record.values.invalid_value = value;
      expect(() =>
        buildStructuredToolResult(getRecordDetailsConfig, record, {})
      ).toThrow(ResultEncodingError);
    }
  );

  it('rejects circular data and sanitized mutations of valid domain data', () => {
    const circular = CompanyMockFactory.create();
    circular.values.loop = circular;
    expect(() =>
      buildStructuredToolResult(getRecordDetailsConfig, circular, {})
    ).toThrow(ResultEncodingError);
    const record = CompanyMockFactory.create();
    vi.spyOn(serializer, 'sanitizeMcpResponse').mockReturnValue({
      content: [],
      isError: false,
      structuredContent: { data: { ...record, values: {} } },
    });
    expect(() =>
      buildStructuredToolResult(getRecordDetailsConfig, record, {})
    ).toThrow(ResultEncodingError);
  });

  it.each([
    { error: 'Failed to create safe copy' },
    { content: [{ type: 'text', text: 'Sanitization failed' }], isError: true },
  ])(
    'brings sanitizer fallback into the structured error shape',
    (fallback) => {
      vi.spyOn(serializer, 'sanitizeMcpResponse').mockReturnValue(fallback);
      expect(() =>
        buildStructuredToolResult(
          getRecordDetailsConfig,
          CompanyMockFactory.create(),
          {}
        )
      ).toThrow(ResultEncodingError);
      const result = finalizeLegacyToolResult(
        { content: [], isError: false },
        'create_record',
        false
      );
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: { code: 'RESULT_ENCODING_FAILED', retryable: false },
        },
      });
    }
  );

  it('preserves non-migrated MCP success projections and normalizes early errors', () => {
    const success = {
      content: [{ type: 'text', text: '{"results":[]}' }],
      isError: false,
    };
    expect(finalizeLegacyToolResult(success, 'search', true)).toEqual(success);
    const denied = finalizeLegacyToolResult(
      {
        content: [],
        isError: true,
        error: { status: 403, message: 'Access denied' },
      },
      'create_list',
      false
    );
    expect(denied).toMatchObject({
      isError: true,
      structuredContent: {
        error: { code: 'PERMISSION_DENIED', retryable: false },
      },
    });
  });
});

describe('execution error contracts', () => {
  it.each([
    [400, 'VALIDATION_ERROR', false],
    [401, 'UNAUTHENTICATED', false],
    [403, 'PERMISSION_DENIED', false],
    [404, 'NOT_FOUND', false],
    [429, 'RATE_LIMITED', true],
    [503, 'UPSTREAM_UNAVAILABLE', true],
  ])(
    'preserves API status %s through universal wrappers',
    (status, code, retryable) => {
      const original = Object.assign(new Error('Attio call failed'), {
        status,
      });
      const wrapped = ErrorService.createUniversalError(
        'search',
        'companies',
        original
      );
      const result = createSecureToolErrorResult(wrapped);
      expect(result).toMatchObject({
        isError: true,
        structuredContent: { error: { code, retryable } },
      });
      expect(
        executionErrorSchema.safeParse(
          JSON.parse(JSON.stringify(result.structuredContent))
        ).success
      ).toBe(true);
    }
  );

  it.each(['', 'short', 'invalid key with spaces'])(
    'preserves typed credential rejection through client signatures and enhancement',
    async (apiKey) => {
      const actual = await vi.importActual<typeof import('@/api/attio-client.js')>('@/api/attio-client.js');
      for (const create of [
        () => actual.createAttioClient({ apiKey }),
        () => actual.createLegacyAttioClient(apiKey),
      ]) {
        let failure: unknown;
        try { create(); } catch (error) { failure = error; }
        expect(failure).toMatchObject({ code: 'UNAUTHENTICATED' });
        const enhanced = ErrorEnhancer.enhance(failure as Error);
        const result = createSecureToolErrorResult(ErrorService.createUniversalError('get details', 'companies', enhanced));
        expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: 'UNAUTHENTICATED', retryable: false } } });
      }
    }
  );

  it.each([
    [400, 'VALIDATION_ERROR'], [403, 'PERMISSION_DENIED'],
    [404, 'NOT_FOUND'], [503, 'UPSTREAM_UNAVAILABLE'],
  ] as const)('retains original HTTP %s failures through native list operations', async (status, code) => {
    const original = Object.assign(new Error('List request failed'), { response: { status, data: {} } });
    const api = { post: vi.fn().mockRejectedValue(original), patch: vi.fn().mockRejectedValue(original) };
    vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
    const id = CompanyMockFactory.create().id.record_id;
    for (const operation of [
      () => genericLists.addRecordToList(id, id, 'companies', {}, { maxRetries: 0 }),
      () => genericLists.updateListEntry(id, id, { stage: 'New' }, { maxRetries: 0 }),
      () => filterListEntriesByParent(id, 'companies', 'name', 'equals', 'Company'),
    ]) {
      const error = await operation().catch((failure: unknown) => failure);
      expect(error).toBe(original);
      const projected = createErrorResult(error, `/lists/${id}/entries`, 'POST');
      const result = finalizeLegacyToolResult(projected, 'manage-list-entry', false);
      expect(result).toMatchObject({ isError: true, structuredContent: { error: { code, retryable: false } } });
    }
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.patch).toHaveBeenCalledOnce();
  });

  it('classifies missing credentials, input validation, unknown failures, and network errors', () => {
    for (const [error, code] of [
      [
        new Error('Attio API key is required for client initialization.'),
        'UNAUTHENTICATED',
      ],
      [
        ErrorService.createUniversalError(
          'search',
          'companies',
          new Error('resource_type is required')
        ),
        'VALIDATION_ERROR',
      ],
      [new Error('Unknown problem'), 'INTERNAL_ERROR'],
      [
        Object.assign(new Error('Connection refused'), {
          code: 'ECONNREFUSED',
        }),
        'UPSTREAM_UNAVAILABLE',
      ],
    ] as const) {
      expect(
        createSecureToolErrorResult(error).structuredContent
      ).toMatchObject({ error: { code } });
    }
  });

  it('redacts credentials and retains actionable guidance and correlation references', () => {
    const result = createSecureToolErrorResult(
      Object.assign(
        new Error(
          'Denied token=secret-test-token-value-abcdefghijklmnopqrstuvwxyz user@example.com /home/private/file.ts'
        ),
        { status: 403 }
      ),
      { correlationId: 'contract-reference' }
    );
    const wire = JSON.stringify(result);
    expect(wire).not.toContain('secret-test-token-value');
    expect(wire).not.toContain('user@example.com');
    expect(wire).not.toContain('/home/private');
    expect(result.structuredContent?.error).toMatchObject({
      code: 'PERMISSION_DENIED',
      retryable: false,
      message: expect.stringContaining('Reference ID: contract-reference'),
    });
  });

  it('marks uncertain write failures non-retryable and tells callers to read back', () => {
    const result = createSecureToolErrorResult(
      Object.assign(new Error('Upstream timeout'), { status: 503 }),
      { uncertainMutation: true }
    );
    expect(result.structuredContent?.error).toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      retryable: false,
      message: expect.stringContaining('Read back'),
    });
    expect(
      createSecureToolErrorResult(new ResultEncodingError()).structuredContent
        ?.error
    ).toMatchObject({ code: 'RESULT_ENCODING_FAILED', retryable: false });
  });
});
