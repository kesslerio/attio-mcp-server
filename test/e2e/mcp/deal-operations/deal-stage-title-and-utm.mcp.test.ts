/**
 * Regression test for Issue #1043
 *
 * Ensures `create_record` for deals:
 * - accepts a human-readable stage title (no `status_id` payload shape)
 * - does not reject UTM fields that exist in the workspace schema
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';

const HAS_API_KEY = !!process.env.ATTIO_API_KEY;

const DEAL_ATTRIBUTES_ENDPOINT =
  'https://api.attio.com/v2/objects/deals/attributes';
const STAGE_STATUS_ENDPOINT =
  'https://api.attio.com/v2/objects/deals/attributes/stage/statuses';

async function fetchJson<T>(url: string): Promise<T> {
  if (!process.env.ATTIO_API_KEY) {
    throw new Error('ATTIO_API_KEY is required');
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.ATTIO_API_KEY}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch ${url} (${response.status}): ${body || 'no body'}`
    );
  }

  return (await response.json()) as T;
}

async function resolveStageTitle(): Promise<string> {
  const json = await fetchJson<{
    data?: Array<{
      title?: string;
      is_archived?: boolean;
    }>;
  }>(STAGE_STATUS_ENDPOINT);

  const candidates = json.data || [];
  const active = candidates.find((opt) => opt.title && !opt.is_archived);
  const first = candidates.find((opt) => opt.title);
  const title = active?.title || first?.title;
  if (!title) {
    throw new Error('No deal stage title found in workspace');
  }
  return title;
}

async function workspaceHasUtmFields(): Promise<boolean> {
  const json = await fetchJson<{
    data?: Array<{
      api_slug?: string;
    }>;
  }>(DEAL_ATTRIBUTES_ENDPOINT);

  const slugs = new Set(
    (json.data || []).map((a) => a.api_slug).filter(Boolean)
  );
  return (
    slugs.has('utm_source') &&
    slugs.has('utm_medium') &&
    slugs.has('utm_campaign')
  );
}

describe('Deal create: stage title + UTM fields - Issue #1043', () => {
  let client: MCPTestClient | null = null;
  const createdDealIds: string[] = [];
  let stageTitle: string | null = null;
  let hasUtm: boolean = false;

  const trackDealId = (createResult: any): void => {
    try {
      if (!createResult.isError && createResult.content?.[0]?.text) {
        const text = createResult.content[0].text;
        const idMatch = text.match(/ID:\\s*([a-f0-9-]+)/i);
        if (idMatch?.[1]) createdDealIds.push(idMatch[1]);
      }
    } catch {
      // Best-effort cleanup only
    }
  };

  beforeAll(async () => {
    if (!HAS_API_KEY) {
      console.warn('Skipping MCP stage + UTM test: ATTIO_API_KEY not set.');
      return;
    }

    stageTitle = await resolveStageTitle();
    hasUtm = await workspaceHasUtmFields();

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
        console.error(`Failed to cleanup deal ${dealId}:`, error);
      }
    }

    await client.cleanup();
  });

  const testCase = HAS_API_KEY ? it : it.skip;

  testCase(
    'creates a deal when stage is provided as a title (and accepts UTM fields when present)',
    { timeout: 120000 },
    async () => {
      if (!client || !stageTitle) {
        throw new Error('MCP client or stage title not initialized');
      }

      const values: Record<string, unknown> = {
        name: `Stage Title Deal ${Date.now()}`,
        stage: stageTitle,
        value: 7499,
      };

      if (hasUtm) {
        values.utm_source = 'email';
        values.utm_medium = 'reactivation';
        values.utm_campaign = `issue_1043_${Date.now()}`;
      }

      const createResult = await client.callTool('create_record', {
        resource_type: 'deals',
        record_data: { values },
      });

      expect(createResult.content).toBeDefined();
      expect(createResult.isError).toBeFalsy();

      const text = createResult.content?.[0]?.text || '';
      // Note: Attio API responses naturally contain 'status_id' in the nested ID structure,
      // so we don't check for its absence. The key is that the request succeeded.
      // Check that we didn't get an error about unknown UTM fields
      expect(text.toLowerCase()).not.toContain('unknown field "utm_source"');

      trackDealId(createResult);
    }
  );
});
