#!/usr/bin/env node

// Test field validation without API calls

import { validateFields } from '../../dist/handlers/tool-configs/universal/field-mapper.js';
import { UniversalResourceType } from '../../dist/handlers/tool-configs/universal/types.js';

console.log('Testing field validation improvements for Issue #388\n');
console.log('='.repeat(60));

// Test 1: Wrong field name for tasks
console.log('\n📝 Test 1: Using wrong field names for tasks');
console.log('Input: { title: "My Task", status: "pending" }');

const taskValidation = validateFields(UniversalResourceType.TASKS, {
  title: 'My Task',
  status: 'pending',
});

console.log('\nValidation Result:');
console.log('  Valid:', taskValidation.valid);
if (taskValidation.errors.length > 0) {
  console.log('  Errors:', taskValidation.errors);
}
if (taskValidation.warnings.length > 0) {
  console.log('  Warnings:', taskValidation.warnings);
}
if (taskValidation.suggestions.length > 0) {
  console.log('  Suggestions:', taskValidation.suggestions);
}

// Test 2: Using correct field names
console.log('\n📝 Test 2: Using correct field names for tasks');
console.log('Input: { content: "My Task", is_completed: false }');

const correctValidation = validateFields(UniversalResourceType.TASKS, {
  content: 'My Task',
  is_completed: false,
});

console.log('\nValidation Result:');
console.log('  Valid:', correctValidation.valid);
console.log('  Errors:', correctValidation.errors);
console.log('  Warnings:', correctValidation.warnings);
console.log('  Suggestions:', correctValidation.suggestions);

// Test 3: Missing required field
console.log('\n📝 Test 3: Missing required field for companies');
console.log('Input: { website: "example.com" } (missing "name")');

const missingFieldValidation = validateFields(UniversalResourceType.COMPANIES, {
  website: 'example.com',
});

console.log('\nValidation Result:');
console.log('  Valid:', missingFieldValidation.valid);
if (missingFieldValidation.errors.length > 0) {
  console.log('  Errors:', missingFieldValidation.errors);
}

console.log('\n✅ Field validation test complete!');
