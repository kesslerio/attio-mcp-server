import axios from 'axios';
import { initializeAttioClient } from '../dist/api/attio-client.js';

async function testApiFormat() {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    throw new Error('ATTIO_API_KEY environment variable is required');
  }

  initializeAttioClient(apiKey);

  const companyId = '49b11210-df4c-5246-9eda-2add14964eb4';

  try {
    // First get the company to see current format
    const getResponse = await axios.get(
      `https://api.attio.com/v2/objects/companies/records/${companyId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Current services value:');
    console.log(JSON.stringify(getResponse.data.data.values.services, null, 2));

    // Based on the search results, for multiselect attributes, we need to pass an array of strings
    // Let's try the simple format first
    console.log('\nTrying update with array of strings...');
    try {
      const updateData = {
        attributes: {
          services: ['CoolSculpting'],
        },
      };

      console.log('Sending data:', JSON.stringify(updateData, null, 2));

      const updateResponse = await axios.patch(
        `https://api.attio.com/v2/objects/companies/records/${companyId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Update successful!');
      console.log(
        'New services value:',
        JSON.stringify(updateResponse.data.data.values.services, null, 2)
      );
    } catch (error) {
      console.error('Update failed:');
      console.error('Status:', error.response?.status);
      console.error('Error message:', error.response?.data?.error?.message);
      console.error(
        'Full error:',
        JSON.stringify(error.response?.data, null, 2)
      );

      // If that doesn't work, let's try sending it as a single value
      console.log('\nTrying update with single string value...');
      try {
        const updateData = {
          attributes: {
            services: 'CoolSculpting',
          },
        };

        console.log('Sending data:', JSON.stringify(updateData, null, 2));

        const updateResponse = await axios.patch(
          `https://api.attio.com/v2/objects/companies/records/${companyId}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Update successful!');
        console.log(
          'New services value:',
          JSON.stringify(updateResponse.data.data.values.services, null, 2)
        );
      } catch (error2) {
        console.error('Second attempt also failed:');
        console.error('Status:', error2.response?.status);
        console.error('Error message:', error2.response?.data?.error?.message);
        console.error(
          'Full error:',
          JSON.stringify(error2.response?.data, null, 2)
        );
      }
    }
  } catch (error) {
    console.error('Initial GET failed:', error.message);
  }
}

testApiFormat();
