import axios from 'axios';

async function testDirectAPI() {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    console.error('Please set ATTIO_API_KEY environment variable');
    process.exit(1);
  }
  
  const companyId = '49b11210-df4c-5246-9eda-2add14964eb4';
  
  try {
    // First, let's try to get the company to understand the structure
    console.log('Fetching company details...');
    const getResponse = await axios.get(
      `https://api.attio.com/v2/objects/companies/records/${companyId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Current services value:', JSON.stringify(getResponse.data.data.values.services, null, 2));
    console.log('Type persona value:', JSON.stringify(getResponse.data.data.values.type_persona, null, 2));
    
    // Now let's try to update
    console.log('\nAttempting update with simple array...');
    try {
      const updateResponse = await axios.patch(
        `https://api.attio.com/v2/objects/companies/records/${companyId}`,
        {
          attributes: {
            services: ['CoolSculpting']
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Update successful:', updateResponse.data);
    } catch (error) {
      console.error('Update failed:');
      console.error('Status:', error.response?.status);
      console.error('Response:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // Try with structured format
    console.log('\nAttempting update with structured array...');
    try {
      const updateResponse = await axios.patch(
        `https://api.attio.com/v2/objects/companies/records/${companyId}`,
        {
          attributes: {
            services: [{value: 'CoolSculpting'}]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Update successful:', updateResponse.data);
    } catch (error) {
      console.error('Update failed:');
      console.error('Status:', error.response?.status);
      console.error('Response:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDirectAPI();