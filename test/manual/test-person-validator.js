/**
 * Test script for verifying the PersonValidator logic
 * 
 * This tests that the validation logic itself works correctly
 * when given proper attributes (not the wrong objectSlug parameter).
 */

import { PersonValidator } from '../../dist/objects/people-write.js';

async function testPersonValidator() {
  console.log('Testing PersonValidator.validateCreate...\n');
  
  // Test data from the bug report
  const testAttributes = {
    name: "Louie Helmecki",
    company: "Elevation Wellness", 
    job_title: "Founder & Owner",
    phone_numbers: ["+15704071551"],
    email_addresses: ["louie@elevation-wellness.com"]
  };
  
  console.log('Test attributes:', JSON.stringify(testAttributes, null, 2));
  
  try {
    // Test 1: Validate attributes with both name and email (should pass)
    console.log('\n1. Testing validation with both name and email...');
    const result1 = await PersonValidator.validateCreate(testAttributes);
    console.log('✅ Validation passed:', JSON.stringify(result1, null, 2));
    
    // Test 2: Validate with only name (should pass)
    console.log('\n2. Testing validation with only name...');
    const nameOnlyAttrs = { name: "John Doe" };
    const result2 = await PersonValidator.validateCreate(nameOnlyAttrs);
    console.log('✅ Name-only validation passed:', JSON.stringify(result2, null, 2));
    
    // Test 3: Validate with only email (should pass)
    console.log('\n3. Testing validation with only email...');
    const emailOnlyAttrs = { email_addresses: ["john@example.com"] };
    const result3 = await PersonValidator.validateCreate(emailOnlyAttrs);
    console.log('✅ Email-only validation passed:', JSON.stringify(result3, null, 2));
    
    // Test 4: Validate with neither name nor email (should fail)
    console.log('\n4. Testing validation with neither name nor email...');
    try {
      const result4 = await PersonValidator.validateCreate({ company: "Test Corp" });
      console.log('❌ This should have failed but passed:', result4);
    } catch (error) {
      console.log('✅ Correctly failed validation:', error.message);
    }
    
    // Test 5: What would happen with objectSlug parameter (simulate the bug)
    console.log('\n5. Testing what happens when objectSlug is passed as attributes...');
    try {
      const result5 = await PersonValidator.validateCreate("people");
      console.log('❌ This should have failed but passed:', result5);
    } catch (error) {
      console.log('✅ Correctly failed when objectSlug passed as attributes:', error.message);
      console.log('   This demonstrates the original bug - when createPerson received "people" instead of attributes');
    }
    
    console.log('\n🎉 All validation tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPersonValidator();
}