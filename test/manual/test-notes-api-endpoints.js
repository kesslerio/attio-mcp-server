/**
 * Test different notes API endpoints to identify content retrieval issue
 */

import { getAttioClient } from '../../dist/api/attio-client.js';

const COMPANY_ID = '49b11210-df4c-5246-9eda-2add14964eb4';

async function testNotesEndpoints() {
  console.log('=== Testing Different Notes API Endpoints ===');
  
  if (!process.env.ATTIO_API_KEY) {
    console.log('ATTIO_API_KEY not set, cannot test actual API endpoints');
    return;
  }

  try {
    const api = getAttioClient();
    
    // Test 1: Current endpoint used by getObjectNotes
    console.log('\n1. Testing current endpoint: /notes with query params');
    try {
      const path1 = `/notes?limit=5&offset=0&parent_object=companies&parent_record_id=${COMPANY_ID}`;
      console.log(`Calling: ${path1}`);
      const response1 = await api.get(path1);
      console.log('Response structure:', {
        dataType: typeof response1.data,
        hasData: !!response1.data.data,
        dataLength: response1.data.data?.length || 0
      });
      
      if (response1.data.data && response1.data.data.length > 0) {
        const firstNote = response1.data.data[0];
        console.log('First note fields:', Object.keys(firstNote));
        console.log('First note sample:', {
          id: firstNote.id,
          title: firstNote.title,
          content: firstNote.content ? 'HAS CONTENT' : 'NO CONTENT',
          contentLength: firstNote.content?.length || 0,
          format: firstNote.format,
          created_at: firstNote.created_at
        });
      }
    } catch (error) {
      console.log('Endpoint 1 failed:', error.message);
    }
    
    // Test 2: Alternative endpoint pattern
    console.log('\n2. Testing alternative endpoint: /companies/notes');
    try {
      const path2 = `/companies/notes?parent_record_id=${COMPANY_ID}&limit=5`;
      console.log(`Calling: ${path2}`);
      const response2 = await api.get(path2);
      console.log('Response structure:', {
        dataType: typeof response2.data,
        hasData: !!response2.data.data,
        dataLength: response2.data.data?.length || 0
      });
      
      if (response2.data.data && response2.data.data.length > 0) {
        const firstNote = response2.data.data[0];
        console.log('First note fields:', Object.keys(firstNote));
        console.log('First note sample:', {
          id: firstNote.id,
          title: firstNote.title,
          content: firstNote.content ? 'HAS CONTENT' : 'NO CONTENT',
          contentLength: firstNote.content?.length || 0
        });
      }
    } catch (error) {
      console.log('Endpoint 2 failed:', error.message);
    }
    
    // Test 3: Try to get a specific note ID if we found any
    console.log('\n3. Testing individual note retrieval');
    try {
      // First get the notes list again to get a note ID
      const listResponse = await api.get(`/notes?limit=1&offset=0&parent_object=companies&parent_record_id=${COMPANY_ID}`);
      if (listResponse.data.data && listResponse.data.data.length > 0) {
        const noteId = listResponse.data.data[0].id?.note_id;
        if (noteId) {
          console.log(`Trying to get individual note: ${noteId}`);
          const noteResponse = await api.get(`/notes/${noteId}`);
          console.log('Individual note structure:', {
            hasContent: !!noteResponse.data.content || !!noteResponse.data.data?.content,
            contentLength: (noteResponse.data.content || noteResponse.data.data?.content)?.length || 0,
            allFields: Object.keys(noteResponse.data)
          });
        }
      }
    } catch (error) {
      console.log('Individual note retrieval failed:', error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testNotesEndpoints().catch(console.error);