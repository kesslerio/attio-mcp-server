#!/usr/bin/env node

import * from '../../dist/utils/normalization/people-normalization.js';

console.log('=== SPECIFIC EMAIL NORMALIZATION DEBUG ===');

// Test the exact failing case
const testInput = {
  name: 'Test User',
  email_addresses: [{ email_address: 'test@example.com' }]
};

console.log('Input:', JSON.stringify(testInput, null, 2));

// Test the individual components
console.log('\n1. Testing normalizeEmails with the array directly:');
const emailsArray = [{ email_address: 'test@example.com' }];
console.log('Input array:', JSON.stringify(emailsArray));
const emailResult = PeopleDataNormalizer.normalizeEmails(emailsArray);
console.log('Result:', JSON.stringify(emailResult));

console.log('\n2. Testing normalizePeopleData with the full object:');
const peopleResult = PeopleDataNormalizer.normalizePeopleData(testInput);
console.log('Result:', JSON.stringify(peopleResult, null, 2));

console.log('\n3. Testing what happens when we check for email field:');
console.log('Has email_addresses field:', 'email_addresses' in testInput);
console.log('Is array:', Array.isArray(testInput.email_addresses));

console.log('\n4. Testing email field detection logic:');
const emailFields = [
  'email',
  'emails', 
  'email_address',
  'email_addresses',
  'emailAddress',
];
console.log('Field presence:');
emailFields.forEach(field => {
  console.log(`  ${field}:`, field in testInput);
});

console.log('\n5. Testing value format detection:');
const firstEmailItem = testInput.email_addresses[0];
console.log('First email item:', JSON.stringify(firstEmailItem));
console.log('Has email_address field:', 'email_address' in firstEmailItem);
console.log('Has value field:', 'value' in firstEmailItem);
console.log('email_address value:', firstEmailItem.email_address);
console.log('email_address type:', typeof firstEmailItem.email_address);