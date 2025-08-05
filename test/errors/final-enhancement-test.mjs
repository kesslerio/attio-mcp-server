// Final test of the enhanced error message through all layers
import {
  getAttioClient,
  initializeAttioClient,
} from './dist/api/attio-client.js';

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
    console.log('\n===== Error caught at client level =====');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    if (error.response?.data) {
      console.log(
        'Response data:',
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

testEnhancedError().catch(console.error);
