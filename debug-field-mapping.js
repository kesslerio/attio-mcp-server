#!/usr/bin/env node

/**
 * Debug script for Issue #473 - Field mapping problem isolation
 * This script will help us understand exactly what's happening to the field data
 */

import { UniversalCreateService } from './src/services/UniversalCreateService.js';
import { UniversalUpdateService } from './src/services/UniversalUpdateService.js';
import { UniversalResourceType } from './src/handlers/tool-configs/universal/types.js';

async function debugFieldMapping() {
  console.log('🔍 DEBUG: Field Mapping Investigation for Issue #473');
  console.log('=' .repeat(60));
  
  try {
    // Create a test company
    console.log('\n1. Creating test company...');
    const company = await UniversalCreateService.createRecord({
      resource_type: UniversalResourceType.COMPANIES,
      record_data: { name: 'Debug Test Co' }
    });
    
    const companyId = company.id.record_id;
    console.log(`✅ Created company: ${companyId}`);
    
    // Test the field mapping by updating with 'description'
    console.log('\n2. Updating company with "description" field...');
    console.log('   Input data: { description: "Test description value" }');
    
    const updated = await UniversalUpdateService.updateRecord({
      resource_type: UniversalResourceType.COMPANIES,
      record_id: companyId,
      record_data: { description: 'Test description value' }
    });
    
    console.log('\n3. Updated company response:');
    console.log('   Company ID:', updated.id?.record_id || 'N/A');
    
    // Check what fields are actually set
    if (updated.values) {
      const relevantFields = ['description', 'notes', 'name'];
      console.log('\n4. Field values in response:');
      
      for (const field of relevantFields) {
        const value = updated.values[field];
        if (value && Array.isArray(value) && value.length > 0) {
          console.log(`   ${field}: "${value[0].value || value[0]}"`);
        } else if (value) {
          console.log(`   ${field}: "${value}"`);
        } else {
          console.log(`   ${field}: (empty/not present)`);
        }
      }
    }
    
    console.log('\n✅ DEBUG COMPLETE');
    
  } catch (error) {
    console.error('\n❌ DEBUG FAILED:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

// Run the debug
debugFieldMapping().catch(console.error);