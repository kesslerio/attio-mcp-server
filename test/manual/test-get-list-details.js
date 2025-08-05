/**
 * Test for the get-list-details tool
 *
 * This test script directly calls the getListDetails function to identify issues
 * with the get-list-details MCP tool.
 */

import { initializeAttioClient } from '../../src/api/attio-client.js';
import { executeToolRequest } from '../../src/handlers/tools/dispatcher.js';
// Import the necessary modules
import { getListDetails } from '../../src/objects/lists.js';

// Initialize the Attio client with the API key from environment variables
const apiKey = process.env.ATTIO_API_KEY;

if (!apiKey) {
  console.error(
    'ERROR: You must set ATTIO_API_KEY environment variable to run this test'
  );
  process.exit(1);
}

// Initialize the API client
initializeAttioClient(apiKey);

// Create a test function to run the test
async function testGetListDetails() {
  try {
    console.log('Testing direct getListDetails function:');
    console.log('=====================================');

    // Test with a sample list ID - replace with a valid list ID from your Attio workspace
    // You may need to create a list in Attio and get its ID
    const listId = process.argv[2]; // Take list ID from command line argument

    if (!listId) {
      console.error('Please provide a list ID as a command line argument');
      console.error('Usage: node test-get-list-details.js <list-id>');
      process.exit(1);
    }

    console.log(`Getting details for list with ID: ${listId}`);

    // First, test the direct function call to see if the API works
    try {
      const result = await getListDetails(listId);
      console.log('Function success! Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Function error:', error);
      console.error('Error details:', error.response?.data || error.message);
    }

    console.log('\nTesting the MCP tool implementation:');
    console.log('==================================');

    // Now, test the MCP tool request to find where the error happens
    try {
      const mockRequest = {
        params: {
          name: 'get-list-details',
          arguments: {
            listId,
          },
        },
      };

      const toolResponse = await executeToolRequest(mockRequest);
      console.log(
        'Tool success! Response:',
        JSON.stringify(toolResponse, null, 2)
      );
    } catch (error) {
      console.error('Tool error:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testGetListDetails().catch(console.error);
