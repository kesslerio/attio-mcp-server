// Debug script to test tool lookup and notes migration
import { findToolConfig } from '../../dist/handlers/tools/registry.js';

console.log('=== TOOL LOOKUP DEBUG ===\n');

// Test 1: Universal create-record tool (should handle notes)
console.log('1. Testing universal create-record tool:');
try {
  const createResult = findToolConfig('create-record');
  if (createResult) {
    console.log('✅ Found create-record tool:');
    console.log('   - Resource Type:', createResult.resourceType);
    console.log('   - Tool Type:', createResult.toolType);
    console.log('   - Tool Name:', createResult.toolConfig.name);
  } else {
    console.log('❌ create-record tool not found');
  }
} catch (err) {
  console.error('❌ Error finding create-record:', err.message);
}

console.log('\n2. Testing notes resource type handling:');
try {
  // Test the migration path for legacy note tools
  console.log('   Testing legacy tool migration path...');
  
  // Simulate create-company-note parameters
  const legacyParams = {
    companyId: 'test-company-123',
    title: 'Test Note Title',
    content: 'Test note content for debugging'
  };
  
  console.log('   Legacy create-company-note params:', JSON.stringify(legacyParams, null, 2));
  
  // This would typically be handled by tool migration
  const migratedParams = {
    resource_type: 'notes',
    record_data: {
      title: legacyParams.title,
      content: legacyParams.content,
      linked_record_type: 'companies',
      linked_record_id: legacyParams.companyId
    }
  };
  
  console.log('   Migrated universal params:', JSON.stringify(migratedParams, null, 2));
  console.log('   ✅ Record data is object (not string):', typeof migratedParams.record_data === 'object');
  console.log('   ✅ Resource type is notes:', migratedParams.resource_type === 'notes');
  
} catch (err) {
  console.error('❌ Error testing notes migration:', err.message);
}

console.log('\n3. Testing other universal tools:');
const universalTools = ['search-records', 'get-record-details', 'delete-record', 'update-record', 'get-attributes', 'discover-attributes'];
for (const toolName of universalTools) {
  try {
    const result = findToolConfig(toolName);
    if (result) {
      console.log(`   ✅ ${toolName}: found`);
    } else {
      console.log(`   ❌ ${toolName}: not found`);
    }
  } catch (err) {
    console.log(`   ❌ ${toolName}: error - ${err.message}`);
  }
}

console.log('\n=== DEBUG COMPLETE ===');