import { initializeAttioClient } from '../../dist/api/attio-client.js';
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';

// This test file verifies the fixed search-people-by-company tool functionality
// It requires ATTIO_API_KEY to be set in the environment

async function testSearchPeopleByCompany() {
  console.log('Testing search-people-by-company tool with fix...');

  // Initialize the Attio client first
  if (!process.env.ATTIO_API_KEY) {
    console.error('Please set ATTIO_API_KEY environment variable');
    process.exit(1);
  }

  console.log('Initializing Attio client...');
  initializeAttioClient(process.env.ATTIO_API_KEY);

  // Test with company name
  const nameRequest = {
    method: 'tools/call',
    params: {
      name: 'search-people-by-company',
      arguments: {
        companyFilter: {
          filters: [
            {
              attribute: { slug: 'companies.name' },
              condition: 'equals',
              value: 'Oakwood Precision Medicine',
            },
          ],
          matchAny: false,
        },
      },
    },
  };

  try {
    console.log('\nTesting company name filter...');
    const result = await executeToolRequest(nameRequest);
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Stack:', error.stack);
  }

  // Test with company ID if we have one
  const idRequest = {
    method: 'tools/call',
    params: {
      name: 'search-people-by-company',
      arguments: {
        companyFilter: {
          filters: [
            {
              attribute: { slug: 'companies.id' },
              condition: 'equals',
              value: { record_id: '0c472146-9c7b-5fde-96cd-5df8e5cf9575' },
            },
          ],
          matchAny: false,
        },
      },
    },
  };

  try {
    console.log('\nTesting company ID filter...');
    const result = await executeToolRequest(idRequest);
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Stack:', error.stack);
  }
}

testSearchPeopleByCompany();
