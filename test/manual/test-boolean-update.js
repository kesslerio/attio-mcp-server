/**
 * Manual test for boolean attribute updates
 * To run: node test/manual/test-boolean-update.js
 * 
 * Requires ATTIO_API_KEY environment variable to be set
 */
import { updateCompanyAttribute } from '../../src/objects/companies/basic.js';
import { convertToBoolean } from '../../src/utils/attribute-mapping/attribute-mappers.js';

// Set the API key (replace with your own or use environment variable)
process.env.ATTIO_API_KEY = process.env.ATTIO_API_KEY || '';

// Simple test for convertToBoolean function
function testConvertToBoolean() {
  console.log('Testing convertToBoolean function:');
  
  // Test truthy values
  ['true', 'TRUE', 'yes', 'YES', 'y', 'Y', '1'].forEach(value => {
    console.log(`- Converting '${value}' → ${convertToBoolean(value)}`);
  });
  
  // Test falsy values
  ['false', 'FALSE', 'no', 'NO', 'n', 'N', '0'].forEach(value => {
    console.log(`- Converting '${value}' → ${convertToBoolean(value)}`);
  });
  
  // Test boolean values
  console.log(`- Converting true → ${convertToBoolean(true)}`);
  console.log(`- Converting false → ${convertToBoolean(false)}`);
  
  // Test numeric values
  console.log(`- Converting 1 → ${convertToBoolean(1)}`);
  console.log(`- Converting 0 → ${convertToBoolean(0)}`);
}

// Test updating a company with string boolean values
async function testCompanyUpdate() {
  // First make sure we have an API key
  if (!process.env.ATTIO_API_KEY) {
    console.error('ATTIO_API_KEY environment variable is required to run the test');
    process.exit(1);
  }
  
  console.log('\nTesting company boolean attribute update:');
  
  try {
    // Replace with a real company ID from your Attio workspace
    const companyId = process.argv[2];
    
    if (!companyId) {
      console.error('Please provide a company ID as the first argument');
      process.exit(1);
    }
    
    // Choose a boolean field to update and a string value
    const fieldName = process.argv[3] || 'uses_body_composition'; 
    const stringValue = process.argv[4] || 'false';
    
    console.log(`Updating company ${companyId}:`);
    console.log(`- Setting ${fieldName} = '${stringValue}'`);
    
    // Update the company
    const result = await updateCompanyAttribute(companyId, fieldName, stringValue);
    
    // Display results
    console.log('Update successful!');
    console.log(`- Company name: ${result.values?.name?.[0]?.value || 'Unknown'}`);
    console.log(`- Updated ${fieldName} value:`, result.values?.[fieldName]);
    
  } catch (error) {
    console.error('Error updating company:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Run the tests
(async () => {
  // Always run the simple test
  testConvertToBoolean();
  
  // Only run the API test if arguments are provided
  if (process.argv.length > 2) {
    await testCompanyUpdate();
  } else {
    console.log('\nSkipping company update test. To run it, provide a company ID:');
    console.log('node test/manual/test-boolean-update.js COMPANY_ID [FIELD_NAME] [STRING_VALUE]');
  }
})();