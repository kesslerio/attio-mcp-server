// Debug script to test tool lookup and notes migration
import { findToolConfig } from '../../dist/handlers/tools/registry.js';

console.log('=== TOOL LOOKUP DEBUG ===\n');

// Test 1: Universal records_create tool (should handle notes)
console.log('1. Testing universal records_create tool:');
try {
  const createResult = findToolConfig('records_create');
  if (createResult) {
    console.log('✅ Found records_create tool:');
    console.log('   - Resource Type:', createResult.resourceType);
    console.log('   - Tool Type:', createResult.toolType);
    console.log('   - Tool Name:', createResult.toolConfig.name);
  } else {
    console.log('❌ records_create tool not found');
  }
} catch (err) {
  console.error('❌ Error finding records_create:', err.message);
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
const universalTools = ['records_search', 'records_get_details', 'records_delete', 'records_update', 'records_get_attributes', 'records_discover_attributes'];
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