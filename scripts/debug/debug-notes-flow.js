// Debug script to test notes creation flow directly
import { createNote, listNotes, normalizeNoteResponse } from '../../dist/objects/notes.js';

console.log('=== NOTES FLOW DEBUG ===\n');

// Test 1: Create a note
console.log('1. Testing note creation...');
try {
  const noteData = {
    parent_object: 'companies',
    parent_record_id: 'a2bc1edf-b0d6-4b83-a9be-47fba8939138', // Use the DEBUG company ID
    title: 'DEBUG Test Note',
    content: 'This is a test note for debugging the notes flow',
    format: 'plaintext'
  };
  
  console.log('   Note data:', JSON.stringify(noteData, null, 2));
  
  const createResult = await createNote(noteData);
  console.log('   ✅ Note created successfully!');
  console.log('   Note ID:', createResult.data.id.note_id);
  console.log('   Parent object:', createResult.data.parent_object);
  console.log('   Parent record ID:', createResult.data.parent_record_id);
  console.log('   Content plaintext:', createResult.data.content_plaintext);
  
  // Test normalization
  const normalized = normalizeNoteResponse(createResult.data);
  console.log('\n   Normalized response:');
  console.log('   - Resource type:', normalized.resource_type);
  console.log('   - Record ID:', normalized.id.record_id);
  console.log('   - Content markdown:', !!normalized.values.content_markdown);
  console.log('   - Content plaintext:', !!normalized.values.content_plaintext);
  console.log('   - Parent object:', normalized.values.parent_object);
  console.log('   - Parent record ID:', normalized.values.parent_record_id);
  
  // Test 2: List notes
  console.log('\n2. Testing note listing...');
  const listResult = await listNotes({
    parent_object: 'companies',
    parent_record_id: noteData.parent_record_id,
    limit: 5
  });
  
  console.log('   ✅ Listed notes successfully!');
  console.log('   Found notes:', listResult.data.length);
  if (listResult.data.length > 0) {
    console.log('   First note ID:', listResult.data[0].id.note_id);
    console.log('   First note content preview:', listResult.data[0].content_plaintext?.substring(0, 50) + '...');
  }
  
} catch (error) {
  console.error('❌ Error in notes flow:', error.message);
  if (error.response) {
    console.error('   Status:', error.response.status);
    console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
  }
  console.error('   Full error:', JSON.stringify(error.toJSON ? error.toJSON() : error, null, 2));
}

console.log('\n=== DEBUG COMPLETE ===');