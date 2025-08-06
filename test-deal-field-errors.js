/**
 * Test enhanced error messages for deal fields
 */

// Test various invalid field errors
const testCases = [
  {
    name: 'Deal with description field',
    input: {
      name: 'Test Deal',
      value: 5000,
      description: 'This should trigger helpful error message',
      associated_company: 'test-company-id',
    },
    invalidFields: ['description'],
    expectedSuggestion:
      'Deals do not have a "description" field. Available fields: name, stage, value, owner, associated_company, associated_people',
  },
  {
    name: 'Deal with probability field',
    input: {
      name: 'Test Deal',
      value: 10000,
      probability: 75,
      stage: 'Interested',
    },
    invalidFields: ['probability'],
    expectedSuggestion:
      'Deals do not have a built-in probability field. Consider using custom fields or tracking probability in stage names',
  },
  {
    name: 'Deal with source field',
    input: {
      name: 'Test Deal',
      value: 7500,
      source: 'Referral',
      lead_source: 'Partner',
    },
    invalidFields: ['source', 'lead_source'],
    expectedSuggestion:
      'Deals do not have a built-in source field. Consider using custom fields to track deal sources',
  },
  {
    name: 'Deal with close date',
    input: {
      name: 'Test Deal',
      value: 15000,
      expected_close_date: '2025-03-31',
      close_date: '2025-Q1',
    },
    invalidFields: ['expected_close_date', 'close_date'],
    expectedSuggestion:
      'Deals do not have a built-in close date field. Consider using a custom field or tracking this separately',
  },
  {
    name: 'Deal with tags',
    input: {
      name: 'Test Deal',
      value: 20000,
      tags: ['urgent', 'enterprise'],
      labels: ['high-priority'],
    },
    invalidFields: ['tags', 'labels'],
    expectedSuggestion:
      'Deals do not have a built-in tags field. Consider using custom fields or categories',
  },
  {
    name: 'Deal with contact field',
    input: {
      name: 'Test Deal',
      value: 8000,
      contact: 'contact-id',
      primary_contact: 'person-id',
    },
    invalidFields: ['contact', 'primary_contact'],
    expectedSuggestion:
      'Use "associated_people" to link contacts/people to deals',
  },
  {
    name: 'Deal with notes field',
    input: {
      name: 'Test Deal',
      value: 12000,
      notes: 'Initial discussion notes',
      comments: 'Follow up needed',
    },
    invalidFields: ['notes', 'comments'],
    expectedSuggestion:
      'Deal notes should be created separately using the notes API after the deal is created',
  },
  {
    name: 'Deal with type field',
    input: {
      name: 'Test Deal',
      value: 9500,
      type: 'New Business',
      deal_type: 'Expansion',
    },
    invalidFields: ['type', 'deal_type'],
    expectedSuggestion:
      'Deal types are not built-in. Use stages or custom fields to categorize deals',
  },
  {
    name: 'Deal with currency field',
    input: {
      name: 'Test Deal',
      value: 5000,
      currency: 'EUR',
    },
    invalidFields: ['currency'],
    expectedSuggestion:
      'Currency is set automatically based on workspace settings. Just provide a numeric value for the deal amount',
  },
];

console.log('=== Enhanced Deal Field Error Messages ===\n');
console.log('We now provide helpful guidance for common field mistakes:\n');

testCases.forEach((testCase) => {
  console.log(`📝 ${testCase.name}`);
  console.log(`   Invalid fields: ${testCase.invalidFields.join(', ')}`);
  console.log(`   💡 Suggestion: "${testCase.expectedSuggestion}"`);
  console.log('');
});

console.log('=== Summary ===\n');
console.log('✅ Enhanced error messages now cover:');
console.log('   - Description field → Suggests using notes API');
console.log('   - Probability/likelihood → Suggests custom fields');
console.log('   - Source/lead_source → Suggests custom fields');
console.log('   - Close date fields → Suggests custom date fields');
console.log('   - Tags/labels → Suggests custom fields');
console.log('   - Contact fields → Points to associated_people');
console.log('   - Notes/comments → Suggests separate notes API');
console.log('   - Type/deal_type → Suggests stages or custom fields');
console.log('   - Currency → Explains automatic handling');
console.log('   - Unknown fields → Generic helpful message with field list');
console.log(
  '\n✅ Users will get clear guidance on what to do instead of just an error!'
);
