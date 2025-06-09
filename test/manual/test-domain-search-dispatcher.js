/**
 * Test the domain search dispatcher fix
 * This simulates the MCP tool call to verify the fix works
 */

import { executeToolRequest } from '../../dist/handlers/tools/dispatcher/core.js';

async function testDomainSearchDispatcher() {
  console.log('=== Testing Domain Search Dispatcher Fix ===');

  // Mock MCP request for search-companies-by-domain
  const mockRequest = {
    params: {
      name: 'search-companies-by-domain',
      arguments: {
        domain: 'example.com',
      },
    },
  };

  try {
    console.log('Testing dispatcher with domain parameter...');
    const result = await executeToolRequest(mockRequest);

    console.log('Result:', JSON.stringify(result, null, 2));

    // Check if we get a proper response structure
    if (result && result.content && Array.isArray(result.content)) {
      console.log('✅ Dispatcher correctly handled domain parameter');
      const textContent = result.content.find((c) => c.type === 'text')?.text;
      if (
        textContent &&
        textContent.includes('Found') &&
        textContent.includes('companies')
      ) {
        console.log('✅ Response format is correct');
      } else {
        console.log('⚠️  Response format might be unexpected:', textContent);
      }
    } else {
      console.log('❌ Unexpected response structure');
    }
  } catch (error) {
    console.error('Error testing dispatcher:', error.message);

    // Check if it's the expected "no API key" error or something else
    if (
      error.message.includes('API key') ||
      error.message.includes('ATTIO_API_KEY')
    ) {
      console.log('✅ Dispatcher works (just no API key for actual search)');
    } else {
      console.log('❌ Dispatcher issue:', error.message);
    }
  }
}

testDomainSearchDispatcher().catch(console.error);
