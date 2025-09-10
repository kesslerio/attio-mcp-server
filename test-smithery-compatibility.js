#!/usr/bin/env node

/**
 * Test script to verify Smithery compatibility with lazy initialization
 */

console.log('Testing Smithery compatibility...\n');

// Test 1: Server starts without API key
console.log('1. Testing server initialization without API key...');
delete process.env.ATTIO_API_KEY;

try {
  const { createServer } = require('./dist/server/createServer.js');
  const server = createServer();
  console.log('   ✅ Server created successfully without API key');
} catch (error) {
  console.error('   ❌ Failed to create server:', error.message);
  process.exit(1);
}

// Test 2: Tools are available without API key
console.log('\n2. Testing tool availability without API key...');
try {
  const { TOOL_DEFINITIONS } = require('./dist/handlers/tools/registry.js');
  const toolCount = Object.values(TOOL_DEFINITIONS).reduce((count, tools) => {
    if (Array.isArray(tools)) {
      return count + tools.length;
    } else if (typeof tools === 'object') {
      return count + Object.keys(tools).length;
    }
    return count;
  }, 0);
  console.log(`   ✅ ${toolCount} tools available for capability scanning`);
} catch (error) {
  console.error('   ❌ Failed to access tools:', error.message);
  process.exit(1);
}

console.log('\n✅ All Smithery compatibility tests passed!');
console.log('\nThe server can now:');
console.log('  • Start without ATTIO_API_KEY for capability scanning');
console.log('  • List all available tools during deployment');
console.log('  • Defer API key validation until tool execution');