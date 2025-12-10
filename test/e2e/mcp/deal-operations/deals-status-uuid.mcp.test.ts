/**
 * MCP Test for Issue #986: Status transformer should pass UUID strings through
 *
 * Verifies create-record accepts a status UUID string (stage) without attempting
 * title lookup or fallback.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';

const STAGE_UUID = 'f78ef71e-9306-4c37-90d6-e83550326228'; // Known deal stage
const HAS_API_KEY = !!process.env.ATTIO_API_KEY;

describe('Deal status UUID passthrough - Issue #986', () => {
  let client: MCPTestClient | null = null;
  const createdDealIds: string[] = [];

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
        await client.callTool('delete-record', {
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
      if (!client) {
        throw new Error('MCP client not initialized (missing API key)');
      }

      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: `UUID Stage Deal ${Date.now()}`,
            stage: STAGE_UUID,
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
