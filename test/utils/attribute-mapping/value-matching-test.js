/**
 * Test the value matching functionality
 */
import {
  findBestValueMatch,
  formatValueMatchError,
} from './dist/utils/value-matcher.js';

// Test data - known values for type_persona field
const typePersonaValues = [
  'Plastic Surgeon',
  'Medical Spa/Aesthetics',
  'Dermatologist',
  'Medical Practice',
  'Wellness Center',
  'Cosmetic Surgery',
  'Aesthetic Medicine',
];

console.log('=== Value Matching Tests ===\n');

// Test 1: Search for "Aesthetics"
console.log('Test 1: Searching for "Aesthetics"');
const result1 = findBestValueMatch('Aesthetics', typePersonaValues);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log(
  'Error message:',
  formatValueMatchError('B2B Segment', 'Aesthetics', result1)
);
console.log();

// Test 2: Search for "Surgeon"
console.log('Test 2: Searching for "Surgeon"');
const result2 = findBestValueMatch('Surgeon', typePersonaValues);
console.log('Result:', JSON.stringify(result2, null, 2));
console.log(
  'Error message:',
  formatValueMatchError('B2B Segment', 'Surgeon', result2)
);
console.log();

// Test 3: Search for "Plastic Surgery"
console.log('Test 3: Searching for "Plastic Surgery"');
const result3 = findBestValueMatch('Plastic Surgery', typePersonaValues);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log(
  'Error message:',
  formatValueMatchError('B2B Segment', 'Plastic Surgery', result3)
);
console.log();

// Test 4: Search for exact match
console.log('Test 4: Searching for "Medical Spa/Aesthetics" (exact)');
const result4 = findBestValueMatch('Medical Spa/Aesthetics', typePersonaValues);
console.log('Result:', JSON.stringify(result4, null, 2));
console.log();

// Test 5: Search for something completely different
console.log('Test 5: Searching for "Technology"');
const result5 = findBestValueMatch('Technology', typePersonaValues);
console.log('Result:', JSON.stringify(result5, null, 2));
console.log(
  'Error message:',
  formatValueMatchError('B2B Segment', 'Technology', result5)
);
console.log();

// Test 6: Case sensitivity
console.log('Test 6: Case insensitive search for "plastic surgeon"');
const result6 = findBestValueMatch('plastic surgeon', typePersonaValues);
console.log('Result:', JSON.stringify(result6, null, 2));
