/**
 * Test for update-company-attribute fix - Issue #156
 * 
 * This file tests the functionality of the update-company-attribute tool handler
 * that was added to fix Issue #156 where the handler was missing in the dispatcher.
 */

const { executeToolRequest } = require('../../build/handlers/tools/dispatcher.js');

async function testUpdateCompanyAttribute() {
  console.log('Testing update-company-attribute tool handler...');
  
  // Create a test request similar to the one in the issue
  const testRequest = {
    params: {
      name: 'update-company-attribute',
      arguments: {
        companyId: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
        attributeName: 'industry',
        value: 'Batch Test Industry'
      }
    }
  };
  
  try {
    // Execute the tool request
    const result = await executeToolRequest(testRequest);
    
    // Check if the result contains an error
    if (result.isError) {
      console.error('Test FAILED: Tool execution returned an error:', result.error.message);
      if (result.error.message.includes('Tool handler not implemented')) {
        console.error('The update-company-attribute handler is still not implemented!');
      }
    } else {
      console.log('Test PASSED: update-company-attribute tool handler is now implemented');
      console.log('Response:', result);
    }
  } catch (error) {
    console.error('Test FAILED with exception:', error.message);
  }
}

// Run the test
testUpdateCompanyAttribute().catch(err => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});