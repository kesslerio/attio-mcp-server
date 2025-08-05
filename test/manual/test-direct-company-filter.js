/**
 * Test script to validate the new direct company filter approach
 */

import { advancedSearchPeople } from '../../dist/objects/people/index.js';

// Set up test environment
process.env.ATTIO_API_KEY = process.env.ATTIO_API_KEY || '';

async function testDirectCompanyFilter() {
  console.log('Testing direct company filter approach...\n');

  try {
    // Test 1: Direct filter on companies attribute
    console.log('1. Using direct companies attribute filter...');
    const directFilter = {
      filters: [
        {
          attribute: { slug: 'companies' },
          condition: 'equals',
          value: { record_id: '0c472146-9c7b-5fde-96cd-5df8e5cf9575' },
        },
      ],
    };

    console.log('Filter:', JSON.stringify(directFilter, null, 2));

    const results = await advancedSearchPeople(directFilter);
    console.log(`Found ${results.length} people affiliated with the company`);

    if (results.length > 0) {
      console.log('\nPeople found:');
      results.forEach((person) => {
        const name = person.values?.name?.[0]?.value || 'Unnamed';
        const id = person.id?.record_id || 'unknown';
        console.log(`- ${name} (ID: ${id})`);
      });
    }

    // Test 2: MCP tool format transformation
    console.log('\n2. Testing MCP tool format transformation...');
    const mcpFilter = {
      companyFilter: {
        filters: [
          {
            attribute: { slug: 'companies.id' },
            condition: 'equals',
            value: { record_id: '0c472146-9c7b-5fde-96cd-5df8e5cf9575' },
          },
        ],
      },
    };

    // Simulate the transformation that happens in the handler
    const transformedFilter = {
      filters: mcpFilter.companyFilter.filters.map((filter) => {
        if (filter.attribute?.slug === 'companies.id') {
          return {
            attribute: { slug: 'companies' },
            condition: filter.condition || 'equals',
            value: filter.value,
          };
        }
        return filter;
      }),
    };

    console.log(
      'Transformed filter:',
      JSON.stringify(transformedFilter, null, 2)
    );

    const results2 = await advancedSearchPeople(transformedFilter);
    console.log(`Found ${results2.length} people with transformed filter`);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test if API key is available
if (process.env.ATTIO_API_KEY) {
  testDirectCompanyFilter();
} else {
  console.error(
    'Please set ATTIO_API_KEY environment variable to run this test'
  );
}
