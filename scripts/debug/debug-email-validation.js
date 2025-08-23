#!/usr/bin/env node

/**
 * Debug Email Validation Pipeline
 * 
 * Tests to isolate the "[object object]" error in email validation
 * by tracing data transformation through each step of the pipeline.
 */

import { PeopleDataNormalizer } from '../../dist/utils/normalization/people-normalization.js';
import { ValidationService } from '../../dist/services/ValidationService.js';

function debugLog(step, data) {
  console.log(`\n=== ${step} ===`);
  console.log('Type:', typeof data);
  console.log('Data:', JSON.stringify(data, null, 2));
  if (data && typeof data === 'object' && data.email_addresses) {
    console.log('Email addresses type:', typeof data.email_addresses);
    console.log('Email addresses length:', Array.isArray(data.email_addresses) ? data.email_addresses.length : 'not array');
    if (Array.isArray(data.email_addresses) && data.email_addresses.length > 0) {
      data.email_addresses.forEach((email, index) => {
        console.log(`  Email ${index}:`, typeof email, JSON.stringify(email));
      });
    }
  }
}

function testEmailValidation() {
  console.log('EMAIL VALIDATION DEBUG TEST');
  console.log('===========================');

  // Test cases
  const testCases = [
    {
      name: 'Working String Format',
      data: {
        name: 'Test User',
        email_addresses: ['test@example.com']
      }
    },
    {
      name: 'Failing Object Format (email_address)',
      data: {
        name: 'Test User',
        email_addresses: [{ email_address: 'test@example.com' }]
      }
    },
    {
      name: 'Failing Object Format (value)',
      data: {
        name: 'Test User',
        email_addresses: [{ value: 'test@example.com' }]
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n\n>>> Testing: ${testCase.name}`);
    console.log('Input data:', JSON.stringify(testCase.data, null, 2));

    try {
      // Step 1: Test normalization
      debugLog('STEP 1: Raw Input', testCase.data);
      
      const normalizedData = PeopleDataNormalizer.normalizePeopleData(testCase.data);
      debugLog('STEP 2: After Normalization', normalizedData);

      // Step 2: Test validation
      console.log('\n=== STEP 3: Validation Test ===');
      ValidationService.validateEmailAddresses(normalizedData);
      console.log('✅ Validation PASSED');

    } catch (error) {
      console.log('❌ ERROR:', error.message);
      console.log('Error type:', error.constructor.name);
      console.log('Stack trace:', error.stack);
    }
  }
}

// Test email extraction specifically
function testEmailExtraction() {
  console.log('\n\nEMAIL EXTRACTION SPECIFIC TEST');
  console.log('==============================');

  const emailInputs = [
    'test@example.com',
    { email_address: 'test@example.com' },
    { value: 'test@example.com' },
    { email: 'test@example.com' }
  ];

  console.log('Testing PeopleDataNormalizer.normalizeEmails() directly:');

  for (const input of emailInputs) {
    console.log(`\nInput:`, JSON.stringify(input));
    try {
      const result = PeopleDataNormalizer.normalizeEmails([input]);
      console.log('Result:', JSON.stringify(result));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

// Run tests
testEmailValidation();
testEmailExtraction();