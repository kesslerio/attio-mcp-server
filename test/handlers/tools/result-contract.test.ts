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
    'preserves prose and machine output under text setting %s until the opt-out delivery',
    (setting) => {
      vi.stubEnv('MCP_TEXT_RESULTS', setting);
      const record = CompanyMockFactory.create();
      const formatter = vi.fn(() => 'Company details');
      const result = buildStructuredToolResult(
        { ...getRecordDetailsConfig, formatResult: formatter },
        record,
        { resource_type: 'companies' }
      );
      expect(formatter).toHaveBeenCalledOnce();
      expect(result.content).toHaveLength(3);
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
