/**
 * Test what the actual response looks like for non-existent record operations
 */
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';

async function testResponse() {
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
              description: 'This should fail',
            },
          },
        },
      },
    };

    const response = await executeToolRequest(request);
    console.log('Response object structure:');
    console.log('isError:', response.isError);
    console.log('content type:', typeof response.content);
    console.log('content length:', response.content?.length);

    if (response.content && response.content[0]) {
      console.log('content[0] type:', typeof response.content[0]);
      console.log(
        'content[0].text:',
        response.content[0].text?.substring(0, 200) + '...'
      );
      console.log(
        'content[0].text includes "not found":',
        response.content[0].text?.includes('not found')
      );
      console.log(
        'content[0].text includes "error":',
        response.content[0].text?.toLowerCase().includes('error')
      );
    }

    console.log('\nFull response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Caught error:', error.message);
  }
}

testResponse().catch(console.error);
