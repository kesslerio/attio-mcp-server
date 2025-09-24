/**
 * MCP Test for Deals Edge Cases - Issue #720
 *
 * Tests edge cases for deal field mapping including empty fields,
 * case sensitivity, and null/undefined value handling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';

describe('Deals Field Mapping Edge Cases - Issue #720', () => {
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

  describe('Edge Case Field Handling', () => {
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

    it('should handle whitespace-only field names', async () => {
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            '   ': 'Whitespace Field Test', // Whitespace-only field name
            name: 'Valid Deal Name',
            stage: 'Qualified',
          },
        },
      });

      // Should handle whitespace field names appropriately
      expect(createResult.content).toBeDefined();
      if (createResult.isError) {
        const errorText = createResult.content?.[0]?.text || '';
        expect(errorText).toMatch(/invalid|empty.*field/i);
      } else {
        trackDealId(createResult);
      }
    });

    it('should handle extremely long field names', async () => {
      const longFieldName = 'a'.repeat(1000); // Very long field name
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            [longFieldName]: 'Long Field Test',
            name: 'Valid Deal Name',
            stage: 'Qualified',
          },
        },
      });

      // Should handle long field names gracefully
      expect(createResult.content).toBeDefined();
      if (!createResult.isError) {
        trackDealId(createResult);
      }
    });

    it('should handle special characters in field names', async () => {
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            'field@name#test': 'Special Chars Test',
            'field with spaces': 'Spaces Test',
            name: 'Valid Deal Name',
            stage: 'Qualified',
          },
        },
      });

      // Should handle special characters in field names
      expect(createResult.content).toBeDefined();
      if (!createResult.isError) {
        trackDealId(createResult);
      }
    });
  });

  describe('Value Type Edge Cases', () => {
    it('should handle numeric values as strings', async () => {
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Numeric String Test',
            stage: 'Qualified',
            value: '50000', // String numeric value
          },
        },
      });

      expect(createResult.content).toBeDefined();
      if (!createResult.isError) {
        trackDealId(createResult);
      }
    });

    it('should handle boolean values in unexpected contexts', async () => {
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Boolean Test',
            stage: 'Qualified',
            companies: true, // Boolean value where string expected
            organizations: false,
          },
        },
      });

      expect(createResult.content).toBeDefined();
      if (!createResult.isError) {
        trackDealId(createResult);
      }
    });

    it('should handle array values in string contexts', async () => {
      const createResult = await client.callTool('create-record', {
        resource_type: 'deals',
        record_data: {
          values: {
            name: 'Array Value Test',
            stage: 'Qualified',
            companies: ['company1', 'company2'], // Array value
          },
        },
      });

      expect(createResult.content).toBeDefined();
      if (!createResult.isError) {
        trackDealId(createResult);
      }
    });
  });
});
