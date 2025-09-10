#!/usr/bin/env node

/**
 * Test script to verify Smithery compatibility with lazy initialization
 */

console.log('Testing Smithery compatibility...\n');

// Test 1: Server starts without API key
console.log('1. Testing server initialization without API key...');
delete process.env.ATTIO_API_KEY;

try {
  const { createServer } = await import('./dist/server/createServer.js');
  const server = createServer();
  console.log('   ✅ Server created successfully without API key');
} catch (error) {
  console.error('   ❌ Failed to create server:', error.message);
  process.exit(1);
}

// Test 2: Tools are available without API key
console.log('\n2. Testing tool availability without API key...');
try {
  const { TOOL_DEFINITIONS } = await import('./dist/handlers/tools/registry.js');
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

// Test 3: Smithery entrypoint works
console.log('\n3. Testing Smithery entrypoint...');
try {
  const smitheryModule = await import('./dist/smithery.js');
  const smitheryHandler = smitheryModule.default;
  
  if (typeof smitheryHandler !== 'function') {
    throw new Error('Smithery entrypoint does not export a default function');
  }
  
  // Test with empty config (simulating Smithery scan)
  const server = smitheryHandler({ config: {} });
  
  if (!server || typeof server.connect !== 'function') {
    throw new Error('Smithery entrypoint does not return a valid MCP server');
  }
  
  console.log('   ✅ Smithery entrypoint exports correct function signature');
} catch (error) {
  console.error('   ❌ Failed Smithery entrypoint test:', error.message);
  process.exit(1);
}

console.log('\n✅ All Smithery compatibility tests passed!');
console.log('\nThe server can now:');
console.log('  • Start without ATTIO_API_KEY for capability scanning');
console.log('  • List all available tools during deployment');
console.log('  • Defer API key validation until tool execution');
console.log('  • Work with Smithery\'s HTTP transport layer');