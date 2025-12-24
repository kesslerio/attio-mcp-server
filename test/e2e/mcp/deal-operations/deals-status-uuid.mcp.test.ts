/**
 * MCP Test for Issue #986: Status transformer should pass UUID strings through
 *
 * Verifies create-record accepts a status UUID string (stage) without attempting
 * title lookup or fallback.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';

const HAS_API_KEY = !!process.env.ATTIO_API_KEY;
const STAGE_STATUS_ENDPOINT =
  'https://api.attio.com/v2/objects/deals/attributes/stage/statuses';

async function resolveStageUuid(): Promise<string> {
  if (process.env.ATTIO_STAGE_UUID) {
    return process.env.ATTIO_STAGE_UUID;
  }

  if (!process.env.ATTIO_API_KEY) {
    throw new Error('ATTIO_API_KEY is required to resolve stage UUID');
  }

  const response = await fetch(STAGE_STATUS_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${process.env.ATTIO_API_KEY}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch deal stages (${response.status}): ${body || 'no body'}`
    );
  }

  const json = (await response.json()) as {
    data?: Array<{
      id?: { status_id?: string };
      is_archived?: boolean;
    }>;
  };

  const candidates = json.data || [];
  const active = candidates.find(
    (opt) => opt.id?.status_id && !opt.is_archived
  );
  const first = candidates.find((opt) => opt.id?.status_id);

  const statusId = active?.id?.status_id || first?.id?.status_id;
  if (!statusId) {
    throw new Error('No deal stage status_id found in workspace');
  }

  return statusId;
}

describe('Deal status UUID passthrough - Issue #986', () => {
  let client: MCPTestClient | null = null;
  const createdDealIds: string[] = [];
  let stageUuid: string | null = null;

  const trackDealId = (createResult: any): void => {
    try {
      if (!createResult.isError && createResult.content?.[0]?.text) {
        const text = createResult.content[0].text;
        const idMatch = text.match(/ID:\s*([a-f0-9-]+)/i);
        if (idMatch && idMatch[1]) {
          createdDealIds.push(idMatch[1]);
          console.log(`📝 Tracking deal ID for cleanup: ${idMatch[1]}`);
        }
      }
    } catch {
      // Cleanup helper best effort only
    }
  };

  beforeAll(async () => {
    if (!HAS_API_KEY) {
      console.warn('Skipping MCP status UUID test: ATTIO_API_KEY not set.');
      return;
    }

    stageUuid = await resolveStageUuid();

    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: ['./dist/cli.js'],
    });
    await client.init();
  });

  afterAll(async () => {
    if (!client) return;

    for (const dealId of createdDealIds) {
      try {
        await client.callTool('delete_record', {
          resource_type: 'deals',
          record_id: dealId,
        });
      } catch (error) {
        console.log(`Failed to cleanup deal ${dealId}:`, error);
      }
    }

    await client.cleanup();
  });

  const testCase = HAS_API_KEY ? it : it.skip;

  testCase(
    'creates a deal when stage is provided as UUID string',
    { timeout: 120000 },
    async () => {
      if (!client || !stageUuid) {
        throw new Error('MCP client or stage UUID not initialized');
      }

      const createResult = await client.callTool('create_record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: `UUID Stage Deal ${Date.now()}`,
            stage: stageUuid,
          },
        },
      });

      expect(createResult.content).toBeDefined();
      expect(createResult.isError).toBeFalsy();

      const text = createResult.content?.[0]?.text || '';
      // Should not fall back to title lookup path complaining about valid options
      expect(text.toLowerCase()).not.toContain('valid options');

      trackDealId(createResult);
    }
  );
});
