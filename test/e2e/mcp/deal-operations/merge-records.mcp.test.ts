import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const HAS_API_KEY = Boolean(process.env.ATTIO_API_KEY);
const STAGE_STATUS_ENDPOINT =
  'https://api.attio.com/v2/objects/deals/attributes/stage/statuses';

type McpResult = {
  isError?: boolean;
  content?: Array<{ text?: string }>;
};

type ToolArguments = Record<string, unknown>;

class LiveMcpTestClient {
  private readonly client: Client;

  constructor(apiKey: string) {
    this.client = new Client(
      { name: 'safe-deal-merge-e2e', version: '1.0.0' },
      { capabilities: {} }
    );

    this.transport = new StdioClientTransport({
      command: 'node',
      args: ['./dist/cli.js'],
      env: { ATTIO_API_KEY: apiKey },
    });
  }

  private readonly transport: StdioClientTransport;

  async init(): Promise<void> {
    await this.client.connect(this.transport);
  }

  async callTool(
    toolName: string,
    args: ToolArguments
  ): Promise<CallToolResult> {
    return this.client.callTool({ name: toolName, arguments: args });
  }

  async cleanup(): Promise<void> {
    await this.client.close();
  }
}

async function resolveStageUuid(): Promise<string> {
  const response = await fetch(STAGE_STATUS_ENDPOINT, {
    headers: { Authorization: `Bearer ${process.env.ATTIO_API_KEY}` },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch an active deal stage (${response.status})`
    );
  }

  const json = (await response.json()) as {
    data?: Array<{ id?: { status_id?: string }; is_archived?: boolean }>;
  };
  const active = json.data?.find(
    (status) => status.id?.status_id && !status.is_archived
  );
  if (!active?.id?.status_id) {
    throw new Error('No active deal stage status was found');
  }
  return active.id.status_id;
}

function resultText(result: unknown): string {
  const typed = result as McpResult;
  return (typed.content || []).map((content) => content.text || '').join('\n');
}

function extractUuid(result: unknown): string | null {
  const contents = (result as { content?: Array<{ text?: string }> }).content;
  for (const content of contents || []) {
    if (!content.text) continue;
    try {
      const parsed = JSON.parse(content.text) as {
        id?: { record_id?: unknown };
      };
      const parsedRecordId = parsed.id?.record_id;
      if (
        typeof parsedRecordId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          parsedRecordId
        )
      ) {
        return parsedRecordId;
      }
    } catch {
      // Try the next content block or the human-readable formatter below.
    }
  }

  const structuredContent = (
    result as {
      structuredContent?: { id?: { record_id?: unknown } };
    }
  ).structuredContent;
  const structuredRecordId = structuredContent?.id?.record_id;
  if (
    typeof structuredRecordId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      structuredRecordId
    )
  ) {
    return structuredRecordId;
  }

  const recordIdMatch = resultText(result).match(
    /(?:record_id|new_record_id|ID)"?\s*[:=]\s*"?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return recordIdMatch?.[1] || null;
}

function extractFingerprint(result: unknown): string | null {
  const structuredFingerprint = (
    result as { structuredContent?: { plan?: { fingerprint?: unknown } } }
  ).structuredContent?.plan?.fingerprint;
  if (typeof structuredFingerprint === 'string' && structuredFingerprint) {
    return structuredFingerprint;
  }

  const match = resultText(result).match(/^Plan fingerprint: (.+)$/m);
  return match?.[1]?.trim() || null;
}

describe('merge_records MCP e2e', () => {
  let client: LiveMcpTestClient | null = null;
  let stageUuid: string | null = null;
  const createdDealIds: string[] = [];

  beforeAll(async () => {
    if (!HAS_API_KEY) return;
    stageUuid = await resolveStageUuid();
    client = new LiveMcpTestClient(process.env.ATTIO_API_KEY as string);
    await client.init();
  });

  afterAll(async () => {
    if (!client) return;
    for (const recordId of createdDealIds) {
      try {
        await client.callTool('delete_record', {
          resource_type: 'deals',
          record_id: recordId,
        });
      } catch {
        // Native merge makes the original ids unreadable; cleanup is best effort.
      }
    }
    await client.cleanup();
  });

  async function createDeal(label: string): Promise<string> {
    if (!client || !stageUuid) throw new Error('MCP e2e client is not ready');
    const result = await client.callTool('create_record', {
      resource_type: 'deals',
      record_data: {
        values: {
          name: `SAFE_MERGE_E2E_${label}_${Date.now()}`,
          stage: stageUuid,
          value: 1000,
          ...(process.env.ATTIO_DEFAULT_DEAL_OWNER
            ? { owner: process.env.ATTIO_DEFAULT_DEAL_OWNER }
            : {}),
        },
      },
    });
    expect((result as McpResult).isError).toBeFalsy();
    const recordId = extractUuid(result);
    if (!recordId) throw new Error('create_record did not return a deal id');
    createdDealIds.push(recordId);
    return recordId;
  }

  const keyedTest = HAS_API_KEY ? it : it.skip;

  keyedTest(
    'defaults to a non-mutating dry-run field plan',
    { timeout: 120000 },
    async () => {
      if (!client) throw new Error('MCP e2e client is not ready');
      const primaryId = await createDeal('DRY_PRIMARY');
      const leftoverId = await createDeal('DRY_LEFTOVER');
      expect(leftoverId).not.toBe(primaryId);

      const result = await client.callTool('merge_records', {
        resource_type: 'deals',
        record_id: primaryId,
        secondary_record_id: leftoverId,
      });

      expect((result as McpResult).isError).toBeFalsy();
      expect(resultText(result).toLowerCase()).toContain('dry-run');

      const primaryRead = await client.callTool('get_record_details', {
        resource_type: 'deals',
        record_id: primaryId,
      });
      const leftoverRead = await client.callTool('get_record_details', {
        resource_type: 'deals',
        record_id: leftoverId,
      });
      expect((primaryRead as McpResult).isError).toBeFalsy();
      expect((leftoverRead as McpResult).isError).toBeFalsy();
    }
  );

  keyedTest(
    'executes only with confirm and returns the native survivor id without polling 202',
    { timeout: 120000 },
    async () => {
      if (!client) throw new Error('MCP e2e client is not ready');
      const primaryId = await createDeal('EXEC_PRIMARY');
      const leftoverId = await createDeal('EXEC_LEFTOVER');
      expect(leftoverId).not.toBe(primaryId);

      const preview = await client.callTool('merge_records', {
        resource_type: 'deals',
        record_id: primaryId,
        secondary_record_id: leftoverId,
      });
      expect((preview as McpResult).isError).toBeFalsy();
      const planFingerprint = extractFingerprint(preview);
      expect(planFingerprint).toBeTruthy();

      const result = await client.callTool('merge_records', {
        resource_type: 'deals',
        record_id: primaryId,
        secondary_record_id: leftoverId,
        dry_run: false,
        confirm: true,
        plan_fingerprint: planFingerprint,
      });

      expect((result as McpResult).isError).toBeFalsy();
      const text = resultText(result);
      expect(text).toMatch(/New record ID:/i);
      const newRecordId = extractUuid(result);
      if (newRecordId) createdDealIds.push(newRecordId);
    }
  );
});
