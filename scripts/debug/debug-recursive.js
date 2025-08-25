#!/usr/bin/env node

import * from '../../dist/utils/normalization/people-normalization.js';

console.log('=== RECURSIVE CALL DEBUG ===');

const testObject = {
  name: 'Test User',
  email_addresses: [{ email_address: 'test@example.com' }]
};

console.log('Full object:', JSON.stringify(testObject, null, 2));

console.log('\n1. Direct call with full object:');
const result1 = PeopleDataNormalizer.normalizeEmails(testObject);
console.log('Result:', JSON.stringify(result1));

console.log('\n2. Direct call with just email_addresses array:');
const result2 = PeopleDataNormalizer.normalizeEmails(testObject.email_addresses);
console.log('Result:', JSON.stringify(result2));

console.log('\n3. Testing the object processing logic step by step:');
console.log('Has email_addresses field:', 'email_addresses' in testObject);
console.log('email_addresses is array:', Array.isArray(testObject.email_addresses));

console.log('\n4. Testing other email fields:');
console.log('Has email_address field:', 'email_address' in testObject);
console.log('Has email field:', 'email' in testObject);
console.log('Has emails field:', 'emails' in testObject);

// Test what happens if we manually follow the logic
console.log('\n5. Manual logic flow:');
if (testObject.email_address) {
  console.log('Would take email_address path');
} else if (testObject.email_addresses && Array.isArray(testObject.email_addresses)) {
  console.log('Taking email_addresses path');
  console.log('Recursively calling with:', JSON.stringify(testObject.email_addresses));
  const recursiveResult = PeopleDataNormalizer.normalizeEmails(testObject.email_addresses);
  console.log('Recursive result:', JSON.stringify(recursiveResult));
} else if (testObject.email) {
  console.log('Would take email path');
} else if (testObject.emails && Array.isArray(testObject.emails)) {
  console.log('Would take emails path');
} else {
  console.log('Would take no email path');
}