// Final test of the enhanced error message through all layers
import { initializeAttioClient } from './dist/api/attio-client.js';
import { getAttioClient } from './dist/api/attio-client.js';

// Initialize API client
process.env.ATTIO_API_KEY = '16d7c9ca-9b9d-4ad5-a3e9-cfdcbcf08b3f';
initializeAttioClient(process.env.ATTIO_API_KEY);

async function testEnhancedError() {
  try {
    const api = getAttioClient();
    await api.post('/objects/companies/records/query', {
      filters: {
        filters: [
          {
            attribute: {
              slug: 'type_persona', // This will be the translated value
            },
            condition: 'equals',
            value: 'Aesthetics', // Invalid value that should trigger enhancement
          },
        ],
        matchAny: false,
      },
      limit: 20,
      offset: 0,
    });
  } catch (error) {
    console.error('\n===== Error caught at client level =====');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    if (error.response?.data) {
      console.error(
        'Response data:',
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

testEnhancedError().catch(console.error);
