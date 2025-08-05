/**
 * Manual test script for advanced-search-companies fix (Issue #182)
 * This script allows direct testing of the fix with actual API calls
 *
 * To run:
 * 1. Ensure you have a valid ATTIO_API_KEY environment variable set
 * 2. Run with: node test/manual/test-advanced-search-fix-182.js
 */
import 'dotenv/config';
import { initializeAttioClient } from '../../dist/api/attio-client.js';
import { advancedSearchCompanies } from '../../dist/objects/companies/index.js';

// Ensure API key is set
if (!process.env.ATTIO_API_KEY) {
  console.error('ERROR: ATTIO_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize API client
initializeAttioClient(process.env.ATTIO_API_KEY);

// Enable debug logging
process.env.NODE_ENV = 'development';

// Test cases: Valid filters that should work
const validFilters = [
  // Case 1: Simple name filter
  {
    description: 'Simple name filter (should work)',
    filter: {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'inc',
        },
      ],
    },
  },

  // Case 2: OR multiple conditions
  {
    description: 'Multiple conditions with OR logic (should work)',
    filter: {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'inc',
        },
        {
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'tech',
        },
      ],
      matchAny: true,
    },
  },

  // Case 3: AND multiple conditions
  {
    description: 'Multiple conditions with AND logic (should work)',
    filter: {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'inc',
        },
        {
          attribute: { slug: 'website' },
          condition: 'contains',
          value: '.com',
        },
      ],
      matchAny: false,
    },
  },
];

// Test cases: Invalid filters that should provide meaningful errors
const invalidFilters = [
  // Case 4: Missing attribute slug
  {
    description: 'Missing attribute slug (should fail gracefully)',
    filter: {
      filters: [
        {
          attribute: {},
          condition: 'contains',
          value: 'test',
        },
      ],
    },
  },

  // Case 5: Invalid condition
  {
    description: 'Invalid condition (should fail gracefully)',
    filter: {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: 'invalid_condition',
          value: 'test',
        },
      ],
    },
  },

  // Case 6: Nested structure that doesn't match API expectation
  {
    description: 'Incorrectly nested filter (should fail gracefully)',
    filter: {
      filters: {
        attribute: { slug: 'name' },
        condition: 'contains',
        value: 'test',
      },
    },
  },

  // Case 7: Empty filters array
  {
    description: 'Empty filters array (should return empty results)',
    filter: {
      filters: [],
    },
  },

  // Case 8: Filter with no filters property
  {
    description: 'Missing filters property (should fail gracefully)',
    filter: {},
  },
];

// Function to test search with a test case
async function testSearch(testCase) {
  console.log(`\n===== Testing: ${testCase.description} =====`);
  console.log('Input filter:', JSON.stringify(testCase.filter, null, 2));

  try {
    // Test the search function
    const results = await advancedSearchCompanies(testCase.filter, 5);
    console.log(`SUCCESS! Found ${results.length} companies.`);

    // Show first result if available
    if (results.length > 0) {
      const firstCompany = results[0];
      const name = firstCompany.values?.name?.[0]?.value || 'Unnamed';
      console.log(
        `First result: ${name} (ID: ${firstCompany.id?.record_id || 'unknown'})`
      );
    }

    return true;
  } catch (error) {
    console.error('ERROR:', error.message);

    // Show full error details
    if (error.stack) {
      console.error('----- Full Error Details -----');
      console.error(error);
    }

    return false;
  }
}

// Sequentially run valid test cases
async function runValidTests() {
  console.log('\n===== RUNNING VALID TEST CASES =====');

  for (const testCase of validFilters) {
    await testSearch(testCase);
  }
}

// Sequentially run invalid test cases
async function runInvalidTests() {
  console.log('\n===== RUNNING INVALID TEST CASES =====');

  for (const testCase of invalidFilters) {
    await testSearch(testCase);
  }
}

// Run all tests
async function runAllTests() {
  try {
    console.log('Testing advanced-search-companies fix for Issue #182');
    await runValidTests();
    await runInvalidTests();
    console.log('\n===== TESTS COMPLETED =====');
  } catch (error) {
    console.error('Test suite error:', error);
  }
}

// Run everything
runAllTests();
