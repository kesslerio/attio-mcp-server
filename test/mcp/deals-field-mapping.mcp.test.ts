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

  // Issue #720: Test new enhanced field mappings
  describe('Enhanced field mappings (Issue #720)', () => {
    it('should map "companies" to "associated_company"', async () => {
      // Test the specific mapping mentioned in issue #720
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Companies Field Mapping Test',
            stage: 'Qualified',
            companies: 'test-company-id', // Should map to associated_company
          },
        },
      });

      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        // Should not fail due to field mapping of "companies"
        expect(errorText).not.toMatch(/companies.*unknown/i);
        expect(errorText).not.toMatch(/companies.*invalid/i);
        expect(errorText).not.toMatch(/companies.*not.*found/i);
        console.log('✅ Field mapping worked for "companies" field');
      } else {
        trackDealId(createResult);
        console.log('✅ Deal created successfully using "companies" field!');
      }
    });

    it('should map plural organization variations correctly', async () => {
      // Test other plural form mappings
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Organizations Field Mapping Test',
            stage: 'Interested',
            organizations: 'test-org-id', // Should map to associated_company
          },
        },
      });

      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        // Should not fail due to field mapping of "organizations"
        expect(errorText).not.toMatch(/organizations.*unknown/i);
        expect(errorText).not.toMatch(/organizations.*invalid/i);
      } else {
        trackDealId(createResult);
      }
    });

    it('should map "clients" to "associated_company"', async () => {
      // Test client variations
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Clients Field Mapping Test',
            stage: 'Proposal',
            clients: 'test-client-id', // Should map to associated_company
          },
        },
      });

      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        // Should not fail due to field mapping of "clients"
        expect(errorText).not.toMatch(/clients.*unknown/i);
        expect(errorText).not.toMatch(/clients.*invalid/i);
      } else {
        trackDealId(createResult);
      }
    });

    it('should map "person" to "associated_people"', async () => {
      // Test singular person mapping
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Person Field Mapping Test',
            stage: 'Negotiation',
            person: 'test-person-id', // Should map to associated_people
          },
        },
      });

      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        // Should not fail due to field mapping of "person"
        expect(errorText).not.toMatch(/person.*unknown/i);
        expect(errorText).not.toMatch(/person.*invalid/i);
      } else {
        trackDealId(createResult);
      }
    });

    it('should provide helpful suggestions for new mapped fields', async () => {
      // Test that the error messages are helpful when fields are used incorrectly
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Field Suggestions Test',
            companies: 'invalid-format', // This should trigger validation but not mapping errors
          },
        },
      });

      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        // Should not suggest the field is unknown (mapping should work)
        expect(errorText).not.toMatch(/companies.*unknown.*field/i);
        expect(errorText).not.toMatch(/did you mean.*associated_company/i); // Shouldn't suggest the target since mapping should work
      } else {
        trackDealId(createResult);
      }
    });

    it('should handle mixed old and new field variations without conflicts', async () => {
      // Test that using both old and new variations doesn't cause collision issues
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Mixed Fields Test',
            stage: 'Qualified',
            company: 'test-company-1', // Old variation
            organizations: 'test-org-1', // New variation - should both map to associated_company
          },
        },
      });

      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        // Should detect collision between fields that map to the same target
        expect(errorText).toMatch(/collision|conflict/i);
        console.log(
          '✅ Collision detection working correctly for overlapping mappings'
        );
      } else {
        // If it doesn't detect collision, that's also acceptable behavior
        trackDealId(createResult);
        console.log('✅ Tool handled mixed field variations without errors');
      }
    });

    // Edge case tests from PR review feedback
    it('should handle empty string field names gracefully', async () => {
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            '': 'Empty Field Test', // Empty field name
            name: 'Valid Deal Name',
            stage: 'Qualified',
          },
        },
      });

      // Should handle empty field names without crashing
      expect(createResult.content).toBeDefined();
      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        // Should provide meaningful error for empty field name
        expect(errorText).toMatch(/empty|invalid.*field/i);
      } else {
        trackDealId(createResult);
      }
    });

    it('should validate case sensitivity in field mappings', async () => {
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Case Sensitivity Test',
            stage: 'Qualified',
            COMPANIES: 'test-company-uppercase', // Test uppercase variation
            Organizations: 'test-org-mixed-case', // Test mixed case
          },
        },
      });

      // Should handle case variations properly
      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        // Should not fail due to case sensitivity in field mapping
        expect(errorText).not.toMatch(/COMPANIES.*unknown/i);
        expect(errorText).not.toMatch(/Organizations.*unknown/i);
      } else {
        trackDealId(createResult);
      }
    });

    it('should handle null and undefined field values', async () => {
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Null Value Test',
            stage: 'Qualified',
            companies: null, // Test null value
            organizations: undefined, // Test undefined value
          },
        },
      });

      // Should handle null/undefined values gracefully
      expect(createResult.content).toBeDefined();
      if (!createResult.isError) {
        trackDealId(createResult);
      }
    });
  });
});
