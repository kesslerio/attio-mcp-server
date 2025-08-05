#!/usr/bin/env node

/**
 * Manual test script for Issue #344
 * Tests MCP tool calls with both wrapped and unwrapped argument formats
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config();

// Set debug mode for detailed logging
process.env.MCP_DEBUG_REQUESTS = 'true';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initializeAttioClient } from '../../src/api/attio-client.js';
import { registerToolHandlers } from '../../src/handlers/tools/index.js';

console.error('\n=== Issue #344 Test Script ===\n');
console.error(
  'This script tests both wrapped and unwrapped argument formats.\n'
);

// Initialize API client
if (!process.env.ATTIO_API_KEY) {
  console.error('ERROR: ATTIO_API_KEY environment variable not found');
  process.exit(1);
}

initializeAttioClient(process.env.ATTIO_API_KEY);

// Create test server
const server = new Server(
  {
    name: 'attio-mcp-test-server',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Store the request handler for testing
let toolHandler = null;
const originalSetRequestHandler = server.setRequestHandler.bind(server);
server.setRequestHandler = (schema, handler) => {
  if (schema === CallToolRequestSchema) {
    toolHandler = handler;
  }
  return originalSetRequestHandler(schema, handler);
};

// Register handlers
registerToolHandlers(server);

// Test cases
const testCases = [
  {
    name: 'Standard MCP format (wrapped arguments)',
    request: {
      params: {
        name: 'discover-company-attributes',
        arguments: {},
      },
    },
  },
  {
    name: 'Issue #344 format (unwrapped arguments)',
    request: {
      params: {
        name: 'discover-company-attributes',
      },
    },
  },
  {
    name: 'Search with wrapped arguments',
    request: {
      params: {
        name: 'search-companies',
        arguments: {
          query: 'test company',
        },
      },
    },
  },
  {
    name: 'Search with unwrapped arguments (Issue #344)',
    request: {
      params: {
        name: 'search-companies',
        query: 'test company',
      },
    },
  },
];

// Run tests
async function runTests() {
  console.error('Running test cases...\n');

  for (const testCase of testCases) {
    console.error(`\n--- Test: ${testCase.name} ---`);
    console.error('Request:', JSON.stringify(testCase.request, null, 2));

    try {
      const result = await toolHandler(testCase.request);
      console.error('✅ SUCCESS');
      console.error(
        'Response:',
        JSON.stringify(result, null, 2).substring(0, 200) + '...'
      );
    } catch (error) {
      console.error('❌ FAILED');
      console.error('Error:', error.message);
    }
  }

  console.error('\n=== Test Complete ===\n');
  console.error('To test with Claude Desktop:');
  console.error('1. Start the server normally: npm start');
  console.error('2. Connect via Claude Desktop');
  console.error('3. Try commands like:');
  console.error('   - "Search for companies named test"');
  console.error('   - "Show me company attributes"');
  console.error('4. Check server logs for [MCP Normalization] messages\n');
}

// Run tests
runTests().catch(console.error);
