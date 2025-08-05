/**
 * Test script for verifying the create-person tool fix
 *
 * This tests the fix for issue #201 where create-person was failing with
 * "Must provide at least an email address or name" despite providing both.
 */

import { peopleToolConfigs } from '../../dist/handlers/tool-configs/people/index.js';
import { createPerson } from '../../dist/objects/people-write.js';

async function testCreatePersonFix() {
  console.log('Testing create-person tool fix...\n');

  // Test data from the bug report
  const testAttributes = {
    name: 'Louie Helmecki',
    company: 'Elevation Wellness',
    job_title: 'Founder & Owner',
    phone_numbers: ['+15704071551'],
    email_addresses: ['louie@elevation-wellness.com'],
  };

  console.log('Test attributes:', JSON.stringify(testAttributes, null, 2));

  try {
    // Test 1: Direct createPerson function (should work)
    console.log('\n1. Testing direct createPerson function...');
    const directResult = await createPerson(testAttributes);
    console.log(
      '✅ Direct createPerson succeeded:',
      directResult.id?.record_id || 'ID unknown'
    );

    // Test 2: Adapter function from tool config (should also work now)
    console.log('\n2. Testing tool config adapter function...');
    const adapterHandler = peopleToolConfigs.create.handler;
    const adapterResult = await adapterHandler('people', testAttributes);
    console.log(
      '✅ Tool config adapter succeeded:',
      adapterResult.id?.record_id || 'ID unknown'
    );

    console.log('\n🎉 All tests passed! The fix is working correctly.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCreatePersonFix();
}
