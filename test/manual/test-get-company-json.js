/**
 * Manual test for the get-company-json tool
 *
 * This file tests the get-company-json tool which previously had an issue with
 * the tool handler not being implemented for the 'json' tool type.
 *
 * The test includes:
 * 1. A valid request with companyId to verify success case
 * 2. A request with missing companyId to verify error handling
 */
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';

// Sample company ID for testing
const COMPANY_ID = 'test-company-id';

// Test case 1: Valid request with companyId
const validRequest = {
  params: {
    name: 'get-company-json',
    arguments: {
      companyId: COMPANY_ID,
    },
  },
  method: 'tools/call',
};

// Test case 2: Invalid request missing companyId
const invalidRequest = {
  params: {
    name: 'get-company-json',
    arguments: {},
  },
  method: 'tools/call',
};

async function testValidRequest() {
  console.log('=== TEST CASE 1: Valid Request ===');
  console.log('Testing get-company-json tool with valid companyId...');
  console.log('Request:', JSON.stringify(validRequest, null, 2));

  try {
    // Execute the tool request
    const result = await executeToolRequest(validRequest);

    console.log('Result:', JSON.stringify(result, null, 2));

    // Check if the result has an error
    if (result.isError) {
      console.error('❌ Test failed: Tool returned an error:', result.error);
      return false;
    }

    console.log(
      '✅ Test passed: get-company-json tool executed successfully with valid request'
    );
    return true;
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

async function testInvalidRequest() {
  console.log('\n=== TEST CASE 2: Invalid Request (Missing companyId) ===');
  console.log('Testing get-company-json tool with missing companyId...');
  console.log('Request:', JSON.stringify(invalidRequest, null, 2));

  try {
    // Execute the tool request
    const result = await executeToolRequest(invalidRequest);

    console.log('Result:', JSON.stringify(result, null, 2));

    // For the invalid request, we expect an error
    if (result.isError) {
      if (result.error?.message?.includes('companyId parameter is required')) {
        console.log(
          '✅ Test passed: Tool correctly returned an error for missing companyId'
        );
        return true;
      }
      console.error(
        '❌ Test failed: Tool returned an error, but not the expected one:',
        result.error
      );
      return false;
    }

    console.error(
      '❌ Test failed: Tool did not return an error for missing companyId'
    );
    return false;
  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error);
    return false;
  }
}

async function runTest() {
  try {
    console.log('Starting tests for get-company-json tool...');

    // Run all test cases
    const validResult = await testValidRequest();
    const invalidResult = await testInvalidRequest();

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    if (validResult && invalidResult) {
      console.log('✅ All tests passed!');
    } else {
      console.log('❌ Some tests failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Tests failed with error:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}

export { runTest, testValidRequest, testInvalidRequest };
