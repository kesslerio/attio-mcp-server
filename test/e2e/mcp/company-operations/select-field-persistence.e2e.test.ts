/**
 * E2E tests for select field persistence (Issue #1045)
 *
 * Validates that select fields actually persist to Attio API when using
 * ["title"] format (not ["uuid"] format which silently fails).
 *
 * @see Issue #1045
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../../');

describe('Select Field Persistence E2E (Issue #1045)', () => {
  let client: MCPTestClient;
  let testCompanyId: string;

  beforeAll(async () => {
    // Initialize MCP test client with real server
    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: [join(projectRoot, 'dist/cli.js')],
      env: {
        ...process.env,
        E2E_MODE: 'true',
        USE_MOCK_DATA: 'false',
      },
    });

    await client.init();

    // Create a test company for the persistence test
    const createResult = await client.assertToolCall(
      'create_record',
      {
        resource_type: 'companies',
        record_data: {
          name: `Select Persistence Test ${Date.now()}`,
          domains: [`test-${Date.now()}.example.com`],
        },
      },
      (result) => {
        expect(result.isError).toBeFalsy();
        return result;
      }
    );

    // Extract company ID from the result
    const match = createResult.content[0].text.match(
      /record_id[:\s]+([a-f0-9-]+)/i
    );
    expect(match).toBeTruthy();
    testCompanyId = match![1];
  });

  it('should persist select field value using title format', async () => {
    // Update the company's b2b_segment field with a string value
    // The select-transformer should convert this to ["Healthcare / Hospital"] format
    const updateResult = await client.assertToolCall(
      'update_record',
      {
        resource_type: 'companies',
        record_id: testCompanyId,
        record_data: {
          b2b_segment: 'Healthcare / Hospital',
        },
      },
      (result) => {
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('successfully updated');
        return result;
      }
    );

    // Verify the update was successful
    expect(updateResult.content[0].text).toContain(testCompanyId);

    // Wait a moment for Attio to process the update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Retrieve the company details to verify persistence
    const detailsResult = await client.assertToolCall(
      'get_record_details',
      {
        resource_type: 'companies',
        record_id: testCompanyId,
      },
      (result) => {
        expect(result.isError).toBeFalsy();
        return result;
      }
    );

    // Parse the response to check if b2b_segment was persisted
    const responseText = detailsResult.content[0].text;

    // The response should contain the persisted value
    expect(responseText).toContain('b2b_segment');
    expect(responseText).toContain('Healthcare / Hospital');

    // Verify it's not empty (which was the bug symptom)
    expect(responseText).not.toMatch(/b2b_segment.*\[\]/);
  });

  it('should handle case-insensitive select values', async () => {
    // Test that the transformer's case-insensitive matching works with real API
    const updateResult = await client.assertToolCall(
      'update_record',
      {
        resource_type: 'companies',
        record_id: testCompanyId,
        record_data: {
          b2b_segment: 'healthcare / hospital', // lowercase
        },
      },
      (result) => {
        expect(result.isError).toBeFalsy();
        return result;
      }
    );

    expect(updateResult.content[0].text).toContain('successfully updated');

    // Wait for persistence
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the value persisted with proper title case
    const detailsResult = await client.assertToolCall(
      'get_record_details',
      {
        resource_type: 'companies',
        record_id: testCompanyId,
      },
      (result) => {
        expect(result.isError).toBeFalsy();
        return result;
      }
    );

    const responseText = detailsResult.content[0].text;
    expect(responseText).toContain('Healthcare / Hospital');
  });

  afterAll(async () => {
    // Clean up: delete the test company
    if (testCompanyId) {
      await client.assertToolCall(
        'delete_record',
        {
          resource_type: 'companies',
          record_id: testCompanyId,
        },
        () => true // Don't fail if cleanup fails
      );
    }

    await client.cleanup();
  });
});
