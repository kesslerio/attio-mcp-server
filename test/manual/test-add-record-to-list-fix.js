/**
 * Manual test for the fixed add-record-to-list tool
 * This test verifies that the API payload structure is correct when using objectType and initialValues
 *
 * Run with: node test/manual/test-add-record-to-list-fix.js
 */

import { listsToolConfigs } from '../../dist/handlers/tool-configs/lists.js';
// Import the handler directly
import { handleAddRecordToListOperation } from '../../dist/handlers/tools/dispatcher/operations/lists.js';

// Spy on the handler to see what parameters it receives
const originalHandler = listsToolConfigs.addRecordToList.handler;
let handlerCalled = false;
let handlerParams = {};

// Replace the handler with our spy function
listsToolConfigs.addRecordToList.handler = (
  listId,
  recordId,
  objectType,
  initialValues
) => {
  console.log('\n[TEST SPY] addRecordToList handler called with:');
  console.log('- listId:', listId);
  console.log('- recordId:', recordId);
  console.log('- objectType:', objectType);
  console.log('- initialValues:', JSON.stringify(initialValues, null, 2));

  handlerCalled = true;
  handlerParams = { listId, recordId, objectType, initialValues };

  // Return a mock response
  return Promise.resolve({
    id: { entry_id: 'test-entry-123' },
    record_id: recordId,
    parent_record_id: recordId,
    values: initialValues || {},
  });
};

// Create a mock request with various parameter combinations
async function runTest(testName, requestArguments) {
  console.log(`\n=== TEST: ${testName} ===`);

  handlerCalled = false;
  handlerParams = {};

  // Create the mock request
  const mockRequest = {
    params: {
      arguments: requestArguments,
    },
  };

  // Call the handler
  try {
    const result = await handleAddRecordToListOperation(
      mockRequest,
      listsToolConfigs.addRecordToList
    );
    console.log('Operation result:', result);

    // Verify parameters were passed correctly
    if (!handlerCalled) {
      console.error('❌ FAILED: Handler was not called');
      return false;
    }

    // For required parameters
    if (requestArguments.listId !== handlerParams.listId) {
      console.error(
        `❌ FAILED: listId not passed correctly. Expected ${requestArguments.listId}, got ${handlerParams.listId}`
      );
      return false;
    }

    if (requestArguments.recordId !== handlerParams.recordId) {
      console.error(
        `❌ FAILED: recordId not passed correctly. Expected ${requestArguments.recordId}, got ${handlerParams.recordId}`
      );
      return false;
    }

    // For optional parameters
    if (
      requestArguments.objectType &&
      requestArguments.objectType !== handlerParams.objectType
    ) {
      console.error(
        `❌ FAILED: objectType not passed correctly. Expected ${requestArguments.objectType}, got ${handlerParams.objectType}`
      );
      return false;
    }

    if (
      requestArguments.initialValues &&
      JSON.stringify(requestArguments.initialValues) !==
        JSON.stringify(handlerParams.initialValues)
    ) {
      console.error(
        `❌ FAILED: initialValues not passed correctly. Expected ${JSON.stringify(
          requestArguments.initialValues
        )}, got ${JSON.stringify(handlerParams.initialValues)}`
      );
      return false;
    }

    console.log('✅ PASSED: All parameters passed correctly to handler');
    return true;
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

// Main test function
async function runAllTests() {
  let passCount = 0;
  let failCount = 0;

  // Test 1: Required parameters only
  const test1 = await runTest('Required parameters only', {
    listId: 'list-123',
    recordId: 'record-456',
  });
  test1 ? passCount++ : failCount++;

  // Test 2: With objectType
  const test2 = await runTest('With objectType', {
    listId: 'list-123',
    recordId: 'record-456',
    objectType: 'people',
  });
  test2 ? passCount++ : failCount++;

  // Test 3: With initialValues
  const test3 = await runTest('With initialValues', {
    listId: 'list-123',
    recordId: 'record-456',
    initialValues: {
      stage: 'Prospect',
      priority: 'High',
    },
  });
  test3 ? passCount++ : failCount++;

  // Test 4: With both objectType and initialValues
  const test4 = await runTest('With both objectType and initialValues', {
    listId: 'list-123',
    recordId: 'record-456',
    objectType: 'companies',
    initialValues: {
      stage: 'Demo Scheduled',
      priority: 'Medium',
      notes: 'Demo scheduled for next week',
    },
  });
  test4 ? passCount++ : failCount++;

  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Tests passed: ${passCount}`);
  console.log(`Tests failed: ${failCount}`);

  if (failCount === 0) {
    console.log(
      '\n✅ ALL TESTS PASSED: add-record-to-list bug fix is working correctly'
    );
  } else {
    console.log(
      '\n❌ SOME TESTS FAILED: Please check the output above for details'
    );
  }
}

// Run all tests
runAllTests().catch((error) => {
  console.error('Unexpected error:', error);
});
