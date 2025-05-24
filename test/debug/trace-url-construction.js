/**
 * Test to trace URL construction for company creation
 */
import { ResourceType } from '../../dist/types/attio.js';

console.log('=== URL Construction Trace ===');
console.log('ResourceType.COMPANIES:', ResourceType.COMPANIES);
console.log('Type:', typeof ResourceType.COMPANIES);

// Simulate what happens in createObjectRecord
const objectSlug = ResourceType.COMPANIES;
const objectPath = `/objects/${objectSlug}`;
const createPath = `${objectPath}/records`;

console.log('\nURL construction:');
console.log('objectSlug:', objectSlug);
console.log('objectPath:', objectPath);
console.log('createPath:', createPath);

// Test with undefined
const undefinedSlug = undefined;
const undefinedPath = `/objects/${undefinedSlug}`;
const undefinedCreatePath = `${undefinedPath}/records`;

console.log('\nWith undefined:');
console.log('undefinedSlug:', undefinedSlug);
console.log('undefinedPath:', undefinedPath);
console.log('undefinedCreatePath:', undefinedCreatePath);

// Check ResourceType values
console.log('\nAll ResourceType values:');
for (const [key, value] of Object.entries(ResourceType)) {
  console.log(`${key}: "${value}" (type: ${typeof value})`);
}
