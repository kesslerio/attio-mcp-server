/**
 * Debug script to test Attio API behavior with non-existent records
 */
import { getAttioClient, initializeAttioClient } from './dist/api/attio-client.js';

async function testNonExistentRecords() {
  // Initialize the client first
  initializeAttioClient({ apiKey: process.env.ATTIO_API_KEY });
  const client = getAttioClient();
  const nonExistentId = 'non-existent-id-12345';

  console.log('Testing Attio API behavior with non-existent records...\n');

  // Test 1: Update non-existent company
  console.log('1. Testing UPDATE on non-existent company record:');
  try {
    const updateResponse = await client.patch(`/objects/companies/records/${nonExistentId}`, {
      data: {
        values: {
          description: 'This should fail'
        }
      }
    });
    console.log('UPDATE SUCCESS:', JSON.stringify(updateResponse.data, null, 2));
  } catch (error) {
    console.log('UPDATE ERROR:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }

  console.log('\n2. Testing DELETE on non-existent company record:');
  try {
    const deleteResponse = await client.delete(`/objects/companies/records/${nonExistentId}`);
    console.log('DELETE SUCCESS:', JSON.stringify(deleteResponse.data, null, 2));
  } catch (error) {
    console.log('DELETE ERROR:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }

  // Test 3: Get non-existent company (baseline)
  console.log('\n3. Testing GET on non-existent company record (baseline):');
  try {
    const getResponse = await client.get(`/objects/companies/records/${nonExistentId}`);
    console.log('GET SUCCESS:', JSON.stringify(getResponse.data, null, 2));
  } catch (error) {
    console.log('GET ERROR:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

testNonExistentRecords().catch(console.error);