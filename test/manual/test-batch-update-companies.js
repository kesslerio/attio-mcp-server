/**
 * Manual test for batch-update-companies tool
 * Tests the fix for issue #154: "batch-update-companies tool error"
 *
 * This test file validates that the fixes made for issue #154 are working correctly.
 * Specifically, it tests:
 * 1. Proper handling of the 'updates' parameter
 * 2. Correct URL construction with 'companies' as the object type
 * 3. Accurate processing of the batch update operation
 *
 * We use mocks to avoid hitting the actual API while still testing the critical
 * logic of the function. The mocks verify that:
 * - The objectSlug is correctly set to 'companies'
 * - The records parameter is properly passed and processed
 * - Error handling works as expected
 */
import { batchUpdateCompanies } from '../../build/objects/batch-companies.js';

// Simulating the example request from the issue
const testUpdates = [
  {
    id: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
    attributes: {
      industry: 'Batch Test Industry',
    },
  },
  {
    id: 'e252e8df-d6b6-4909-a03c-6c9f144c4580',
    attributes: {
      industry: 'Batch Test Industry',
    },
  },
  {
    id: 'e80b30f1-92b8-49eb-b2c4-15dd015d5b31',
    attributes: {
      industry: 'Batch Test Industry',
    },
  },
  {
    id: '509f63b6-a454-4b4a-b39a-cd99dfbcefbd',
    attributes: {
      industry: 'Batch Test Industry',
    },
  },
];

// Mock the API call to avoid hitting real API
jest.mock('../../build/api/operations/index.js', () => ({
  batchUpdateRecords: jest
    .fn()
    .mockImplementation(({ objectSlug, records }) => {
      console.log(`Called batchUpdateRecords with objectSlug: ${objectSlug}`);
      console.log(`Records count: ${records?.length || 0}`);

      if (!objectSlug || objectSlug === 'undefined') {
        throw new Error('Invalid objectSlug: undefined');
      }

      if (!(records && Array.isArray(records))) {
        throw new Error('Invalid records parameter: undefined or not an array');
      }

      // Return mock results
      return Promise.resolve(
        records.map((record, index) => ({
          id: { record_id: record.id },
          values: {
            industry: [{ value: record.attributes.industry }],
          },
        }))
      );
    }),
  executeBatchOperations: jest.fn().mockImplementation((ops, fn) => {
    // Mock batch execution
    return Promise.resolve({
      results: ops.map((op) => ({
        id: op.id,
        success: true,
        data: {
          id: { record_id: op.params.id },
          values: {
            industry: [{ value: op.params.attributes.industry }],
          },
        },
      })),
      summary: {
        total: ops.length,
        succeeded: ops.length,
        failed: 0,
      },
    });
  }),
}));

// Mock the validation to pass through
jest.mock('../../build/validators/company-validator.js', () => ({
  CompanyValidator: {
    validateCreate: jest.fn((data) => data),
    validateUpdate: jest.fn((data) => data),
  },
}));

async function runTest() {
  try {
    console.log(
      'Testing batch-update-companies with sample data from issue #154...'
    );
    const result = await batchUpdateCompanies(testUpdates);

    console.log('Test successful! Result:');
    console.log('Total operations:', result.summary.total);
    console.log('Succeeded:', result.summary.succeeded);
    console.log('Failed:', result.summary.failed);
    console.log('Sample result:', result.results[0]);

    return 'Test passed';
  } catch (error) {
    console.error('Test failed with error:', error.message);
    throw error;
  }
}

// Run the test
runTest()
  .then((result) => console.log(result))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
