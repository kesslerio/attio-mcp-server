// Quick test to verify the add-record-to-list fix
const { executeToolRequest } = require('./dist/handlers/tools/dispatcher.js');

async function testFix() {
  console.log('Testing add-record-to-list fix...');
  
  try {
    const mockRequest = {
      method: 'tools/call',
      params: {
        name: 'add-record-to-list',
        arguments: {
          listId: '88709359-01f6-478b-ba66-c07347891b6f',
          recordId: '87a5d45f-2e9b-4eed-b745-0e733d41cdf2',
          objectType: 'companies'
          // No initialValues provided - this should now work with empty entry_values
        },
      },
    };

    const result = await executeToolRequest(mockRequest);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.isError) {
      console.log('❌ Test failed - still getting error');
      console.log('Error content:', result.content);
    } else {
      console.log('✅ Test passed - add-record-to-list works with no initialValues');
    }
  } catch (error) {
    console.log('❌ Test failed with exception:', error.message);
  }
}

// Only run if API key is available
if (process.env.ATTIO_API_KEY) {
  testFix();
} else {
  console.log('⚠️  Skipping test - no ATTIO_API_KEY found');
  console.log('The fix has been applied to both:');
  console.log('- src/objects/lists.ts:423 (fallback implementation)');
  console.log('- src/api/operations/lists.ts:238 (generic implementation)');
  console.log('Both now send entry_values: {} when no initialValues provided');
}