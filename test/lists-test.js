#!/usr/bin/env node

/**
 * Simple test script for Lists API functionality
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { getLists, getListDetails, getListEntries, addRecordToList, removeRecordFromList } from '../dist/objects/lists.js';

// Check for ATTIO_API_KEY
if (!process.env.ATTIO_API_KEY) {
  console.error('ATTIO_API_KEY environment variable is required');
  process.exit(1);
}

async function runTests() {
  try {
    console.log('Testing Lists API functionality...');
    
    // Test 1: Get all lists
    console.log('\n1. Testing getLists()...');
    const lists = await getLists();
    console.log(`Found ${lists.length} lists:`);
    
    if (lists.length === 0) {
      console.log('No lists found in the workspace. Some tests will be skipped.');
      return;
    }
    
    // Display lists
    lists.forEach((list, index) => {
      console.log(`${index + 1}. ${list.title || 'Untitled'} (ID: ${typeof list.id === 'object' ? JSON.stringify(list.id) : list.id}, Object: ${list.object?.slug || 'unknown'}, Entries: ${list.entries_count || 0})`);
    });
    
    // Check if the lists have the expected format
    console.log('\nFirst list object structure:', JSON.stringify(lists[0], null, 2));
    
    // Select the first list for further testing
    const testList = lists[0];
    const listId = typeof testList.id === 'object' && testList.id !== null ? 
                   (testList.id.list_id || 
                    testList.id.id || 
                    (testList.api_slug ? testList.api_slug : JSON.stringify(testList.id))) : 
                   testList.id;
    console.log(`\nSelected list for testing: ${testList.title || 'Untitled'} (ID: ${listId})`);
    
    // Test 2: Get list details
    console.log('\n2. Testing getListDetails()...');
    const listDetails = await getListDetails(listId);
    console.log('List details:', JSON.stringify(listDetails, null, 2));
    
    // Test 3: Get list entries
    console.log('\n3. Testing getListEntries()...');
    const entries = await getListEntries(listId, 5);
    console.log(`Found ${entries.length} entries:`);
    
    // Display entries
    entries.forEach((entry, index) => {
      const entryId = typeof entry.id === 'object' ? JSON.stringify(entry.id) : entry.id;
      const recordId = entry.record?.id || (entry.record ? JSON.stringify(entry.record) : 'unknown');
      const recordTitle = entry.record?.title || (entry.item?.name || 'Untitled');
      console.log(`${index + 1}. ${recordTitle} (Entry ID: ${entryId}, Record ID: ${recordId})`);
    });
    
    // Test 4 & 5: Add & Remove record operations
    // This is left commented out to avoid modifying data during testing
    // Uncomment and provide proper record ID to test
    /*
    if (entries.length > 0) {
      // Test 4: Add record to list
      console.log('\n4. Testing addRecordToList()...');
      const recordToAdd = "RECORD_ID_HERE"; // Replace with a valid record ID
      const addResult = await addRecordToList(testList.id, recordToAdd);
      console.log('Add result:', addResult);
      
      // Test 5: Remove record from list
      console.log('\n5. Testing removeRecordFromList()...');
      const entryToRemove = addResult.id;
      const removeResult = await removeRecordFromList(testList.id, entryToRemove);
      console.log('Remove result:', removeResult);
    }
    */
    
    console.log('\nTests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

runTests();