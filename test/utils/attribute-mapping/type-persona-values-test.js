/**
 * Test to find valid type_persona values
 */
import { advancedSearchCompanies } from './dist/objects/companies.js';
import { FilterConditionType } from './dist/types/attio.js';

async function testTypePersonaValues() {
  console.log('=== Testing type_persona values ===\n');
  
  // Test 1: Try with "Medical Spa/Aesthetics"
  console.log('Test 1: Using "Medical Spa/Aesthetics"');
  try {
    const filter1 = {
      filters: [{
        attribute: { slug: "type_persona" },
        condition: FilterConditionType.EQUALS,
        value: "Medical Spa/Aesthetics"
      }]
    };
    
    const results1 = await advancedSearchCompanies(filter1);
    console.log(`✅ Success! Found ${results1.length} companies`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  // Test 2: Try with "Aesthetics" alone
  console.log('\nTest 2: Using "Aesthetics" alone');
  try {
    const filter2 = {
      filters: [{
        attribute: { slug: "type_persona" },
        condition: FilterConditionType.EQUALS,
        value: "Aesthetics"
      }]
    };
    
    const results2 = await advancedSearchCompanies(filter2);
    console.log(`✅ Success! Found ${results2.length} companies`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  // Test 3: Try a contains search
  console.log('\nTest 3: Using CONTAINS with "Aesthetics"');
  try {
    const filter3 = {
      filters: [{
        attribute: { slug: "type_persona" },
        condition: FilterConditionType.CONTAINS,
        value: "Aesthetics"
      }]
    };
    
    const results3 = await advancedSearchCompanies(filter3);
    console.log(`✅ Success! Found ${results3.length} companies`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  // Test 4: Try other known values
  console.log('\nTest 4: Using "Plastic Surgeon"');
  try {
    const filter4 = {
      filters: [{
        attribute: { slug: "type_persona" },
        condition: FilterConditionType.EQUALS,
        value: "Plastic Surgeon"
      }]
    };
    
    const results4 = await advancedSearchCompanies(filter4);
    console.log(`✅ Success! Found ${results4.length} companies`);
    
    // If successful, show a few examples
    if (results4.length > 0) {
      console.log('Example companies:');
      results4.slice(0, 3).forEach(company => {
        console.log(`- ${company.values?.name?.[0]?.value || 'Unnamed'}`);
      });
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Initialize and run
async function main() {
  const { initializeAttioClient } = await import('./dist/api/attio-client.js');
  await initializeAttioClient(process.env.ATTIO_API_KEY);
  await testTypePersonaValues();
}

main().catch(console.error);