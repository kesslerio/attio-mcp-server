/**
 * U5 composition fixture (KTD6/F1): a minimal SDK client reads
 * structuredContent, collects two pages through sealed continuation, fetches
 * details, and branches on a denied call without parsing prose. The server
 * still executes individual calls; the fixture only composes their results.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { registerToolHandlers } from '@/handlers/tools/index.js';
import { searchRecordsConfig } from '@/handlers/tool-configs/universal/core/search-operations.js';
import { getRecordDetailsConfig } from '@/handlers/tool-configs/universal/core/record-details-operations.js';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { StrategyFactory } from '@/services/search/StrategyFactory.js';
import { clearAllCaches } from '@/api/client-cache.js';
import { rotateCursorServerKey } from '@/handlers/tools/result-cursor.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/index.js';

// Keep one module graph between the registered server handlers and the
// configs this fixture spies on.
vi.hoisted(() => vi.resetModules());
vi.unmock('@/objects/companies/index.js');
vi.unmock('@/objects/people/index.js');
vi.unmock('@/objects/people-write.js');
vi.unmock('@/objects/people/search.js');

describe('codemode composition with safe continuation', () => {
  let client: Client;
  let server: Server;
  let tools: Tool[];

  beforeEach(async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
    vi.stubEnv('MCP_TEXT_RESULTS', 'false');
    vi.stubEnv('ATTIO_API_KEY', 'composition-tenant-key');
    vi.stubEnv('ATTIO_ACCESS_TOKEN', '');
    rotateCursorServerKey();
    server = new Server(
      { name: 'composition', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(server);
    client = new Client({ name: 'composer', version: '1' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    for (const transport of [clientTransport, serverTransport]) {
      const send = transport.send.bind(transport);
      vi.spyOn(transport, 'send').mockImplementation((message, options) =>
        send(JSON.parse(JSON.stringify(message)), options)
      );
    }
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    tools = (await client.listTools()).tools;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    clearAllCaches();
    StrategyFactory.clearStrategies();
    rotateCursorServerKey();
  });

  function validatorFor(name: string) {
    const tool = tools.find((item) => item.name === name)!;
    expect(tool.outputSchema).toBeDefined();
    return new AjvJsonSchemaValidator().getValidator(tool.outputSchema!);
  }

  async function call(
    name: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    return client.callTool({ name, arguments: args });
  }

  it('collects two pages via sealed cursors and composes structured data without parsing prose', async () => {
    const pageOne = [
      CompanyMockFactory.create({ name: 'Page One A' }),
      CompanyMockFactory.create({ name: 'Page One B' }),
    ];
    const pageTwo = [CompanyMockFactory.create({ name: 'Page Two A' })];
    // Offset-backed seam: page one fetches 2+1 (lookahead proves more).
    const searchPage = vi
      .spyOn(UniversalSearchService, 'searchRecords')
      .mockResolvedValueOnce([...pageOne, pageTwo[0]])
      .mockResolvedValueOnce(pageTwo);
    const searchValidator = validatorFor('search_records');

    const first = await call('search_records', {
      resource_type: 'companies',
      limit: 2,
    });
    expect(first.isError).toBe(false);
    expect(searchPage).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3, offset: 0 }), undefined
    );
    expect(first.structuredContent).toMatchObject({
      count: 2,
      data: [{ id: pageOne[0].id }, { id: pageOne[1].id }],
    });
    expect(searchValidator(first.structuredContent).valid).toBe(true);
    const token = first.structuredContent!.next_cursor as string;
    expect(token).toMatch(/^1[A-Za-z0-9_-]{20,}$/);
    expect(JSON.parse(first.content[0].text as string)).toEqual(
      first.structuredContent
    );

    // Compose: the sealed token from page one drives page two.
    const second = await call('search_records', {
      resource_type: 'companies',
      limit: 2,
      cursor: token,
    });
    expect(second.isError).toBe(false);
    expect(searchPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        limit: 3,
        offset: 2,
        cursor: expect.anything(),
      }), undefined
    );
    expect(second.structuredContent).toMatchObject({
      count: 1,
      data: [{ id: pageTwo[0].id }],
      next_cursor: null,
    });
    expect(searchValidator(second.structuredContent).valid).toBe(true);

    // Compose: identifiers from page two feed a details call.
    const detailsValidator = validatorFor('get_record_details');
    const detailTarget = pageTwo[0];
    const detailsConfig = getRecordDetailsConfig as unknown as {
      handler: ReturnType<typeof vi.fn>;
    };
    vi.spyOn(detailsConfig, 'handler').mockResolvedValueOnce(detailTarget);
    const details = await call('get_record_details', {
      resource_type: 'companies',
      record_id: (detailTarget.id as { record_id: string }).record_id,
    });
    expect(details.isError).toBe(false);
    expect(detailsValidator(details.structuredContent).valid).toBe(true);
    expect(details.structuredContent).toMatchObject({
      data: { id: detailTarget.id },
    });
  });

  it('rejects stale cursors offline with INVALID_CURSOR before any Attio request', async () => {
    const searchPage = vi
      .spyOn(UniversalSearchService, 'searchRecords')
      .mockResolvedValue([
        CompanyMockFactory.create(),
        CompanyMockFactory.create(),
        CompanyMockFactory.create(),
      ]);
    const first = await call('search_records', {
      resource_type: 'companies',
      limit: 2,
    });
    expect(first.isError).toBe(false);
    const token = first.structuredContent!.next_cursor as string;
    expect(token).toBeTruthy();

    // Tamper: flip a payload byte; verification fails before any API call.
    const raw = Buffer.from(token.slice(1), 'base64url');
    raw[raw.length - 1] ^= 0xff;
    const tampered = `1${raw.toString('base64url')}`;
    searchPage.mockClear();
    const denied = await call('search_records', {
      resource_type: 'companies',
      limit: 2,
      cursor: tampered,
    });
    expect(denied.isError).toBe(true);
    expect(denied.structuredContent).toMatchObject({
      error: { code: 'INVALID_CURSOR', retryable: false },
    });
    expect(searchPage).not.toHaveBeenCalled();
    expect(JSON.stringify(denied.structuredContent)).not.toContain(
      'composition-tenant-key'
    );
  });

  it('rejects a cursor replayed for a changed query and branches on denied calls', async () => {
    vi.spyOn(UniversalSearchService, 'searchRecords').mockResolvedValue([
      CompanyMockFactory.create(),
      CompanyMockFactory.create(),
      CompanyMockFactory.create(),
    ]);
    const first = await call('search_records', {
      resource_type: 'companies',
      limit: 2,
    });
    const token = first.structuredContent!.next_cursor as string;

    // Same token, different filter shape: invalid before any request.
    const mismatched = await call('search_records', {
      resource_type: 'people',
      limit: 2,
      cursor: token,
    });
    expect(mismatched.isError).toBe(true);
    expect(mismatched.structuredContent).toMatchObject({
      error: { code: 'INVALID_CURSOR' },
    });

    // Cursor + offset is rejected before any request.
    const both = await call('search_records', {
      resource_type: 'companies',
      limit: 2,
      cursor: token,
      offset: 4,
    });
    expect(both.isError).toBe(true);
    expect(both.structuredContent).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('reads bounded finite disclosures on member and metadata families', async () => {
    const membersConfig =
      (await import('@/handlers/tool-configs/workspace-members.js')) as unknown as {
        workspaceMembersToolConfigs: Record<
          string,
          { handler: (args?: unknown) => Promise<unknown> }
        >;
      };
    const mockMember = {
      id: { workspace_member_id: '11111111-2222-4333-8444-555555555555' },
      first_name: 'Alex',
      last_name: 'Member',
      email_address: 'alex.member@example.com',
      access_level: 'member',
    };
    vi.spyOn(
      membersConfig.workspaceMembersToolConfigs.listWorkspaceMembers,
      'handler'
    ).mockResolvedValueOnce([mockMember]);
    const memberValidator = validatorFor('list-workspace-members');
    const members = await call('list-workspace-members', {});
    expect(members.isError).toBe(false);
    expect(memberValidator(members.structuredContent).valid).toBe(true);
    expect(members.structuredContent).toMatchObject({
      count: 1,
      next_cursor: null,
      pagination: { supported: false, truncated: false },
    });

    const metadataConfig =
      (await import('@/handlers/tool-configs/universal/core/metadata-operations.js')) as unknown as {
        getAttributesConfig: { handler: (args: unknown) => Promise<unknown> };
      };
    vi.spyOn(
      metadataConfig.getAttributesConfig,
      'handler'
    ).mockResolvedValueOnce([]);
    const attrs = await call('get_record_attributes', {
      resource_type: 'companies',
    });
    expect(attrs.isError).toBe(false);
    expect(attrs.structuredContent).toMatchObject({
      data: [],
      pagination: { supported: false, truncated: false },
    });
  });
});
