#!/usr/bin/env node

/**
 * Relationship Schema Probe Script
 * 
 * Probes the Attio API to understand relationship structures,
 * endpoints, and supported operations for the search-by-relationship tool
 */

import { getAttioClient } from '../../dist/api/attio-client.js';

async function probeRelationships() {
  try {
    console.log('🔍 Probing Attio API for relationship schemas...\n');
    
    const client = getAttioClient();
    
    // Get workspace configuration to understand available objects
    console.log('📋 Getting workspace configuration...');
    const workspaceConfig = await client.get('/v2/workspace');
    console.log('Workspace ID:', workspaceConfig.data.id);
    console.log('Available objects:', workspaceConfig.data.objects?.map(obj => obj.object_id).slice(0, 10), '\n');
    
    // Try to get object schemas for common resources
    const commonObjects = ['companies', 'people', 'deals', 'tasks'];
    
    for (const objectType of commonObjects) {
      try {
        console.log(`🏢 Probing ${objectType} object schema...`);
        const objectSchema = await client.get(`/v2/objects/${objectType}`);
        
        console.log(`  - Object ID: ${objectSchema.data.id.object_id}`);
        console.log(`  - Plural name: ${objectSchema.data.plural_noun}`);
        console.log(`  - Attributes count: ${objectSchema.data.attributes?.length || 0}`);
        
        // Look for relationship attributes
        const relationshipAttrs = objectSchema.data.attributes?.filter(
          attr => attr.attribute_type === 'record-reference'
        ) || [];
        
        console.log(`  - Relationship attributes: ${relationshipAttrs.length}`);
        relationshipAttrs.forEach(attr => {
          console.log(`    * ${attr.slug}: references ${attr.config?.target_object || 'unknown'}`);
        });
        
        console.log();
      } catch (error) {
        console.log(`  ❌ Error probing ${objectType}: ${error.message}\n`);
      }
    }
    
    // Test relationship endpoints
    console.log('🔗 Testing relationship endpoint patterns...');
    
    const testEndpoints = [
      '/v2/objects/companies/relationships',
      '/v2/objects/people/relationships', 
      '/v2/relationships',
      '/v2/workspace/relationships'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        console.log(`Testing: ${endpoint}`);
        const response = await client.get(endpoint);
        console.log(`  ✅ Success: Found ${Array.isArray(response.data) ? response.data.length : 'data'} relationships`);
      } catch (error) {
        console.log(`  ❌ Failed: ${error.response?.status || 'unknown'} - ${error.message}`);
      }
    }
    
    console.log('\n📝 Sample relationship query test...');
    
    // Try a sample relationship query
    try {
      const sampleQuery = await client.post('/v2/objects/companies/records/query', {
        filter: {
          "$and": [
            {
              "path": [
                ["companies", "associated_people"],
                ["people", "name"]
              ],
              "constraints": {
                "first_name": "test"
              }
            }
          ]
        },
        limit: 1
      });
      
      console.log('✅ Sample relationship query succeeded');
      console.log('Response structure:', Object.keys(sampleQuery.data));
      
    } catch (error) {
      console.log('❌ Sample relationship query failed:', error.response?.status, error.message);
      if (error.response?.data) {
        console.log('API Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Probe failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  probeRelationships()
    .then(() => {
      console.log('\n✅ Relationship probe completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Probe script failed:', error.message);
      process.exit(1);
    });
}

export { probeRelationships };