import {
  getAttioClient,
  initializeAttioClient,
} from '../../dist/api/attio-client.js';
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher.js';
import { searchPeopleByCompany } from '../../dist/objects/people/relationships.js';

/**
 * Comprehensive test for search-people-by-company functionality
 * Tests both the MCP tool handler and the direct function implementation
 */

// Configuration
const TEST_COMPANY_NAME = 'Oakwood Precision Medicine';
const TEST_COMPANY_ID = '0c472146-9c7b-5fde-96cd-5df8e5cf9575';

// Helper function to initialize client
function initializeClient() {
  if (!process.env.ATTIO_API_KEY) {
    console.error('❌ Please set ATTIO_API_KEY environment variable');
    process.exit(1);
  }

  console.log('🔧 Initializing Attio client...');
  initializeAttioClient(process.env.ATTIO_API_KEY);
}

// Test 1: MCP tool with company name filter
async function testToolWithCompanyName() {
  console.log('\n📋 Test 1: MCP tool with company name filter');

  const request = {
    method: 'tools/call',
    params: {
      name: 'search-people-by-company',
      arguments: {
        companyFilter: {
          filters: [
            {
              attribute: { slug: 'companies.name' },
              condition: 'equals',
              value: TEST_COMPANY_NAME,
            },
          ],
          matchAny: false,
        },
      },
    },
  };

  try {
    const result = await executeToolRequest(request);
    console.log('✅ Success:', JSON.stringify(result, null, 2));
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 2: MCP tool with company ID filter
async function testToolWithCompanyId() {
  console.log('\n📋 Test 2: MCP tool with company ID filter');

  const request = {
    method: 'tools/call',
    params: {
      name: 'search-people-by-company',
      arguments: {
        companyFilter: {
          filters: [
            {
              attribute: { slug: 'companies.id' },
              condition: 'equals',
              value: { record_id: TEST_COMPANY_ID },
            },
          ],
          matchAny: false,
        },
      },
    },
  };

  try {
    const result = await executeToolRequest(request);
    console.log('✅ Success:', JSON.stringify(result, null, 2));
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 3: Direct function call
async function testDirectFunction() {
  console.log('\n📋 Test 3: Direct searchPeopleByCompany function');

  try {
    const result = await searchPeopleByCompany(TEST_COMPANY_ID);
    console.log(`✅ Success: Found ${result.length} people`);
    result.forEach((person) => {
      const name = person.values?.name?.[0]?.full_name || 'Unnamed';
      console.log(`  - ${name} (ID: ${person.id?.record_id})`);
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 4: Direct API call for debugging
async function testDirectApiCall() {
  console.log('\n📋 Test 4: Direct API call for debugging');

  try {
    const api = getAttioClient();
    const response = await api.post('/objects/people/records/query', {
      filter: {
        company: {
          target_record_id: {
            $eq: TEST_COMPANY_ID,
          },
        },
      },
      limit: 5,
    });

    console.log(`✅ Success: Found ${response.data.data.length} people`);
    response.data.data.forEach((person) => {
      const name = person.values?.name?.[0]?.full_name || 'Unnamed';
      console.log(`  - ${name} (ID: ${person.id?.record_id})`);
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error.response?.data || error);
    return { success: false, error: error.message };
  }
}

// Test 5: Error handling - invalid company name
async function testInvalidCompanyName() {
  console.log('\n📋 Test 5: Error handling - invalid company name');

  const request = {
    method: 'tools/call',
    params: {
      name: 'search-people-by-company',
      arguments: {
        companyFilter: {
          filters: [
            {
              attribute: { slug: 'companies.name' },
              condition: 'equals',
              value: 'Non-existent Company XYZ',
            },
          ],
        },
      },
    },
  };

  try {
    const result = await executeToolRequest(request);
    console.log('Result:', JSON.stringify(result, null, 2));
    return { success: true, data: result };
  } catch (error) {
    console.error('Expected error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive search-people-by-company tests\n');

  initializeClient();

  const results = {
    toolWithName: await testToolWithCompanyName(),
    toolWithId: await testToolWithCompanyId(),
    directFunction: await testDirectFunction(),
    directApi: await testDirectApiCall(),
    errorHandling: await testInvalidCompanyName(),
  };

  // Summary
  console.log('\n📊 Test Summary:');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`  ${test}: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    if (!result.success) {
      console.log(`    Error: ${result.error}`);
    }
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter((r) => r.success).length;
  console.log(`\n🎯 Total: ${passedTests}/${totalTests} tests passed`);
}

// Execute tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
