/**
 * Manual test for the update-company-attribute tool
 *
 * This file tests the refactored handleCompanyAttributeUpdate helper function
 * to ensure it properly handles attribute updates for company records.
 */
const { executeToolRequest } = require('../../dist/handlers/tools/dispatcher');

// Sample company ID for testing
const COMPANY_ID = 'test-company-id';
const ATTRIBUTE_NAME = 'test-attribute';
const ATTRIBUTE_VALUE = 'test-value';

// Create a test request for update-company-attribute
const request = {
  params: {
    name: 'update-company-attribute',
    arguments: {
      companyId: COMPANY_ID,
      attributeName: ATTRIBUTE_NAME,
      value: ATTRIBUTE_VALUE,
    },
  },
  method: 'tools/call',
};

async function runTest() {
  try {
    console.log(
      'Testing update-company-attribute tool with refactored helper function...'
    );
    console.log('Request:', JSON.stringify(request, null, 2));

    // Execute the tool request
    const result = await executeToolRequest(request);

    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Only run if executed directly
if (require.main === module) {
  runTest();
}

module.exports = { runTest };
