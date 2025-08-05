// Test error handling through MCP server
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testErrorHandler() {
  // Start the server
  const serverProcess = spawn('node', ['./dist/index.js'], {
    env: {
      ...process.env,
      ATTIO_API_KEY: '16d7c9ca-9b9d-4ad5-a3e9-cfdcbcf08b3f',
    },
  });

  const transport = new StdioClientTransport({
    stdin: serverProcess.stdin,
    stdout: serverProcess.stdout,
    stderr: serverProcess.stderr,
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  try {
    // Call the advancedSearch tool with invalid value
    const result = await client.callTool({
      name: 'attio_people_advancedSearch',
      arguments: {
        filters: {
          filters: [
            {
              attribute: {
                slug: 'b2b_segment',
              },
              condition: 'equals',
              value: 'Aesthetics',
            },
          ],
          matchAny: false,
        },
        limit: 20,
        offset: 0,
      },
    });

    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

testErrorHandler().catch(console.error);
