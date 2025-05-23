/**
 * Manual test for the create-company-note tool
 * 
 * This file tests the create-company-note tool which had an issue
 * where the formatResult function was missing.
 */
import { executeToolRequest } from('../../dist/handlers/tools/dispatcher');

// Sample company ID for testing
const COMPANY_ID = 'test-company-id';
const NOTE_TITLE = 'Test Note Title';
const NOTE_CONTENT = 'This is a test note content.';

// Create a test request for create-company-note
const request = {
  params: {
    name: 'create-company-note',
    arguments: {
      companyId: COMPANY_ID,
      title: NOTE_TITLE,
      content: NOTE_CONTENT
    }
  },
  method: 'tools/call'
};

async function runTest() {
  try {
    console.log('Testing create-company-note tool with added formatResult function...');
    console.log('Request:', JSON.stringify(request, null, 2));
    
    // Execute the tool request
    const result = await executeToolRequest(request);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Only run if executed directly
if (require.main === module) {
  runTest();
}

module.exports = { runTest };