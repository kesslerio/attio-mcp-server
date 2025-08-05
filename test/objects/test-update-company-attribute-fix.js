/**
 * Test for update-company-attribute fix - Issue #156
 *
 * This file tests the functionality of the update-company-attribute tool handler
 * that was added to fix Issue #156 where the handler was missing in the dispatcher.
 *
 * This test includes comprehensive validation of:
 * - Basic attribute updates
 * - Null value handling (attribute clearing)
 * - Parameter validation
 * - Error handling for invalid inputs
 */

const {
  executeToolRequest,
} = require('../../build/handlers/tools/dispatcher.js');

/**
 * Helper function to run a test case and log the results
 *
 * @param {string} testName - The name of the test case
 * @param {Object} request - The request object to pass to executeToolRequest
 * @param {Function} validator - Function to validate the result (returns true if passed)
 */
async function runTestCase(testName, request, validator) {
  console.log(`\n⏺ Running test case: ${testName}`);

  try {
    // Execute the tool request
    const result = await executeToolRequest(request);

    // Check if the result contains an error that wasn't expected
    if (validator(result)) {
      console.log(`✅ Test PASSED: ${testName}`);
      return true;
    }
    console.error(`❌ Test FAILED: ${testName}`);
    console.error('Response:', JSON.stringify(result, null, 2));
    return false;
  } catch (error) {
    console.error(`❌ Test FAILED with exception: ${testName}`);
    console.error('Error:', error.message);
    return false;
  }
}

async function testUpdateCompanyAttribute() {
  console.log('🧪 Testing update-company-attribute tool handler...');
  const testCompanyId = '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e';
  let testsPassed = 0;
  let testsFailed = 0;

  // Test Case 1: Basic attribute update (string value)
  const result1 = await runTestCase(
    'Basic attribute update with string value',
    {
      params: {
        name: 'update-company-attribute',
        arguments: {
          companyId: testCompanyId,
          attributeName: 'industry',
          value: 'Batch Test Industry',
        },
      },
    },
    (result) => !result.isError
  );

  result1 ? testsPassed++ : testsFailed++;

  // Test Case 2: Update with null value (clearing an attribute)
  const result2 = await runTestCase(
    'Update with null value (clearing an attribute)',
    {
      params: {
        name: 'update-company-attribute',
        arguments: {
          companyId: testCompanyId,
          attributeName: 'industry',
          value: null,
        },
      },
    },
    (result) => !result.isError
  );

  result2 ? testsPassed++ : testsFailed++;

  // Test Case 3: Update with complex object value
  const result3 = await runTestCase(
    'Update with complex object value',
    {
      params: {
        name: 'update-company-attribute',
        arguments: {
          companyId: testCompanyId,
          attributeName: 'custom_data',
          value: {
            key1: 'value1',
            key2: 42,
            nested: {
              flag: true,
            },
          },
        },
      },
    },
    (result) => !result.isError
  );

  result3 ? testsPassed++ : testsFailed++;

  // Test Case 4: Missing companyId parameter
  const result4 = await runTestCase(
    'Missing companyId parameter',
    {
      params: {
        name: 'update-company-attribute',
        arguments: {
          attributeName: 'industry',
          value: 'Test Industry',
        },
      },
    },
    (result) =>
      result.isError &&
      result.content[0].text.includes('companyId parameter is required')
  );

  result4 ? testsPassed++ : testsFailed++;

  // Test Case 5: Missing attributeName parameter
  const result5 = await runTestCase(
    'Missing attributeName parameter',
    {
      params: {
        name: 'update-company-attribute',
        arguments: {
          companyId: testCompanyId,
          value: 'Test Value',
        },
      },
    },
    (result) =>
      result.isError && result.content[0].text.includes('attributeName')
  );

  result5 ? testsPassed++ : testsFailed++;

  // Test Case 6: Missing value parameter
  const result6 = await runTestCase(
    'Missing value parameter',
    {
      params: {
        name: 'update-company-attribute',
        arguments: {
          companyId: testCompanyId,
          attributeName: 'industry',
        },
      },
    },
    (result) => result.isError && result.content[0].text.includes('value')
  );

  result6 ? testsPassed++ : testsFailed++;

  // Test Case 7: Empty attribute name
  const result7 = await runTestCase(
    'Empty attribute name',
    {
      params: {
        name: 'update-company-attribute',
        arguments: {
          companyId: testCompanyId,
          attributeName: '',
          value: 'Test Value',
        },
      },
    },
    (result) =>
      result.isError && result.content[0].text.includes('non-empty string')
  );

  result7 ? testsPassed++ : testsFailed++;

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`- Total tests: ${testsPassed + testsFailed}`);
  console.log(`- Passed: ${testsPassed}`);
  console.log(`- Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    console.error('❌ Some tests failed - see above for details');
    return false;
  }
  console.log('✅ All tests passed!');
  return true;
}

// Run the test
testUpdateCompanyAttribute()
  .then((success) => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Unhandled error in test:', err);
    process.exit(1);
  });
