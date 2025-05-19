import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';

// This test file verifies the search-people-by-company tool functionality
// It requires ATTIO_API_KEY to be set in the environment

async function testSearchPeopleByCompany() {
  console.log('Testing search-people-by-company tool...');
  
  const request = {
    method: 'tools/call',
    params: {
      name: 'search-people-by-company',
      arguments: {
        companyFilter: {
          filters: [{
            attribute: { slug: 'companies.name' },
            condition: 'equals',
            value: 'Oakwood Precision Medicine'
          }],
          matchAny: false
        }
      }
    }
  };

  try {
    const result = await executeToolRequest(request);
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Stack:', error.stack);
  }
}

// Check if API key is set
if (!process.env.ATTIO_API_KEY) {
  console.error('Please set ATTIO_API_KEY environment variable');
  process.exit(1);
}

testSearchPeopleByCompany();