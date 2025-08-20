// Direct test of error enhancement
import { initializeAttioClient } from './dist/api/attio-client.js';
import { makeApiRequest } from './dist/api/attio-operations.js';
import { interceptAndEnhanceError } from './dist/handlers/error-interceptor.js';

// Initialize API client
process.env.ATTIO_API_KEY = '16d7c9ca-9b9d-4ad5-a3e9-cfdcbcf08b3f';
initializeAttioClient();

async function testError() {
  try {
    // Make a request that will fail with invalid value
    await makeApiRequest('/v2/objects/people/records/query', 'POST', {
      filters: {
        filters: [
          {
            attribute: {
              slug: 'type_persona', // Using the actual Attio field directly
            },
            condition: 'equals',
            value: 'Aesthetics', // Invalid value
          },
        ],
        matchAny: false,
      },
      limit: 20,
      offset: 0,
    });
  } catch (error) {
    console.error('===== Error caught =====');
    console.error('Original error message:', error.message);
    console.error('Error response data:', error.response?.data);

    // Try to enhance the error
    console.error('\n===== Attempting to enhance error =====');
    const enhancedResult = interceptAndEnhanceError(
      error,
      '/objects/people/records/query',
      'POST'
    );

    console.error('\n===== Enhanced result =====');
    console.error(JSON.stringify(enhancedResult, null, 2));
  }
}

testError().catch(console.error);
