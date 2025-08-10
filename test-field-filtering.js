const assert = require('assert');

// Test field filtering consistency
async function testFieldFiltering() {
  console.log('Testing field filtering for tasks...\n');
  
  // Test 1: Check if tasks resource type accepts standard fields
  const taskFields = {
    title: "Test Task",
    description: "Test Description", 
    due_date: "2025-12-31",
    status: "pending",
    priority: "high",
    assignee: "test-user"
  };
  
  console.log('Standard task fields to test:', taskFields);
  
  // Test 2: Check what happens with unknown fields
  const unknownFields = {
    unknown_field_1: "value1",
    unknown_field_2: "value2"
  };
  
  console.log('\nUnknown fields to test:', unknownFields);
  
  // Test 3: Check API endpoint patterns
  const endpoints = [
    '/objects/tasks/attributes',
    '/v2/objects/tasks/attributes',
    '/tasks/attributes',
    '/v2/tasks/attributes'
  ];
  
  console.log('\nPossible endpoint patterns for tasks attributes:');
  endpoints.forEach(ep => console.log(`  - ${ep}`));
  
  console.log('\n---');
  console.log('Based on error messages, the issue appears to be:');
  console.log('1. Tasks attributes endpoint returns 404: /objects/tasks/attributes');
  console.log('2. This suggests tasks might use a different API structure');
  console.log('3. Tasks might be a special resource type in Attio');
  console.log('\nRecommendation: Check Attio API docs for correct tasks endpoints');
}

testFieldFiltering().catch(console.error);
