/**
 * Test that updateCompanyAttribute handles null values correctly
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.ATTIO_API_KEY;
const BASE_URL = 'https://api.attio.com/v2';

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

async function testCompanyNullAttribute() {
  try {
    console.log('Testing update-company-attribute with null value...\n');

    // First, find a test company
    const searchResponse = await axios.post(
      `${BASE_URL}/objects/companies/records/query`,
      { filter: { name: { $contains: 'test' } }, limit: 1 },
      { headers }
    );

    if (searchResponse.data.data.length === 0) {
      console.log('No test company found. Creating one...');

      // Create a test company
      const createResponse = await axios.post(
        `${BASE_URL}/objects/companies/records`,
        {
          data: {
            values: {
              name: [{ value: 'Test Company for Null Attribute' }],
              body_contouring: 'some existing value',
            },
          },
        },
        { headers }
      );

      const companyId = createResponse.data.data.id.record_id;
      console.log(`Created test company with ID: ${companyId}\n`);

      // Now test setting an attribute to null
      console.log('Testing setting body_contouring to null...');
      const updateResponse = await axios.patch(
        `${BASE_URL}/objects/companies/records/${companyId}`,
        {
          data: {
            values: {
              body_contouring: null,
            },
          },
        },
        { headers }
      );

      console.log('Update successful! Response:');
      console.log(JSON.stringify(updateResponse.data, null, 2));

      // Verify the update
      const verifyResponse = await axios.get(
        `${BASE_URL}/objects/companies/records/${companyId}`,
        { headers }
      );

      const bodyContouringValue =
        verifyResponse.data.data.values.body_contouring;
      console.log(
        `\nVerification - body_contouring value: ${JSON.stringify(
          bodyContouringValue
        )}`
      );

      if (
        bodyContouringValue === null ||
        bodyContouringValue === undefined ||
        (Array.isArray(bodyContouringValue) && bodyContouringValue.length === 0)
      ) {
        console.log('✅ SUCCESS: Attribute was successfully set to null/empty');
      } else {
        console.log('❌ FAILED: Attribute still has a value');
      }

      // Clean up - delete the test company
      await axios.delete(`${BASE_URL}/objects/companies/records/${companyId}`, {
        headers,
      });
      console.log('\nTest company deleted.');
    } else {
      // Use existing company
      const company = searchResponse.data.data[0];
      const companyId = company.id.record_id;
      console.log(
        `Using existing company: ${company.values.name[0].value} (ID: ${companyId})\n`
      );

      // Test setting an attribute to null
      console.log('Testing setting body_contouring to null...');
      try {
        const updateResponse = await axios.patch(
          `${BASE_URL}/objects/companies/records/${companyId}`,
          {
            data: {
              values: {
                body_contouring: null,
              },
            },
          },
          { headers }
        );

        console.log('Update successful! Response:');
        console.log(JSON.stringify(updateResponse.data, null, 2));
        console.log('✅ SUCCESS: Null value accepted');
      } catch (error) {
        console.error('❌ FAILED: Error updating attribute with null');
        console.error(error.response?.data || error.message);
      }
    }
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testCompanyNullAttribute();
