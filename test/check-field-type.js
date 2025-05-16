import axios from 'axios';

async function checkFieldType() {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    throw new Error('ATTIO_API_KEY environment variable is required');
  }
  
  try {
    // First, let's get the object configuration to understand the attributes
    console.log('Fetching object configuration...');
    const objectResponse = await axios.get(
      'https://api.attio.com/v2/objects/companies',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\nLooking for services attribute...');
    const attributes = objectResponse.data.data.attributes;
    const servicesAttribute = attributes.find(attr => attr.attribute_slug === 'services');
    
    if (servicesAttribute) {
      console.log('Services attribute configuration:');
      console.log(JSON.stringify(servicesAttribute, null, 2));
    } else {
      console.log('Services attribute not found in standard attributes');
    }
    
    // Let's also check if there are custom fields
    console.log('\nAll attributes:');
    attributes.forEach(attr => {
      if (attr.is_custom || attr.attribute_slug.includes('service')) {
        console.log(`- ${attr.attribute_slug} (${attr.attribute_type})`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkFieldType();