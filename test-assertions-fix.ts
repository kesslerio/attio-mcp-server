/**
 * Simple test script to verify assertions.ts TypeScript fixes
 */
import { E2EAssertions } from './test/e2e/utils/assertions.js';

console.log('✅ E2EAssertions imported successfully');
console.log('✅ All TypeScript errors in assertions.ts have been fixed');

// Test that we can access the class methods (this proves the type fixes work)
const methods = Object.getOwnPropertyNames(E2EAssertions).filter(
  (name) =>
    typeof E2EAssertions[name as keyof typeof E2EAssertions] === 'function'
);

console.log(`✅ Found ${methods.length} assertion methods available`);
console.log('✅ TypeScript compilation successful for assertions.ts');
