#!/usr/bin/env node

/**
 * Manual test script to verify smart-search-companies tool fix
 * 
 * This script simulates the MCP request that was failing and verifies
 * that the dispatcher now handles the smartSearch tool type correctly.
 */

import { executeToolRequest } from '../../src/handlers/tools/dispatcher.js';

async function testSmartSearchFix() {
  console.log('Testing smart-search-companies tool fix...\n');
  
  // Create a mock MCP request for smart search
  const mockRequest = {
    params: {
      name: 'smart-search-companies',
      arguments: {
        query: 'IHT Factor joey@ihtfactor.com'
      }
    }
  };
  
  try {
    console.log('Executing smart-search-companies tool...');
    console.log('Query:', mockRequest.params.arguments.query);
    
    const result = await executeToolRequest(mockRequest);
    
    console.log('\n✅ SUCCESS: Tool executed without error');
    console.log('Result type:', typeof result);
    console.log('Is error:', result.isError || false);
    
    if (result.content && result.content.length > 0) {
      console.log('Response content preview:', result.content[0].text?.substring(0, 200) + '...');
    }
    
    return true;
  } catch (error) {
    console.log('\n❌ FAILED: Tool execution failed');
    console.error('Error:', error.message);
    
    if (error.message.includes('Tool handler not implemented for tool type: smartSearch')) {
      console.error('🔥 The fix did not work - dispatcher still missing smartSearch handler');
    }
    
    return false;
  }
}

// Run the test
testSmartSearchFix()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ Smart search fix verification: PASSED');
      console.log('The smart-search-companies tool should now work correctly.');
    } else {
      console.log('❌ Smart search fix verification: FAILED');
      console.log('Additional work may be needed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });