/**
 * Quick test script for advanced list filtering
 */
const { getListEntries } = require('../dist/objects/lists');
const { transformFiltersToApiFormat } = require('../dist/utils/record-utils');

// Replace with your actual list ID
const TEST_LIST_ID = 'list_01a1a1a1a1a1a1a1a1a1a1a1';

// Test the filter transformation
function testFilterTransformation() {
  console.log('Testing filter transformation...');

  // Basic single filter
  const basicFilter = {
    filters: [
      {
        attribute: { slug: 'stage' },
        condition: 'equals',
        value: 'discovery',
      },
    ],
  };

  // Complex filter with multiple conditions (OR)
  const complexOrFilter = {
    filters: [
      {
        attribute: { slug: 'stage' },
        condition: 'equals',
        value: 'discovery',
        logicalOperator: 'or',
      },
      {
        attribute: { slug: 'stage' },
        condition: 'equals',
        value: 'proposal',
      },
    ],
    matchAny: true, // OR logic between filters
  };

  // Complex filter with multiple conditions (AND)
  const complexAndFilter = {
    filters: [
      {
        attribute: { slug: 'stage' },
        condition: 'equals',
        value: 'discovery',
      },
      {
        attribute: { slug: 'value' },
        condition: 'greater_than',
        value: 10_000,
      },
    ],
    matchAny: false, // AND logic between filters (default)
  };

  // Transform filters to API format
  console.log('Basic filter transformed:');
  console.log(
    JSON.stringify(transformFiltersToApiFormat(basicFilter), null, 2)
  );

  console.log('\nComplex OR filter transformed:');
  console.log(
    JSON.stringify(transformFiltersToApiFormat(complexOrFilter), null, 2)
  );

  console.log('\nComplex AND filter transformed:');
  console.log(
    JSON.stringify(transformFiltersToApiFormat(complexAndFilter), null, 2)
  );
}

// Uncomment and modify this function to test actual API calls
/* 
async function testActualApi() {
  try {
    // Test basic filter
    const basicFilter = {
      filters: [
        {
          attribute: { slug: "stage" },
          condition: "equals",
          value: "discovery"
        }
      ]
    };
    
    console.log("Fetching list entries with basic filter...");
    const entries = await getListEntries(TEST_LIST_ID, 10, 0, basicFilter);
    console.log(`Found ${entries.length} entries`);
    
    // Log record IDs of found entries
    if (entries.length > 0) {
      entries.forEach((entry, index) => {
        console.log(`Entry ${index + 1}: Record ID = ${entry.record_id || 'Unknown'}`);
      });
    }
  } catch (error) {
    console.error("Error testing API:", error.message);
  }
}

// Run the actual API test
testActualApi();
*/

// Run the transformation test
testFilterTransformation();
