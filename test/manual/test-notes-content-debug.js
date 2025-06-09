/**
 * Debug test for get-company-notes content issue
 * 
 * This test investigates why notes show "No content" instead of actual content
 */

import { executeToolRequest } from '../../dist/handlers/tools/dispatcher/core.js';
import { getCompanyNotes } from '../../dist/objects/companies/notes.js';

// Company ID from the user's report
const COMPANY_ID = '49b11210-df4c-5246-9eda-2add14964eb4';

async function debugNotesContent() {
  console.log('=== Debugging Notes Content Issue ===');
  
  try {
    // Test 1: Direct API call to notes function
    console.log('\n1. Testing direct getCompanyNotes function...');
    const directNotes = await getCompanyNotes(COMPANY_ID);
    console.log(`Found ${directNotes.length} notes directly from API`);
    
    if (directNotes.length > 0) {
      console.log('First note structure:', JSON.stringify(directNotes[0], null, 2));
      console.log('\nNote fields present:');
      Object.keys(directNotes[0]).forEach(key => {
        console.log(`- ${key}: ${typeof directNotes[0][key]} = ${directNotes[0][key]}`);
      });
    }
    
    // Test 2: Test through MCP tool
    console.log('\n2. Testing through MCP tool dispatcher...');
    const mcpRequest = {
      params: {
        name: 'get-company-notes',
        arguments: {
          companyId: COMPANY_ID
        }
      }
    };
    
    const mcpResult = await executeToolRequest(mcpRequest);
    console.log('MCP Result:', JSON.stringify(mcpResult, null, 2));
    
  } catch (error) {
    console.error('Debug test error:', error.message);
    
    // Check if it's expected API key error
    if (error.message.includes('API key') || error.message.includes('ATTIO_API_KEY')) {
      console.log('✅ Test setup correct (API key needed for actual execution)');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

// Set up environment if API key exists
if (process.env.ATTIO_API_KEY) {
  debugNotesContent().catch(console.error);
} else {
  console.log('ATTIO_API_KEY not set, running limited debug test...');
  
  // We can still test the structure without API calls
  console.log('Testing formatter logic...');
  
  // Mock note data to test formatter
  const mockNote = {
    id: { note_id: 'test-id' },
    title: 'Test Note',
    content: 'This is test content for the note.',
    format: 'plaintext',
    parent_object: 'companies',
    parent_record_id: COMPANY_ID,
    created_at: '2024-01-01T00:00:00Z'
  };
  
  const mockNotes = [mockNote];
  
  // Test the updated formatter from the tool config
  const formatter = (notes) => {
    if (!notes || notes.length === 0) {
      return 'No notes found for this company.';
    }
    return `Found ${notes.length} notes:\n${notes
      .map(
        (note) => {
          // Handle different possible field structures from the API
          const title = note.title || note.data?.title || 'Untitled';
          const content = note.content || note.data?.content;
          const timestamp = note.timestamp || note.created_at || note.data?.created_at || 'unknown';
          
          return `- ${title} (Created: ${timestamp})\n  ${
            content
              ? content.length > 200 
                ? content.substring(0, 200) + '...'
                : content
              : 'No content'
          }`;
        }
      )
      .join('\n\n')}`;
  };
  
  console.log('Mock formatter result:', formatter(mockNotes));
  
  // Test different potential API response structures
  console.log('\nTesting different API response structures...');
  
  // Case 1: Content in data field
  const notesWithDataField = [{
    id: { note_id: 'test-1' },
    title: 'Note with data field',
    data: {
      content: 'Content is nested in data field',
      created_at: '2024-01-01T00:00:00Z'
    }
  }];
  console.log('1. Data field structure:', formatter(notesWithDataField));
  
  // Case 2: Missing content entirely
  const notesWithoutContent = [{
    id: { note_id: 'test-2' },
    title: 'Note without content',
    created_at: '2024-01-01T00:00:00Z'
  }];
  console.log('2. Missing content:', formatter(notesWithoutContent));
  
  // Case 3: Different timestamp field
  const notesWithDifferentTimestamp = [{
    id: { note_id: 'test-3' },
    title: 'Note with different timestamp',
    content: 'This has content but different timestamp field',
    timestamp: '2024-01-01T00:00:00Z'
  }];
  console.log('3. Different timestamp field:', formatter(notesWithDifferentTimestamp));
}