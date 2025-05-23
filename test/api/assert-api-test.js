import axios from 'axios';

async function testAssertAPI() {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    throw new Error('ATTIO_API_KEY environment variable is required');
  }

  const companyId = '49b11210-df4c-5246-9eda-2add14964eb4';

  try {
    // First try the standard PATCH endpoint
    console.log('Testing PATCH endpoint...');
    try {
      const patchData = {
        attributes: {
          services: ['CoolSculpting'],
        },
      };

      const patchResponse = await axios.patch(
        `https://api.attio.com/v2/objects/companies/records/${companyId}`,
        patchData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('PATCH successful:', patchResponse.data);
    } catch (patchError) {
      console.error('PATCH failed:', patchError.response?.data);

      // Try PUT endpoint (overwrite)
      console.log('\nTrying PUT endpoint...');
      try {
        const putData = {
          attributes: {
            services: ['CoolSculpting'],
          },
        };

        const putResponse = await axios.put(
          `https://api.attio.com/v2/objects/companies/records/${companyId}`,
          putData,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('PUT successful:', putResponse.data);
      } catch (putError) {
        console.error('PUT failed:', putError.response?.data);

        // Try assert endpoint
        console.log('\nTrying assert endpoint...');
        try {
          const assertData = {
            data: {
              values: {
                services: ['CoolSculpting'],
              },
            },
          };

          const assertResponse = await axios.post(
            'https://api.attio.com/v2/objects/companies/records',
            assertData,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            }
          );

          console.log('Assert successful:', assertResponse.data);
        } catch (assertError) {
          console.error('Assert failed:', assertError.response?.data);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAssertAPI();
