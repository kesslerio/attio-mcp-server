/**
 * Manual test for the batch-update-companies tool with refactored helper function
 *
 * This file tests the refactored handleCompanyBatchOperation helper function
 * to ensure it properly handles batch updates for company records.
 */
const { executeToolRequest } = require('../../dist/handlers/tools/dispatcher');

// Sample company IDs for testing
const COMPANY_IDS = ['test-company-id-1', 'test-company-id-2'];

// Create a test request for batch-update-companies
const request = {
  params: {
    name: 'batch-update-companies',
    arguments: {
      updates: [
        {
          id: COMPANY_IDS[0],
          attributes: {
            name: 'Updated Company 1',
            website: 'https://example1.com',
          },
        },
        {
          id: COMPANY_IDS[1],
          attributes: {
            name: 'Updated Company 2',
            website: 'https://example2.com',
          },
        },
      ],
    },
    method: 'tools/call',
  },
};

async function runTest() {
  try {
    console.log(
      'Testing batch-update-companies tool with refactored helper function...'
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
