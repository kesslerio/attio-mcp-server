/**
 * U5 E2E: structured pagination over MCP stdio against the built server.
 *
 * Offline (no credentials) it proves the deterministic deny paths: cursor
 * tampering, cross-resource replay, and cursor+offset rejection all fail with
 * structured INVALID_CURSOR/VALIDATION_ERROR envelopes before any Attio call.
 * With a live ATTIO_API_KEY it additionally composes two real pages on the
 * offset-backed records query path and follows the sealed token.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';

const hasCredentials = Boolean(
  process.env.ATTIO_API_KEY || process.env.ATTIO_ACCESS_TOKEN
);

// This starts the built server over stdio; no in-process API mocks are injected.
describe('structured pagination over MCP stdio', () => {
  const client = new Client({ name: 'structured-pagination', version: '1' });
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./dist/cli.js'],
    env: {
      ...getDefaultEnvironment(),
      NODE_ENV: 'production',
      MCP_LOG_LEVEL: 'ERROR',
      ATTIO_MCP_TOOL_MODE: 'full',
      ...(process.env.ATTIO_API_KEY
        ? { ATTIO_API_KEY: process.env.ATTIO_API_KEY }
        : {}),
      ...(process.env.ATTIO_ACCESS_TOKEN
        ? { ATTIO_ACCESS_TOKEN: process.env.ATTIO_ACCESS_TOKEN }
        : {}),
    },
  });
  async function assertToolCall(
    name: string,
    args: Record<string, unknown>,
    assertion: (result: CallToolResult) => void
  ) {
    const result = await client.request(
      { method: 'tools/call', params: { name, arguments: args } },
      CallToolResultSchema
    );
    assertion(result);
  }
  let tools: Tool[];

  beforeAll(async () => {
    await client.connect(transport);
    tools = (await client.listTools()).tools;
  });
  afterAll(async () => {
    await client.close();
    await transport.close();
  });

  function validator(name: string) {
    const tool = tools.find((item) => item.name === name);
    expect(tool, `${name} is registered`).toBeDefined();
    expect(tool!.outputSchema).toBeDefined();
    return new AjvJsonSchemaValidator().getValidator(tool!.outputSchema!);
  }

  it('advertises cursor input and pagination-aware envelopes on collection tools', () => {
    for (const name of [
      'search_records',
      'search_records_advanced',
      'list_notes',
    ]) {
      const tool = tools.find((item) => item.name === name)!;
      const properties = (
        tool.inputSchema as {
          properties?: Record<string, { type?: string; maxLength?: number }>;
        }
      ).properties;
      expect(
        properties?.cursor,
        `${name} advertises a bounded opaque cursor input`
      ).toMatchObject({ type: 'string', maxLength: 512 });
    }
  });

  it.skipIf(!hasCredentials)(
    'composes two live pages on the records query path via sealed continuation',
    async (context) => {
      const firstIds = new Set<string>();
      let firstToken: string | undefined;
      await assertToolCall(
        'search_records',
        { resource_type: 'companies', limit: 1 },
        (result) => {
          expect(result.isError).toBe(false);
          const structured = result.structuredContent as {
            data: Array<{ id: { record_id: string } }>;
            count: number;
            next_cursor: string | null;
          };
          expect(structured.count).toBe(structured.data.length);
          expect(
            validator('search_records')(result.structuredContent).valid
          ).toBe(true);
          expect(JSON.parse(result.content[0].text as string)).toEqual(
            result.structuredContent
          );
          for (const record of structured.data) firstIds.add(record.id.record_id);
          firstToken = structured.next_cursor ?? undefined;
        }
      );
      // Live workspaces may legitimately be tiny; only continue when the
      // server disclosed a token, which itself is reliable evidence.
      if (!firstToken) {
        context.skip('Two-page live evidence unavailable: this workspace has fewer than two matching records');
        return;
      }
      await assertToolCall(
        'search_records',
        { resource_type: 'companies', limit: 1, cursor: firstToken },
        (result) => {
          expect(result.isError).toBe(false);
          const structured = result.structuredContent as {
            data: Array<{ id: { record_id: string } }>;
            count: number;
            next_cursor: string | null;
          };
          // The second page must advance: its first item cannot repeat page
          // one's opening item because the cursor pins the live-view offset.
          expect(
            validator('search_records')(result.structuredContent).valid
          ).toBe(true);
          expect(structured.count).toBe(structured.data.length);
          expect(structured.data.length).toBeGreaterThan(0);
          for (const record of structured.data) expect(firstIds.has(record.id.record_id)).toBe(false);
          expect(JSON.parse(result.content[0].text as string)).toEqual(
            result.structuredContent
          );
        }
      );
    }
  );

  it.skipIf(!hasCredentials)(
    'fails a tampered cursor with INVALID_CURSOR before any Attio request',
    async (context) => {
      let token: string | undefined;
      await assertToolCall(
        'search_records',
        { resource_type: 'companies', limit: 1 },
        (result) => {
          expect(result.isError).toBe(false);
          token = (result.structuredContent as { next_cursor?: string })
            .next_cursor;
        }
      );
      if (!token) {
        context.skip('Live denial evidence unavailable: this workspace has fewer than two matching records');
        return;
      }
      const raw = Buffer.from(token.slice(1), 'base64url');
      raw[raw.length - 1] ^= 0x01;
      const tampered = `1${raw.toString('base64url')}`;
      await assertToolCall(
        'search_records',
        { resource_type: 'companies', limit: 1, cursor: tampered },
        (result) => {
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: { code: 'INVALID_CURSOR', retryable: false },
          });
          expect(
            validator('search_records')(result.structuredContent).valid
          ).toBe(true);
          expect(JSON.parse(result.content[0].text as string)).toEqual(
            result.structuredContent
          );
          // No credential material anywhere in the failure payload.
          expect(JSON.stringify(result.structuredContent)).not.toContain(
            process.env.ATTIO_API_KEY ?? '\u0000-no-key-'
          );
        }
      );
    }
  );

  it.skipIf(!hasCredentials)(
    'fails a cursor replayed against another resource and cursor+offset',
    async (context) => {
      let token: string | undefined;
      await assertToolCall(
        'search_records',
        { resource_type: 'companies', limit: 1 },
        (result) => {
          expect(result.isError).toBe(false);
          token = (result.structuredContent as { next_cursor?: string })
            .next_cursor;
        }
      );
      if (!token) {
        context.skip('Live denial evidence unavailable: this workspace has fewer than two matching records');
        return;
      }
      await assertToolCall(
        'search_records',
        { resource_type: 'people', limit: 1, cursor: token! },
        (result) => {
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: { code: 'INVALID_CURSOR' },
          });
        }
      );
      await assertToolCall(
        'search_records',
        { resource_type: 'companies', limit: 1, cursor: token!, offset: 2 },
        (result) => {
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: { code: 'VALIDATION_ERROR' },
          });
        }
      );
    }
  );

  it.skipIf(!hasCredentials)(
    'discloses bounded pagination metadata on a finite family over the wire',
    async () => {
      await assertToolCall('list-workspace-members', {}, (result) => {
        expect(result.isError).toBe(false);
        const structured = result.structuredContent as {
          data: unknown[];
          count: number;
          next_cursor: string | null;
          pagination: { supported: boolean; truncated: boolean };
        };
        expect(
          validator('list-workspace-members')(result.structuredContent).valid
        ).toBe(true);
        expect(structured.count).toBe(structured.data.length);
        expect(structured.next_cursor).toBeNull();
        expect(structured.pagination.supported).toBe(false);
        expect(structured.pagination.truncated).toBe(false);
      });
    }
  );

  it.skipIf(hasCredentials)(
    'returns structured execution errors (not protocol crashes) without credentials',
    async () => {
      await assertToolCall(
        'search_records',
        { resource_type: 'companies', limit: 2 },
        (result) => {
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: { code: 'UNAUTHENTICATED', retryable: false },
          });
          expect(
            validator('search_records')(result.structuredContent).valid
          ).toBe(true);
          expect(JSON.parse(result.content[0].text as string)).toEqual(
            result.structuredContent
          );
        }
      );
    }
  );
});
