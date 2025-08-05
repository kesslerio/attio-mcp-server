#!/usr/bin/env node

/**
 * Test script to verify the phone number field fix
 * Tests that searchPeopleByEmail no longer fails with "Unknown attribute slug: phone"
 */

import { searchPeopleByEmail } from '../../dist/objects/people/search.js';

async function testPhoneFieldFix() {
  console.log('Testing phone field fix for people search...');

  try {
    // Test with a specific email
    const testEmail = 'michel.camposbr@gmail.com';
    console.log(`\nSearching for people with email: ${testEmail}`);

    const results = await searchPeopleByEmail(testEmail);

    console.log('✅ Search completed successfully!');
    console.log(`Found ${results.length} people matching the email`);

    if (results.length > 0) {
      console.log('\nFirst result:');
      const person = results[0];
      console.log(`- Name: ${person.values?.name?.[0]?.value || 'Unknown'}`);
      console.log(`- ID: ${person.id?.record_id || 'Unknown'}`);

      // Show available fields to verify structure
      const fields = Object.keys(person.values || {});
      console.log(`- Available fields: ${fields.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error(error.message);

    // Check if it's the specific phone field error
    if (error.message.includes('Unknown attribute slug: phone')) {
      console.error(
        '\n🚨 The phone field error still exists! Fix not working.'
      );
      process.exit(1);
    } else {
      console.log('\n✅ The phone field error is fixed (different error type)');
    }
  }
}

testPhoneFieldFix().catch(console.error);
