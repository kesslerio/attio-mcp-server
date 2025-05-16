import { updateCompany, getCompanyDetails } from '../dist/objects/companies.js';
import { initializeAttioClient } from '../dist/api/attio-client.js';

// Set debug mode
process.env.NODE_ENV = 'development';

async function testUpdateCompany() {
  try {
    // Initialize the API client
    const apiKey = process.env.ATTIO_API_KEY;
    if (!apiKey) {
      throw new Error('ATTIO_API_KEY environment variable is required');
    }
    initializeAttioClient(apiKey);
    
    console.log('Testing company update...');
    const companyId = '49b11210-df4c-5246-9eda-2add14964eb4';
    
    // First, get the current company details
    const currentCompany = await getCompanyDetails(companyId);
    console.log('\nCurrent services structure:', JSON.stringify(currentCompany.values?.services, null, 2));
    
    // Look at the structure of a field that has values
    if (currentCompany.values?.type_persona) {
      console.log('\nExample field structure (type_persona):', JSON.stringify(currentCompany.values.type_persona, null, 2));
    }
    
    // Try different update formats
    console.log('\nAttempting updates...');
    
    // Format 1: Simple array (like the validator expects)
    try {
      console.log('\nTrying simple array format...');
      const result = await updateCompany(companyId, {
        services: ['CoolSculpting']
      });
      console.log('Update successful:', result.values?.services);
    } catch (error) {
      console.error('Simple array failed:', error.message);
    }
    
    // Format 2: Structured array (like Attio returns)
    try {
      console.log('\nTrying structured array format...');
      const result = await updateCompany(companyId, {
        services: [{value: 'CoolSculpting'}]
      });
      console.log('Update successful:', result.values?.services);
    } catch (error) {
      console.error('Structured array failed:', error.message);
    }
    
    // Format 3: Single value
    try {
      console.log('\nTrying single value format...');
      const result = await updateCompany(companyId, {
        services: 'CoolSculpting'
      });
      console.log('Update successful:', result.values?.services);
    } catch (error) {
      console.error('Single value failed:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testUpdateCompany();