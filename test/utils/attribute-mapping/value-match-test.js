// Test script to check value matching error enhancement

import { initializeAttioClient } from './dist/api/attio-client.js';
import { advancedSearchPeople } from './dist/objects/people.js';

process.env.ATTIO_API_KEY = '16d7c9ca-9b9d-4ad5-a3e9-cfdcbcf08b3f';

// Initialize the client
initializeAttioClient();

const filters = {
  filters: [
    {
      attribute: {
        slug: 'b2b_segment',
      },
      condition: 'equals',
      value: 'Aesthetics',
    },
  ],
  matchAny: false,
};

console.log(
  'Testing value matching with filter:',
  JSON.stringify(filters, null, 2)
);

try {
  // The advancedSearch error handler should be triggered
  const results = await advancedSearchPeople(filters, 20, 0);
  console.log('Results:', results);
} catch (error) {
  console.log('Caught error:', error);
  console.error('Error message:', error.message);
  console.log('Error stack:', error.stack);
  if (error.response?.data) {
    console.log(
      'Error response data:',
      JSON.stringify(error.response.data, null, 2)
    );
  }
}
