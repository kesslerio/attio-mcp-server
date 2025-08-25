/**
 * Debug script to see what successful responses look like in E2E environment
 */
import * from '../../dist/handlers/tools/dispatcher.js';
import * from '../../dist/api/attio-client.js';

async function debugSuccessfulResponse() {
  // Initialize the client like the E2E tests do
  const config = {
    api: {
      key: process.env.ATTIO_API_KEY
    }
  };
  
  initializeAttioClient({ apiKey: config.api.key });
  
  // Test update on non-existent record
  console.log('Testing UPDATE on non-existent record...\n');
  try {
    const request = {
      method: 'tools/call',
      params: {
        name: 'update-record',
        arguments: {
          resource_type: 'companies',
          record_id: 'non-existent-id-12345',
          record_data: {
            values: {
              description: 'This should work gracefully'
            }
          }
        }
      }
    };
    
    const response = await executeToolRequest(request);
    console.log('UPDATE Response:');
    console.log('isError:', response.isError);
    console.log('has content:', !!response.content);
    console.log('content length:', response.content?.length);
    
    if (response.content?.[0]) {
      console.log('content[0].text preview:', response.content[0].text?.substring(0, 300));
      console.log('text includes "not found":', response.content[0].text?.includes('not found'));
      console.log('text includes "Non-existent":', response.content[0].text?.includes('Non-existent'));
      console.log('text includes "does not exist":', response.content[0].text?.includes('does not exist'));
    }
    
    console.log('\nFull response structure:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
  
  // Test delete on non-existent record
  console.log('\n' + '='.repeat(50));
  console.log('Testing DELETE on non-existent record...\n');
  
  try {
    const request = {
      method: 'tools/call',
      params: {
        name: 'delete-record',
        arguments: {
          resource_type: 'companies',
          record_id: 'non-existent-id-12345'
        }
      }
    };
    
    const response = await executeToolRequest(request);
    console.log('DELETE Response:');
    console.log('isError:', response.isError);
    console.log('has content:', !!response.content);
    
    if (response.content?.[0]) {
      console.log('content[0].text preview:', response.content[0].text?.substring(0, 300));
    }
    
    console.log('\nFull response structure:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('DELETE ERROR:', error.message);
  }
}

debugSuccessfulResponse().catch(console.error);