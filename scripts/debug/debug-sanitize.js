#!/usr/bin/env node

import * from '../../dist/utils/normalization/people-normalization.js';
import * from '../../dist/handlers/tool-configs/universal/schemas.js';

console.log('=== SANITIZATION STEP DEBUG ===');

const testInput = {
  name: 'Test User',
  email_addresses: [{ email_address: 'test@example.com' }]
};

console.log('Original input:', JSON.stringify(testInput, null, 2));

// Step 1: Test sanitization
console.log('\n1. Testing InputSanitizer.sanitizeObject():');
const sanitized = InputSanitizer.sanitizeObject(testInput);
console.log('Sanitized:', JSON.stringify(sanitized, null, 2));

// Step 2: Test email field detection
console.log('\n2. Testing email field detection on sanitized object:');
const emailFields = [
  'email',
  'emails',
  'email_address', 
  'email_addresses',
  'emailAddress',
];
console.log('Field presence in sanitized object:');
emailFields.forEach(field => {
  console.log(`  ${field}:`, field in sanitized);
});

const hasEmailField = emailFields.some((field) => field in sanitized);
console.log('hasEmailField:', hasEmailField);

// Step 3: Test the normalizeEmails call
console.log('\n3. Testing normalizeEmails with sanitized object:');
if (hasEmailField) {
  const emailData = PeopleDataNormalizer.normalizeEmails(sanitized);
  console.log('emailData result:', JSON.stringify(emailData));
  console.log('emailData truthy:', !!emailData);
  
  if (emailData) {
    console.log('✅ Email data exists, should be added to normalized object');
  } else {
    console.log('❌ Email data is falsy, will NOT be added to normalized object');
  }
} else {
  console.log('❌ No email field detected, normalization skipped');
}

// Step 4: Test the full normalizePeopleData method with detailed logging
console.log('\n4. Testing full normalizePeopleData method:');
const result = PeopleDataNormalizer.normalizePeopleData(testInput);
console.log('Final result:', JSON.stringify(result, null, 2));