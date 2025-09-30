/**
 * Quick verification that production records exist
 * Run: npm test -- /tmp/verify-record-exists.mcp.test.ts --run
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';

describe('Verify Production Records Exist', () => {
  let client: MCPTestClient;

  // Known IDs from production logs
  const KNOWN_PERSON_ID = 'a63f2a17-d534-5ab7-9c74-6ab24bb29eb2';
  const KNOWN_COMPANY_ID = 'a4a7b1d4-d35d-5c44-bf08-b58711ca5939';

  beforeAll(async () => {
    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: ['./dist/cli.js'],
    });
    await client.init();
  });

  afterAll(async () => {
    if (client) {
      await client.cleanup();
    }
  });

  it('should find person by ID', async () => {
    const result = await client.assertToolCall(
      'get-record-details',
      {
        resource_type: 'people',
        record_id: KNOWN_PERSON_ID,
      },
      (result) => {
        console.log('\n📋 Person Record Result:');
        if (
          result.content &&
          result.content[0] &&
          'text' in result.content[0]
        ) {
          console.log(result.content[0].text);
        }
      }
    );
  });

  it('should find company by ID', async () => {
    const result = await client.assertToolCall(
      'get-record-details',
      {
        resource_type: 'companies',
        record_id: KNOWN_COMPANY_ID,
      },
      (result) => {
        console.log('\n📋 Company Record Result:');
        if (
          result.content &&
          result.content[0] &&
          'text' in result.content[0]
        ) {
          console.log(result.content[0].text);
        }
      }
    );
  });

  it('should search for person by email', async () => {
    const result = await client.assertToolCall(
      'search-records',
      {
        resource_type: 'people',
        query: 'drbpatel24@gmail.com',
        limit: 5,
      },
      (result) => {
        console.log('\n🔍 Email Search Result:');
        if (
          result.content &&
          result.content[0] &&
          'text' in result.content[0]
        ) {
          console.log(result.content[0].text);
        }
      }
    );
  });

  it('should search for company by name', async () => {
    const result = await client.assertToolCall(
      'search-records',
      {
        resource_type: 'companies',
        query: 'Tite Medical Aesthetics',
        limit: 5,
      },
      (result) => {
        console.log('\n🔍 Company Search Result:');
        if (
          result.content &&
          result.content[0] &&
          'text' in result.content[0]
        ) {
          console.log(result.content[0].text);
        }
      }
    );
  });
});
