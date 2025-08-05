/**
 * Test specific mappings to understand the behavior
 */
import { getAttributeSlug } from './dist/utils/attribute-mapping/index.js';

console.log('=== Testing Specific Mappings ===\n');

// Test cases that failed in the previous test
const testCases = [
  'Recent News/Press',
  'Notes on Company',
  'Email',
  'Phone',
  'Company Name',
  'company_name',
  'COMPANY_NAME',
];

// Test each case with detailed output
testCases.forEach((input) => {
  console.log(`\nTesting: "${input}"`);
  try {
    const result = getAttributeSlug(input);
    console.log(`Result: "${result}"`);

    // Show the transformation steps
    const normalized = input.toLowerCase().replace(/[\s/\-_.]+/g, '_');
    console.log(`Normalized would be: "${normalized}"`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
});

// Check if mappings exist in config
console.log('\n\n=== Checking Configuration ===');

import { readFileSync } from 'fs';

try {
  const userConfig = JSON.parse(
    readFileSync('./config/mappings/user.json', 'utf8')
  );

  console.log('\nMappings for "Recent News/Press" in config:');
  const companyMappings = userConfig.mappings.attributes.objects.companies;
  Object.entries(companyMappings).forEach(([key, value]) => {
    if (
      key.includes('Recent') ||
      key.includes('News') ||
      key.includes('Press')
    ) {
      console.log(`  "${key}" → "${value}"`);
    }
  });

  console.log('\nMappings for "Notes on Company" in config:');
  Object.entries(companyMappings).forEach(([key, value]) => {
    if (key.includes('Notes') && key.includes('Company')) {
      console.log(`  "${key}" → "${value}"`);
    }
  });

  console.log('\nMappings for "Company Name" variations:');
  Object.entries(companyMappings).forEach(([key, value]) => {
    if (
      key.toLowerCase().includes('company') &&
      key.toLowerCase().includes('name')
    ) {
      console.log(`  "${key}" → "${value}"`);
    }
  });
} catch (error) {
  console.error('Error reading config:', error.message);
}
