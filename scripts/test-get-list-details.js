/**
 * Quick test for the get-list-details tool to verify our fix
 */

const dispatcher = require('../build/handlers/tools/dispatcher.js');
const registry = require('../build/handlers/tools/registry.js');
const attioClient = require('../build/api/attio-client.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize the Attio client with the API key from environment variables
const apiKey = process.env.ATTIO_API_KEY;

if (!apiKey) {
  console.error(
    'ERROR: You must set ATTIO_API_KEY environment variable to run this test'
  );
  process.exit(1);
}

// Initialize the API client
attioClient.initializeAttioClient(apiKey);

// Create a test function to run the test
async function testGetListDetails() {
  try {
    // Test with a sample list ID - replace with a valid list ID if you have one
    // You can create a list in Attio or use an existing one
    const listId = process.argv[2]; // Take list ID from command line argument

    if (!listId) {
      console.error('Please provide a list ID as a command line argument');
      console.error('Usage: node test-get-list-details.js <list-id>');
      process.exit(1);
    }

    console.log(`Getting details for list with ID: ${listId}`);

    // Create a mock request to test the tool
    const mockRequest = {
      params: {
        name: 'get-list-details',
        arguments: {
          listId,
        },
      },
    };

    // Execute the request through the dispatcher
    const response = await dispatcher.executeToolRequest(mockRequest);

    console.log('Response:', JSON.stringify(response, null, 2));

    // Check if we got an error
    if (response.isError) {
      console.error('ERROR:', response.error);
      if (response.error.details) {
        console.error('Details:', response.error.details);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testGetListDetails().catch(console.error);
