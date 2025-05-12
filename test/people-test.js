#!/usr/bin/env node

// Simple test script to verify that People object functionality works
import { searchPeople, getPersonDetails, getPersonNotes, createPersonNote } from '../dist/objects/people.js';

async function testPeopleAPIs() {
  try {
    console.log('Testing People APIs...');
    
    // Test searching for people
    console.log('\n1. Testing searchPeople:');
    const searchResults = await searchPeople('John');
    console.log(`Found ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log(`Example person: ${JSON.stringify(searchResults[0].values?.name?.[0]?.value || 'Unknown')}`);
      
      // Get the first person's ID
      const personId = searchResults[0].id?.record_id;
      if (personId) {
        // Test getting person details
        console.log(`\n2. Testing getPersonDetails for ${personId}:`);
        const personDetails = await getPersonDetails(personId);
        console.log(`Retrieved details successfully: ${personDetails ? 'Yes' : 'No'}`);
        
        // Test getting person notes
        console.log(`\n3. Testing getPersonNotes for ${personId}:`);
        const notes = await getPersonNotes(personId);
        console.log(`Found ${notes.length} notes`);
        
        // Test creating a note
        console.log(`\n4. Testing createPersonNote for ${personId}:`);
        const note = await createPersonNote(
          personId,
          'Test Note from MCP',
          'This is a test note created by the Attio MCP Server test script'
        );
        console.log(`Note created: ${note ? 'Yes' : 'No'}`);
        console.log(`Note ID: ${note?.id?.note_id || 'Unknown'}`);
      }
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error testing People APIs:', error);
  }
}

// Make sure ATTIO_API_KEY is set
if (!process.env.ATTIO_API_KEY) {
  console.error('ERROR: ATTIO_API_KEY environment variable is required');
  process.exit(1);
}

testPeopleAPIs();