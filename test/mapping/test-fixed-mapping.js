/**
 * Test the fixed attribute mapping
 */
import { registerToolHandlers } from './dist/handlers/tools.js';
import { FilterConditionType } from './dist/types/attio.js';

// Set development mode to see debug logs
process.env.NODE_ENV = 'development';
process.env.ATTIO_API_KEY = 'test-key';

// Mock the API to catch requests
const mockFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const body = options?.body ? JSON.parse(options.body) : null;
  console.log('\n[MOCK API] Request to:', url);
  console.log('[MOCK API] Body:', JSON.stringify(body, null, 2));

  // Check what attribute was sent
  if (JSON.stringify(body).includes('b2b_segment')) {
    console.error('[MOCK API] ERROR: Untranslated b2b_segment found!');
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: 'Unknown attribute slug: b2b_segment' }),
    };
  }

  if (JSON.stringify(body).includes('type_persona')) {
    console.log('[MOCK API] SUCCESS: Found translated type_persona!');
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    };
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
  };
};

async function testMCPFlow() {
  // Create a mock MCP server
  const mockServer = {
    setRequestHandler: (schema, handler) => {
      console.log('Registered handler for:', schema.method || schema.name);
      // If it's the tool call handler, save it
      if (schema.method === 'tools/call') {
        mockServer.toolHandler = handler;
      }
    },
  };

  // Register handlers
  registerToolHandlers(mockServer);

  // Now test the advanced-search-companies tool
  if (mockServer.toolHandler) {
    const request = {
      params: {
        name: 'advanced-search-companies',
        arguments: {
          filters: {
            filters: [
              {
                attribute: { slug: 'b2b_segment' },
                condition: FilterConditionType.CONTAINS,
                value: 'Plastic Surgeon',
              },
            ],
          },
        },
      },
    };

    console.log('\n=== Testing Advanced Search Companies ===');
    console.log('Request:', JSON.stringify(request, null, 2));

    try {
      const response = await mockServer.toolHandler(request);
      console.log('\nResponse:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.error('\nError:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  } else {
    console.error('No tool handler found!');
  }
}

testMCPFlow().catch(console.error);
