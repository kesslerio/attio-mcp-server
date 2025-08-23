#!/usr/bin/env node

// Test script for field validation improvements (Issue #388)

import * from '../../dist/handlers/tool-configs/universal/shared-handlers.js';
import * from '../../dist/handlers/tool-configs/universal/types.js';

async function testFieldValidation() {
  console.log('Testing field validation improvements for Issue #388\n');
  console.log('=' .repeat(60));
  
  // Test 1: Wrong field name for tasks
  console.log('\n📝 Test 1: Using wrong field name for tasks');
  console.log('Attempting to create task with "title" instead of "content"...\n');
  
  try {
    await handleUniversalCreate({
      resource_type: UniversalResourceType.TASKS,
      record_data: {
        title: 'My Task',  // Wrong! Should be 'content'
        status: 'pending'  // Also wrong! Should be 'is_completed'
      }
    });
  } catch (error) {
    console.log('Error message received:');
    console.log('-'.repeat(40));
    console.log(error.message);
    console.log('-'.repeat(40));
  }
  
  // Test 2: Invalid resource type
  console.log('\n\n📝 Test 2: Using invalid resource type');
  console.log('Attempting to use "record" instead of "records"...\n');
  
  try {
    await handleUniversalCreate({
      resource_type: 'record',  // Wrong! Not a valid type
      record_data: {
        name: 'Test'
      }
    });
  } catch (error) {
    console.log('Error message received:');
    console.log('-'.repeat(40));
    console.log(error.message);
    console.log('-'.repeat(40));
  }
  
  console.log('\n\n✅ Field validation test complete!');
  console.log('The error messages above should be clear and helpful.');
}

testFieldValidation().catch(console.error);