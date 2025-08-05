/**
 * Test the exact scenario from the GitHub issue
 */

import dotenv from 'dotenv';

dotenv.config();

async function testSpecificQuery() {
  console.log('🧪 Testing exact scenario from GitHub issue');
  console.log('==========================================');

  const query = 'The Plastics Doc theplasticsdoc.com';
  console.log(`Query: "${query}"`);
  console.log('');

  try {
    // Import MCP dispatcher to simulate exact MCP call
    const { executeToolRequest } = await import(
      '../../dist/handlers/tools/dispatcher.js'
    );

    const mcpRequest = {
      method: 'tools/call',
      params: {
        name: 'search-companies',
        arguments: {
          query,
        },
      },
    };

    console.log('📤 MCP Request:', JSON.stringify(mcpRequest, null, 2));

    const result = await executeToolRequest(mcpRequest);

    console.log('📥 MCP Response:', JSON.stringify(result, null, 2));

    if (result.isError) {
      console.log('❌ Test FAILED - Error response');
      return false;
    }

    const responseText = result.content?.[0]?.text || '';

    if (responseText.includes('Found 0 companies:')) {
      console.log('❌ Test FAILED - Still returning 0 companies');
      return false;
    }

    if (
      responseText.includes('The Plastics Doc') &&
      responseText.includes('theplasticsdoc.com')
    ) {
      console.log('✅ Test PASSED - Found the expected company!');
      console.log('✅ Domain search is working correctly');
      return true;
    }

    console.log('⚠️ Test INCONCLUSIVE - Unexpected response format');
    return false;
  } catch (error) {
    console.error('❌ Test FAILED with error:', error);
    return false;
  }
}

// Run the test
testSpecificQuery()
  .then((success) => {
    if (success) {
      console.log('\n🎉 GitHub issue has been resolved!');
      process.exit(0);
    } else {
      console.log('\n💥 GitHub issue still exists');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:', error);
    process.exit(1);
  });
