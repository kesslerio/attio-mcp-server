/**
 * Test to verify the fix for Issue #100
 */
import { registerToolHandlers } from '../dist/handlers/tools.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock server for testing
class MockServer {
  constructor() {
    this.handlers = {};
  }
  
  setRequestHandler(schema, handler) {
    this.handlers[schema.validate ? 'CallToolRequest' : schema] = handler;
  }
}

async function testCreateCompanyFix() {
  console.log('=== Testing Issue #100 Fix ===');
  
  const mockServer = new MockServer();
  
  // Register tool handlers
  await registerToolHandlers(mockServer);
  
  // Get the call tool handler
  const callToolHandler = mockServer.handlers['CallToolRequest'];
  
  if (!callToolHandler) {
    console.error('No CallToolRequest handler found!');
    return;
  }
  
  // Simulate a create-company request
  const request = {
    method: 'tools/call',
    params: {
      name: 'create-company',
      arguments: {
        attributes: {
          name: 'Test Company for Issue 100'
        }
      }
    }
  };
  
  console.log('Request:', JSON.stringify(request, null, 2));
  
  try {
    // Execute the handler
    const result = await callToolHandler(request);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Check if the result is an error
    if (result.isError) {
      console.error('❌ Error occurred:', result.content[0].text);
      
      // Check if the error contains 'undefined' in the URL
      if (result.content[0].text.includes('objects/undefined')) {
        console.error('❌ BUG STILL EXISTS: URL contains undefined');
      } else {
        console.log('✅ URL does not contain undefined');
      }
    } else {
      console.log('✅ Company creation handler executed successfully');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testCreateCompanyFix().catch(console.error);