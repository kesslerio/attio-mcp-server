/**
 * Test script to verify update-company-attribute works with null values
 * This replicates the exact scenario from the Claude Desktop chat
 */

import dotenv from 'dotenv';
import {
  getAttioClient,
  initializeAttioClient,
} from '../dist/api/attio-client.js';
import {
  updateCompany,
  updateCompanyAttribute,
} from '../dist/objects/companies.js';

dotenv.config();

// Initialize the API client
initializeAttioClient(process.env.ATTIO_API_KEY);

// Test company ID from the Claude Desktop chat
const TEST_COMPANY_ID = '7ac2ddbc-3ad2-4ef3-a977-19a191adc2ed';
const ATTRIBUTE_NAME = 'body_contouring';

async function testUpdateCompanyAttributeNull() {
  console.log('Testing update-company-attribute with null value...\n');

  try {
    // Test 1: Update using updateCompanyAttribute directly
    console.log(
      'Test 1: Using updateCompanyAttribute directly with null value...'
    );
    try {
      const result1 = await updateCompanyAttribute(
        TEST_COMPANY_ID,
        ATTRIBUTE_NAME,
        null
      );
      console.log('✅ SUCCESS: updateCompanyAttribute accepted null value');
      console.log(
        'Result:',
        JSON.stringify(result1.values[ATTRIBUTE_NAME], null, 2)
      );
    } catch (error) {
      console.error('❌ FAILED: updateCompanyAttribute with null');
      console.error('Error:', error.message);
      if (error.response?.data) {
        console.error(
          'API Error:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
    }

    console.log('\n---\n');

    // Test 2: Update using updateCompany (workaround method)
    console.log(
      'Test 2: Using updateCompany with attributes object containing null...'
    );
    try {
      const result2 = await updateCompany(TEST_COMPANY_ID, {
        [ATTRIBUTE_NAME]: null,
      });
      console.log('✅ SUCCESS: updateCompany accepted null value');
      console.log(
        'Result:',
        JSON.stringify(result2.values[ATTRIBUTE_NAME], null, 2)
      );
    } catch (error) {
      console.error('❌ FAILED: updateCompany with null');
      console.error('Error:', error.message);
      if (error.response?.data) {
        console.error(
          'API Error:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
    }

    console.log('\n---\n');

    // Test 3: Set the attribute to a value first, then clear it
    console.log('Test 3: Set value then clear with null...');
    try {
      // First set a value
      console.log('Setting initial value...');
      await updateCompanyAttribute(
        TEST_COMPANY_ID,
        ATTRIBUTE_NAME,
        'test value'
      );
      console.log('Value set successfully');

      // Then clear with null
      console.log('Clearing with null...');
      const clearResult = await updateCompanyAttribute(
        TEST_COMPANY_ID,
        ATTRIBUTE_NAME,
        null
      );
      console.log('✅ SUCCESS: Cleared attribute with null');
      console.log(
        'Result:',
        JSON.stringify(clearResult.values[ATTRIBUTE_NAME], null, 2)
      );
    } catch (error) {
      console.error('❌ FAILED: Set then clear with null');
      console.error('Error:', error.message);
      if (error.response?.data) {
        console.error(
          'API Error:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
    }

    console.log('\n---\n');

    // Test 4: Direct API call to verify raw API behavior
    console.log('Test 4: Direct API call to verify API accepts null...');
    try {
      const api = getAttioClient();
      const response = await api.patch(
        `/objects/companies/records/${TEST_COMPANY_ID}`,
        {
          data: {
            values: {
              [ATTRIBUTE_NAME]: null,
            },
          },
        }
      );
      console.log('✅ SUCCESS: Direct API call with null');
      console.log(
        'Response:',
        JSON.stringify(response.data.data.values[ATTRIBUTE_NAME], null, 2)
      );
    } catch (error) {
      console.error('❌ FAILED: Direct API call with null');
      console.error('Error:', error.message);
      if (error.response?.data) {
        console.error(
          'API Error:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
    }
  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
}

// Run the test
testUpdateCompanyAttributeNull();
