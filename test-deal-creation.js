#!/usr/bin/env node
/**
 * Test script for deal creation with various field formats
 * This tests all the conversion logic and error handling
 */

import { applyDealDefaults, validateDealInput } from './dist/config/deal-defaults.js';

console.error('=== Deal Creation Test Suite ===\n');

// Test cases for different input formats
const testCases = [
  {
    name: 'Basic deal with number value',
    input: {
      name: 'Test Deal 1',
      value: 9780,
      company_id: 'test-company-id',
      deal_stage: 'Qualification'
    }
  },
  {
    name: 'Deal with currency field (should extract as number)',
    input: {
      name: 'Test Currency Deal',
      value: 9780,
      currency: 'EUR',
      associated_company: 'test-company-id',
      stage: 'Interested'
    }
  },
  {
    name: 'Deal with object value format',
    input: {
      name: 'Test Deal 2',
      value: { value: 15000, currency_code: 'EUR' },
      associated_company: 'test-company-id',
      stage: 'Prospecting'
    }
  },
  {
    name: 'Deal with currency_value format',
    input: {
      name: 'Test Deal 3',
      value: { currency_value: 25000, currency_code: 'GBP' },
      company: 'test-company-id',
      stage: 'Interested'
    }
  },
  {
    name: 'Deal with legacy field names',
    input: {
      deal_name: 'Test Deal 4',
      deal_value: 5000,
      company_id: 'test-company-id',
      deal_stage: 'Negotiation'
    }
  },
  {
    name: 'Deal with invalid fields',
    input: {
      name: 'Test Deal 5',
      description: 'This should trigger a warning',
      expected_close_date: '2025-01-15',
      value: 12000,
      associated_company: 'test-company-id'
    }
  },
  {
    name: 'Deal with pre-formatted value array',
    input: {
      name: 'Test Deal 6',
      value: [{ currency_value: 8000, currency_code: 'USD' }],
      associated_company: 'test-company-id',
      stage: [{ status: 'Interested' }]
    }
  }
];

// Run tests
for (const testCase of testCases) {
  console.error(`\nTest: ${testCase.name}`);
  console.error('Input:', JSON.stringify(testCase.input, null, 2));
  
  // Validate input
  const validation = validateDealInput(testCase.input);
  if (validation.errors.length > 0) {
    console.error('❌ Validation Errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.error('⚠️  Warnings:', validation.warnings);
  }
  if (validation.suggestions.length > 0) {
    console.error('💡 Suggestions:', validation.suggestions);
  }
  
  // Apply defaults and conversions
  const converted = applyDealDefaults(testCase.input);
  console.error('✅ Converted:', JSON.stringify(converted, null, 2));
  
  // Check key conversions
  const conversions = [];
  if (testCase.input.company_id && converted.associated_company) {
    conversions.push('company_id → associated_company');
  }
  if (testCase.input.deal_name && converted.name) {
    conversions.push('deal_name → name');
  }
  if (testCase.input.deal_stage && converted.stage) {
    conversions.push('deal_stage → stage');
  }
  if (testCase.input.deal_value && converted.value) {
    conversions.push('deal_value → value');
  }
  
  if (conversions.length > 0) {
    console.error('🔄 Field Conversions:', conversions.join(', '));
  }
}

// Test error message improvements
console.error('\n=== Error Message Tests ===\n');

// Import the error suggestion function
import { createUniversalError } from './dist/handlers/tool-configs/universal/shared-handlers.js';

const errorScenarios = [
  {
    operation: 'create',
    resourceType: 'deals',
    error: new Error('Cannot find attribute with slug/ID "description"')
  },
  {
    operation: 'create',
    resourceType: 'deals',
    error: new Error('Cannot find attribute with slug/ID "company_id"')
  },
  {
    operation: 'create',
    resourceType: 'deals',
    error: new Error('Format Error: An invalid value was passed to attribute with slug "value"')
  },
  {
    operation: 'create',
    resourceType: 'deals',
    error: new Error('Cannot find Status with title "Prospecting"')
  }
];

for (const scenario of errorScenarios) {
  const enhancedError = createUniversalError(scenario.operation, scenario.resourceType, scenario.error);
  console.error(`\nError: ${scenario.error.message}`);
  console.error(`Enhanced: ${enhancedError.message}`);
  if (enhancedError.suggestion) {
    console.error(`💡 Suggestion: ${enhancedError.suggestion}`);
  }
}

console.error('\n=== Test Complete ===');