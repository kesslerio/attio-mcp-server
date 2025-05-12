#!/usr/bin/env node

// Test script to search for a specific person
import { searchPeople, getPersonDetails } from '../dist/objects/people.js';

async function searchSpecificPerson(name) {
  try {
    console.log(`Searching for "${name}"...`);
    
    const searchResults = await searchPeople(name);
    console.log(`Found ${searchResults.length} results`);
    
    if (searchResults.length > 0) {
      // Display more details about each result
      searchResults.forEach((person, index) => {
        const personName = person.values?.name?.[0]?.value || 'Unknown';
        const personId = person.id?.record_id || 'Unknown ID';
        const email = person.values?.email?.[0]?.value || 'No email';
        
        console.log(`\nResult #${index + 1}:`);
        console.log(`- Name: ${personName}`);
        console.log(`- ID: ${personId}`);
        console.log(`- Email: ${email}`);
        
        // Show all available fields
        console.log('- Available fields:');
        const fields = Object.keys(person.values || {})
          .filter(key => person.values[key]?.length > 0)
          .map(key => `${key}: ${JSON.stringify(person.values[key][0]?.value || 'null')}`)
          .join(', ');
        console.log(`  ${fields}`);
      });
      
      // Get full details for the first result
      const firstPerson = searchResults[0];
      const personId = firstPerson.id?.record_id;
      if (personId) {
        console.log(`\nFetching full details for ${firstPerson.values?.name?.[0]?.value || 'Unknown'}...`);
        const details = await getPersonDetails(personId);
        console.log(JSON.stringify(details, null, 2));
      }
    } else {
      console.log('No results found.');
    }
  } catch (error) {
    console.error('Error searching for person:', error);
  }
}

// Make sure ATTIO_API_KEY is set
if (!process.env.ATTIO_API_KEY) {
  console.error('ERROR: ATTIO_API_KEY environment variable is required');
  process.exit(1);
}

// Search for the specified person
searchSpecificPerson("Brett Markowitz");