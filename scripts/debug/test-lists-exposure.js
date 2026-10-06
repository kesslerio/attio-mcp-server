#!/usr/bin/env node

/**
 * Test script to verify Lists tools are properly exposed
 * This validates the fix for Issue #470
 */

import {
  TOOL_DEFINITIONS,
  findToolConfig,
} from '../../dist/handlers/tools/registry.js';

console.log('=== Testing Lists Tool Exposure (Issue #470) ===\n');

// Test 1: Check if Lists tools appear in TOOL_DEFINITIONS
console.log('Test 1: Lists tools in TOOL_DEFINITIONS');
const listToolsFound = TOOL_DEFINITIONS.lists || TOOL_DEFINITIONS.LISTS;
if (listToolsFound) {
  console.log('✅ Lists tools found in TOOL_DEFINITIONS');
  if (Array.isArray(listToolsFound)) {
    console.log(`   Found ${listToolsFound.length} Lists tools`);
    listToolsFound.slice(0, 3).forEach((tool) => {
      console.log(`   - ${tool.name}`);
    });
  } else {
    console.log('   Lists tools are in object format');
    console.log(`   Found ${Object.keys(listToolsFound).length} Lists tools`);
  }
} else {
  console.log('❌ Lists tools NOT found in TOOL_DEFINITIONS');
  console.log('Available categories:', Object.keys(TOOL_DEFINITIONS));
}

console.log();

// Test 2: Check if specific Lists tools can be found
console.log('Test 2: Finding specific Lists tools');
const testTools = [
  'lists_list',
  'lists_get',
  'list_entries_add',
  'list_entries_remove',
  'list_entries_update',
];

let foundCount = 0;
testTools.forEach((toolName) => {
  const toolConfig = findToolConfig(toolName);
  if (toolConfig) {
    console.log(`✅ Found: ${toolName} (resource: ${toolConfig.resourceType})`);
    foundCount++;
  } else {
    console.log(`❌ Missing: ${toolName}`);
  }
});

console.log();

// Test 3: Summary
console.log('=== Test Summary ===');
console.log(`Found ${foundCount}/${testTools.length} essential Lists tools`);

if (foundCount === testTools.length) {
  console.log('🎉 SUCCESS: All Lists tools are properly exposed!');
  console.log('Issue #470 should be resolved.');
} else {
  console.log('❌ FAILURE: Some Lists tools are still missing.');
  console.log('Issue #470 is NOT yet resolved.');
}
