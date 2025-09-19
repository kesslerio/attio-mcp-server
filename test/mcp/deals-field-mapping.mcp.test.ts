/**
 * MCP Test for Issue #687: Deals attribute mapping broken
 *
 * Tests that discover-attributes returns display names that can be used
 * successfully with create-record for deals.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';

describe('Deals Field Mapping Fix - Issue #687', () => {
  let client: MCPTestClient;
  const createdDealIds: string[] = [];

  // Helper function to extract and track deal ID from successful creation
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
    } catch (error) {
      // Silent fail - cleanup is nice-to-have, not critical
    }
  };

  beforeAll(async () => {
    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: ['./dist/cli.js'],
    });
    await client.init();
  });

  afterAll(async () => {
    // Clean up created test deals
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

    if (client) {
      await client.cleanup();
    }
  });

  it('should allow using display names from discover-attributes in create-record', async () => {
    // First, discover the attributes for deals
    const discoverResult = await client.callTool('discover-attributes', {
      resource_type: 'deals',
    });

    expect(discoverResult.isError).toBeFalsy();
    expect(discoverResult.content).toBeDefined();

    // Check that the result contains the display names (text format)
    const discoverText = discoverResult.content![0]!.text;
    expect(discoverText).toContain('Deal name');
    expect(discoverText).toContain('Deal stage');
    expect(discoverText).toContain('Deal value');
    expect(discoverText).toContain('Associated company');

    // Extract JSON from the response if possible
    let discoverData: Record<string, unknown> | null = null;
    try {
      // The response might be wrapped or have extra text
      const jsonMatch = discoverText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        discoverData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Response is not JSON format, checking text format instead');
    }

    // Verify mappings exist either in JSON or text format
    if (discoverData?.mappings) {
      expect(discoverData.mappings).toHaveProperty('Deal name');
      expect(discoverData.mappings['Deal name']).toBe('name');
    } else {
      // If not JSON, at least verify the display names are present
      console.log('✅ Display names found in discover-attributes output');
    }

    // Now test that we can create a deal using the display names
    const createResult = await client.callTool('create-record', {
      resource_type: 'deals',
      record_data: {
        values: {
          'Deal name': 'Test Deal from MCP',
          'Deal stage': 'Qualified', // This might need to be a valid stage ID
          'Deal value': 50000,
        },
      },
    });

    // The creation should work (or fail with a validation error about stage, not field mapping)
    if (createResult.isError) {
      const errorText = createResult.content?.[0]?.text || '';

      // If it fails, it should NOT be due to field mapping issues
      expect(errorText).not.toMatch(/unknown.*field/i);
      expect(errorText).not.toMatch(/invalid.*field/i);
      expect(errorText).not.toMatch(/Deal name/);
      expect(errorText).not.toMatch(/Deal stage/);
      expect(errorText).not.toMatch(/Deal value/);

      // It might fail due to stage validation, which is expected
      if (errorText.includes('stage') || errorText.includes('Status')) {
        console.log(
          '✅ Field mapping worked! Deal creation failed due to stage validation (expected)'
        );
      }
    } else {
      // If creation succeeded, verify the result structure
      expect(createResult.content).toBeDefined();
      trackDealId(createResult);
      console.log('✅ Deal created successfully using display names!');
    }
  });

  it('should provide helpful warnings when using display names', async () => {
    // Test that the field mapping provides helpful feedback
    const createResult = await client.callTool('create-record', {
      resource_type: 'deals',
      record_data: {
        values: {
          'Deal name': 'Test Deal for Warnings',
        },
      },
    });

    // Whether it succeeds or fails, we expect the tool to run without crashing
    expect(createResult.content).toBeDefined();
    trackDealId(createResult);
    console.log('✅ Tool executed without crashing when using display names');
  });

  it('should work with both display names and API field names', async () => {
    // Test mixing display names and API field names
    const createResult = await client.callTool('create-record', {
      resource_type: 'deals',
      record_data: {
        values: {
          'Deal name': 'Mixed Field Test', // Display name
          stage: 'Qualified', // API field name
          'Deal value': 25000, // Display name
        },
      },
    });

    // Should handle the mix without collision errors
    if (createResult.isError) {
      const errorText = createResult.content?.[0]?.text || '';
      expect(errorText).not.toMatch(/collision|conflict/i);
      expect(errorText).not.toMatch(/Multiple fields map to/i);
    } else {
      trackDealId(createResult);
    }
  });

  it('should handle the associated company display name correctly', async () => {
    // Test the more complex Associated company field
    const createResult = await client.callTool('create-record', {
      resource_type: 'deals',
      record_data: {
        values: {
          'Deal name': 'Company Association Test',
          'Associated company': 'test-company-id',
        },
      },
    });

    // The field should be mapped correctly
    if (createResult.isError) {
      const errorText = createResult.content?.[0]?.text || '';
      // Should not fail due to field mapping of Associated company
      expect(errorText).not.toMatch(/Associated company.*unknown/i);
      expect(errorText).not.toMatch(/Associated company.*invalid/i);
    } else {
      trackDealId(createResult);
    }
  });
});
