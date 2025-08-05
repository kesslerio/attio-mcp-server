import { formatAllAttributes } from '../dist/api/attribute-types.js';

// Test the formatAllAttributes function with null values
async function testFormatAllAttributes() {
  console.log('Testing formatAllAttributes with null value...');

  const attributes = {
    body_contouring: null,
    name: 'Test Company',
    website: 'https://example.com',
  };

  try {
    const formatted = await formatAllAttributes('companies', attributes);
    console.log('Original attributes:', JSON.stringify(attributes, null, 2));
    console.log('Formatted attributes:', JSON.stringify(formatted, null, 2));

    if (Object.hasOwn(formatted, 'body_contouring')) {
      console.log('body_contouring is present in formatted attributes');
    } else {
      console.log(
        'ISSUE FOUND: null value for body_contouring was filtered out!'
      );
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testFormatAllAttributes();
