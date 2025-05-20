/**
 * Manual test for the get-company-json tool
 * 
 * This file tests the get-company-json tool which previously had an issue with
 * the tool handler not being implemented for the 'json' tool type.
 */
const { executeToolRequest } = require('../../dist/handlers/tools/dispatcher');

// Sample company ID for testing
const COMPANY_ID = 'test-company-id';

// Create a test request for get-company-json
const request = {
  params: {
    name: 'get-company-json',
    arguments: {
      companyId: COMPANY_ID
    }
  },
  method: 'tools/call'
};

async function runTest() {
  try {
    console.log('Testing get-company-json tool...');
    console.log('Request:', JSON.stringify(request, null, 2));
    
    // Execute the tool request
    const result = await executeToolRequest(request);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Test completed successfully');
    
    // Check if the result has an error
    if (result.isError) {
      console.error('Test failed: Tool returned an error:', result.error);
      process.exit(1);
    }
    
    console.log('Test passed: get-company-json tool executed successfully');
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  runTest();
}

module.exports = { runTest };