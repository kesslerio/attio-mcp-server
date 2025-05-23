import axios from 'axios';

async function testFullStructure() {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    throw new Error('ATTIO_API_KEY environment variable is required');
  }

  const companyId = '49b11210-df4c-5246-9eda-2add14964eb4';

  try {
    // First get the company to understand the structure
    const getResponse = await axios.get(
      `https://api.attio.com/v2/objects/companies/records/${companyId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Current full company structure:');
    const currentData = getResponse.data.data;
    console.log('ID structure:', JSON.stringify(currentData.id, null, 2));
    console.log('Values structure (first few fields):');
    Object.keys(currentData.values)
      .slice(0, 5)
      .forEach((key) => {
        console.log(
          `${key}:`,
          JSON.stringify(currentData.values[key], null, 2)
        );
      });

    // Try updating with the same structure the API returns
    console.log('\nTrying update with full value structure...');
    try {
      const updateData = {
        attributes: {
          services: [
            {
              value: 'CoolSculpting',
            },
          ],
        },
      };

      console.log('Sending:', JSON.stringify(updateData, null, 2));

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
    } catch (updateError) {
      console.error('Update failed:', updateError.response?.data);

      // Try with a different structure
      console.log('\nTrying with values wrapper...');
      try {
        const updateData2 = {
          values: {
            services: ['CoolSculpting'],
          },
        };

        console.log('Sending:', JSON.stringify(updateData2, null, 2));

        const updateResponse2 = await axios.patch(
          `https://api.attio.com/v2/objects/companies/records/${companyId}`,
          updateData2,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Update successful!');
      } catch (updateError2) {
        console.error('Update failed again:', updateError2.response?.data);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFullStructure();
