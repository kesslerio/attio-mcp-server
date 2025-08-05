/**
 * Manual test to verify the people-company search fix works correctly
 * This test demonstrates how to properly find people by company affiliation
 */

import { searchCompanies } from '../../dist/objects/companies/index.js';
import { searchPeopleByCompany } from '../../dist/objects/people/index.js';

// Set up test environment
process.env.ATTIO_API_KEY = process.env.ATTIO_API_KEY || '';

async function testSearchPeopleByCompany() {
  console.log('Testing search-people-by-company fix...\n');

  try {
    // First, search for the company
    console.log('1. Searching for Oakwood Precision Medicine company...');
    const companies = await searchCompanies('Oakwood Precision Medicine');
    console.log(`Found ${companies.length} companies`);

    if (companies.length === 0) {
      console.error('No company found with name: Oakwood Precision Medicine');
      return;
    }

    const companyId = companies[0].id?.record_id;
    console.log(`Company ID: ${companyId}\n`);

    // Now search for people by company ID
    console.log('2. Searching for people affiliated with the company...');
    const people = await searchPeopleByCompany(companyId);
    console.log(
      `Found ${people.length} people affiliated with Oakwood Precision Medicine`
    );

    // Display the results
    if (people.length > 0) {
      console.log('\nPeople found:');
      people.forEach((person) => {
        const name = person.values?.name?.[0]?.value || 'Unnamed';
        const id = person.id?.record_id || 'unknown';
        console.log(`- ${name} (ID: ${id})`);
      });
    }

    // Test the MCP tool handler format
    console.log('\n3. Testing MCP tool handler format...');
    const mockCompanyFilter = {
      companyFilter: {
        filters: [
          {
            attribute: { slug: 'companies.id' },
            condition: 'equals',
            value: { record_id: companyId },
          },
        ],
      },
    };

    console.log(
      'Mock MCP request:',
      JSON.stringify(mockCompanyFilter, null, 2)
    );
    console.log(
      '\nThe handler should now correctly extract the company ID and call searchPeopleByCompany.'
    );
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test if API key is available
if (process.env.ATTIO_API_KEY) {
  testSearchPeopleByCompany();
} else {
  console.error(
    'Please set ATTIO_API_KEY environment variable to run this test'
  );
}
