import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ATTIO_API_KEY = process.env.ATTIO_API_KEY;
const BASE_URL = 'https://api.attio.com/v2';

async function getAttributeSchema(objectSlug: string, attributeSlug: string) {
  if (!ATTIO_API_KEY) {
    console.error('Error: ATTIO_API_KEY is not set in your environment.');
    return;
  }

  const url = `${BASE_URL}/objects/${objectSlug}/attributes/${attributeSlug}`;
  console.log(`Querying: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${ATTIO_API_KEY}`,
      },
    });

    console.log('\n--- Attribute Schema ---');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data?.data?.type === 'select' || response.data?.data?.type === 'multiselect') {
      const optionsUrl = `${url}/options`;
      console.log(`\nQuerying options: ${optionsUrl}`);
      const optionsResponse = await axios.get(optionsUrl, {
        headers: {
          Authorization: `Bearer ${ATTIO_API_KEY}`,
        },
      });
      console.log('\n--- Available Options ---');
      console.log(JSON.stringify(optionsResponse.data, null, 2));
    }

  } catch (error: any) {
    console.error('\n--- Error ---');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

const object = process.argv[2];
const attribute = process.argv[3];

if (!object || !attribute) {
  console.log('Usage: ts-node scripts/debug/debug-attribute-schema.ts <object_slug> <attribute_slug>');
  console.log('Example: ts-node scripts/debug/debug-attribute-schema.ts companies referrer');
} else {
  getAttributeSchema(object, attribute);
}
