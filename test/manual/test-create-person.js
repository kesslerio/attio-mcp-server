/**
 * Manual test for the create-person tool
 *
 * This script tests the implementation of the new create-person tool
 * for issue #173 which adds functionality to create people records.
 *
 * Instructions:
 * 1. Set ATTIO_API_KEY environment variable
 * 2. Run with: node test/manual/test-create-person.js
 */

// Import required modules
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';

// Configure test environment
process.env.NODE_ENV = 'development'; // Enable debug logging

/**
 * Test the create-person tool with valid parameters
 */
async function testCreatePerson() {
  console.log('=== Testing create-person with valid parameters ===');

  // Generate unique identifier for testing
  const uniqueId = Math.floor(Math.random() * 10_000);

  // Valid request with required attributes
  const validRequest = {
    params: {
      name: 'create-person',
      arguments: {
        attributes: {
          name: `Test Person ${uniqueId}`,
          email_addresses: [`test.person.${uniqueId}@example.com`],
          phone_numbers: ['+1234567890'],
          job_title: 'Software Engineer',
          company: 'Acme Inc',
        },
      },
    },
    method: 'tools/call',
  };

  console.log(`Testing with unique ID: ${uniqueId}`);
  console.log(
    'Request arguments:',
    JSON.stringify(validRequest.params.arguments, null, 2)
  );

  try {
    const result = await executeToolRequest(validRequest);
    console.log('Result:', JSON.stringify(result, null, 2));
    return { success: !result.isError, result };
  } catch (error) {
    console.error('Error during test:', error);
    return { success: false, error };
  }
}

/**
 * Test the create-person tool with invalid parameters (missing required field)
 *
 * Based on PersonValidator.validateCreate in people-write.ts:
 * - Must provide at least an email_addresses OR name field
 * - This test provides neither, so should fail validation
 */
async function testCreatePersonInvalid() {
  console.log('\n=== Testing create-person with invalid parameters ===');
  console.log(
    'Note: PersonValidator requires at least email_addresses OR name to be provided'
  );

  // Invalid request missing name and email_addresses (validation requires at least one)
  const invalidRequest = {
    params: {
      name: 'create-person',
      arguments: {
        attributes: {
          job_title: 'Software Engineer',
          company: 'Acme Inc',
        },
      },
    },
    method: 'tools/call',
  };

  console.log(
    'Request arguments:',
    JSON.stringify(invalidRequest.params.arguments, null, 2)
  );

  try {
    const result = await executeToolRequest(invalidRequest);
    console.log('Result:', JSON.stringify(result, null, 2));
    // This should be an error result
    return { success: result.isError, result };
  } catch (error) {
    console.error('Unexpected error during test:', error);
    return { success: false, error };
  }
}

/**
 * Run all the tests and report results
 */
async function runTests() {
  let validResult, invalidResult;

  try {
    validResult = await testCreatePerson();
    invalidResult = await testCreatePersonInvalid();

    console.log('\n=== Test Results ===');
    console.log(
      `Valid parameters test: ${validResult.success ? 'PASSED' : 'FAILED'}`
    );
    console.log(
      `Invalid parameters test: ${invalidResult.success ? 'PASSED' : 'FAILED'}`
    );

    if (validResult.success && invalidResult.success) {
      console.log(
        '\n✅ All tests PASSED! The create-person tool is working correctly.'
      );
    } else {
      console.log(
        '\n❌ Some tests FAILED! The create-person tool may not be working correctly.'
      );
    }
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Ensure we have the ATTIO_API_KEY set before running tests
if (!process.env.ATTIO_API_KEY) {
  console.error(
    'ERROR: ATTIO_API_KEY environment variable must be set to run this test.'
  );
  console.error(
    'Export ATTIO_API_KEY=your_key_here before running the script.'
  );
  process.exit(1);
}

// Initialize the API client
import { initializeAttioClient } from '../../dist/api/attio-client.js';

initializeAttioClient(process.env.ATTIO_API_KEY);

// Run the tests
runTests().catch((error) => {
  console.error('Unhandled error during test execution:', error);
  process.exit(1);
});
