import { getCompanyFields } from('../dist/objects/companies');
import { initializeAttioClient } from('../dist/api/attio-client');

// Set debug mode
process.env.NODE_ENV = 'development';

async function testFieldSelection() {
  try {
    // Initialize the API client
    const apiKey = process.env.ATTIO_API_KEY;
    if (!apiKey) {
      throw new Error('ATTIO_API_KEY environment variable is required');
    }
    initializeAttioClient(apiKey);
    
    console.log('Testing field selection...');
    const companyId = '81e1606e-6fb7-4438-ae5f-4b60b72353ae';
    const fields = ['name', 'services', 'products'];
    
    console.log(`Requesting fields: ${fields.join(', ')}`);
    const result = await getCompanyFields(companyId, fields);
    
    console.log('\nResult:');
    console.log(`Total fields returned: ${Object.keys(result.values || {}).length}`);
    console.log('Fields:', Object.keys(result.values || {}));
    
    // Show the actual values
    console.log('\nValues:');
    for (const [key, value] of Object.entries(result.values || {})) {
      console.log(`${key}:`, JSON.stringify(value, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFieldSelection();