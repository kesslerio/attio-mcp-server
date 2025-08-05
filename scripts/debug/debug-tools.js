/**
 * Debug script for testing tool handlers
 */
const { registerToolHandlers } = require('./dist/handlers/tools.js');

// Mock server
const mockServer = {
  setRequestHandler: (schema, handler) => {
    console.log(`Registered handler for schema: ${schema.name}`);

    // Store the handler for CallToolRequestSchema
    if (schema.name === 'CallToolRequestSchema') {
      mockServer.callToolHandler = handler;
    }

    // Store the handler for ListToolsRequestSchema
    if (schema.name === 'ListToolsRequestSchema') {
      mockServer.listToolsHandler = handler;
    }
  },
  callToolHandler: null,
  listToolsHandler: null,
};

// Register handlers
registerToolHandlers(mockServer);

// Test listing tools
async function testListTools() {
  console.log('\n--- Testing List Tools ---');
  try {
    const result = await mockServer.listToolsHandler();
    console.log(`Found ${result.tools.length} tools:`);
    result.tools.forEach((tool) => {
      console.log(`- ${tool.name}`);
    });
  } catch (error) {
    console.error('Error listing tools:', error);
  }
}

// Test calling search-people tool
async function testSearchPeople() {
  console.log('\n--- Testing search-people Tool ---');
  try {
    const result = await mockServer.callToolHandler({
      params: {
        name: 'search-people',
        arguments: { query: 'Test' },
      },
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error calling search-people tool:', error);
  }
}

// Run tests
async function runTests() {
  await testListTools();
  await testSearchPeople();
}

runTests().catch(console.error);
