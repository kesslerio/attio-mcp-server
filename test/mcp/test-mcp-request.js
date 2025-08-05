/**
 * Test exactly what happens when a request comes through MCP
 */

// Mock the API to see what's being sent
const mockApiResponses = new Map();

// Override fetch to mock API responses
globalThis.fetch = async (url, options) => {
  const body = options?.body ? JSON.parse(options.body) : null;
  console.log('\n[MOCK API] Request:', {
    url,
    method: options?.method,
    body,
  });

  // Check for untranslated attribute
  if (JSON.stringify(body).includes('b2b_segment')) {
    console.error(
      '[MOCK API] ERROR: Found untranslated attribute "b2b_segment"!'
    );
    return {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        error: 'Unknown attribute slug: b2b_segment',
        message: 'The provided attribute slug is not recognized',
      }),
    };
  }

  // Success response for type_persona
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
  };
};

async function testMCPRequest() {
  // Load the MCP server
  console.log('Loading MCP server...');
  const { Server } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { registerToolHandlers } = await import('./dist/handlers/tools.js');

  // Create a mock MCP server
  const server = new Server(
    {
      name: 'test-attio-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register the tool handlers
  registerToolHandlers(server);

  // Test the advanced-search-companies tool
  console.log('\n=== Testing advanced-search-companies tool ===');

  // Simulate a request from Claude Code
  const request = {
    method: 'tools/call',
    id: '123',
    params: {
      name: 'advanced-search-companies',
      arguments: {
        filters: {
          filters: [
            {
              attribute: { slug: 'b2b_segment' },
              condition: 'contains',
              value: 'Plastic Surgeon',
            },
          ],
        },
      },
    },
  };

  console.log('Request:', JSON.stringify(request, null, 2));

  // Get the handler and call it directly
  const handlers = server._handlers || server.handlers || {};
  console.log('Available handlers:', Object.keys(handlers));

  // Look for the tool call handler
  const toolHandler = handlers['tools/call'];
  if (toolHandler) {
    try {
      console.log('\nCalling tool handler...');
      const response = await toolHandler(request);
      console.log('Response:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.error('Handler error:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  } else {
    console.log('No tool call handler found');

    // Try to find the actual registered tools
    const toolsList = server._tools || server.tools || {};
    console.log('Registered tools:', Object.keys(toolsList));
  }
}

testMCPRequest().catch(console.error);
