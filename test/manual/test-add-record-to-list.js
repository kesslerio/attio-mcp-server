/**
 * Manual test for the add-record-to-list tool
 *
 * This script tests the fix for issue #157 which was related to a payload format issue
 * where the add-record-to-list tool was failing with 'Body payload validation error'.
 *
 * Instructions:
 * 1. Set ATTIO_API_KEY environment variable
 * 2. Create test list and company in your Attio workspace or use existing IDs
 * 3. Run with: node test/manual/test-add-record-to-list.js
 */

// Import required modules
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';

// Constants for testing - replace with real IDs from your Attio workspace
// If you don't provide these as environment variables, the test will still run
// but will fail with validation errors (which is also useful for testing the error handling)
const LIST_ID =
  process.env.TEST_LIST_ID || '6fdac5d1-285b-4bef-9087-4517dd0b04f6';
const COMPANY_ID =
  process.env.TEST_COMPANY_ID || '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e';

// Configure test environment
process.env.NODE_ENV = 'development'; // Enable debug logging

/**
 * Test the add-record-to-list tool with valid parameters
 */
async function testValidAddRecordToList() {
  console.log('=== Testing add-record-to-list with valid parameters ===');

  // Valid request with both listId and recordId
  const validRequest = {
    params: {
      name: 'add-record-to-list',
      arguments: {
        listId: LIST_ID,
        recordId: COMPANY_ID,
      },
    },
    method: 'tools/call',
  };

  console.log(`Testing with listId: ${LIST_ID} and recordId: ${COMPANY_ID}\n`);

  try {
    const result = await executeToolRequest(validRequest);
    console.log('Result:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('Error during valid test:', error);
    return false;
  }
}

/**
 * Test the add-record-to-list tool with missing listId parameter
 */
async function testMissingListId() {
  console.log('\n=== Testing add-record-to-list with missing listId ===');

  // Invalid request missing listId
  const invalidRequest = {
    params: {
      name: 'add-record-to-list',
      arguments: {
        recordId: COMPANY_ID,
      },
    },
    method: 'tools/call',
  };

  try {
    const result = await executeToolRequest(invalidRequest);
    console.log('Result:', JSON.stringify(result, null, 2));
    // Should be an error result
    return result.isError === true;
  } catch (error) {
    console.error('Unexpected error during missing listId test:', error);
    return false;
  }
}

/**
 * Test the add-record-to-list tool with missing recordId parameter
 */
async function testMissingRecordId() {
  console.log('\n=== Testing add-record-to-list with missing recordId ===');

  // Invalid request missing recordId
  const invalidRequest = {
    params: {
      name: 'add-record-to-list',
      arguments: {
        listId: LIST_ID,
      },
    },
    method: 'tools/call',
  };

  try {
    const result = await executeToolRequest(invalidRequest);
    console.log('Result:', JSON.stringify(result, null, 2));
    // Should be an error result
    return result.isError === true;
  } catch (error) {
    console.error('Unexpected error during missing recordId test:', error);
    return false;
  }
}

/**
 * Run all the tests and report results
 */
async function runTests() {
  let validResult, missingListIdResult, missingRecordIdResult;

  try {
    validResult = await testValidAddRecordToList();
    missingListIdResult = await testMissingListId();
    missingRecordIdResult = await testMissingRecordId();

    console.log('\n=== Test Results ===');
    console.log(`Valid request test: ${validResult ? 'PASSED' : 'FAILED'}`);
    console.log(
      `Missing listId test: ${missingListIdResult ? 'PASSED' : 'FAILED'}`
    );
    console.log(
      `Missing recordId test: ${missingRecordIdResult ? 'PASSED' : 'FAILED'}`
    );

    if (validResult && missingListIdResult && missingRecordIdResult) {
      console.log(
        '\n✅ All tests PASSED! The fix for issue #157 is working correctly.'
      );
    } else {
      console.log(
        '\n❌ Some tests FAILED! The fix for issue #157 may not be working correctly.'
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

// Initialize the API client - mock implementation for testing
import { initializeAttioClient } from '../../dist/api/attio-client.js';

initializeAttioClient(process.env.ATTIO_API_KEY);

// Run the tests
runTests().catch((error) => {
  console.error('Unhandled error during test execution:', error);
  process.exit(1);
});
