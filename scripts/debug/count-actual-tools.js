#!/usr/bin/env node
/**
 * Count Actual MCP Tools Script
 * 
 * This script analyzes what tools are actually registered with the MCP server
 * vs what the analysis script is counting vs what documentation claims.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the actual registry to count real tools
async function importRegistry() {
  const registryPath = path.resolve(__dirname, '../../dist/handlers/tools/registry.js');
  try {
    const registry = await import(registryPath);
    return registry;
  } catch (error) {
    console.error('Error importing registry:', error.message);
    return null;
  }
}

async function countActualTools() {
  console.log('🔍 Counting Actual MCP Tools vs Script vs Documentation Claims\n');
  
  const registry = await importRegistry();
  if (!registry) {
    console.error('❌ Could not import registry');
    return;
  }

  console.log('📊 TOOL DEFINITIONS (What gets registered with MCP):');
  console.log('=====================================================');
  
  const { TOOL_DEFINITIONS } = registry;
  
  let totalDefinitions = 0;
  Object.entries(TOOL_DEFINITIONS).forEach(([resourceType, definitions]) => {
    if (Array.isArray(definitions)) {
      console.log(`${resourceType}: ${definitions.length} tools`);
      totalDefinitions += definitions.length;
    }
  });
  
  console.log(`\n✅ TOTAL MCP REGISTERED TOOLS: ${totalDefinitions}`);
  
  console.log('\n📋 TOOL CONFIGS (Internal configurations):');
  console.log('==========================================');
  
  const { TOOL_CONFIGS } = registry;
  
  let totalConfigs = 0;
  Object.entries(TOOL_CONFIGS).forEach(([resourceType, configs]) => {
    if (configs && typeof configs === 'object') {
      const configCount = Object.keys(configs).length;
      console.log(`${resourceType}: ${configCount} configs`);
      totalConfigs += configCount;
    }
  });
  
  console.log(`\n✅ TOTAL TOOL CONFIGS: ${totalConfigs}`);
  
  // Read analysis script results
  const analysisResultsPath = path.resolve(__dirname, '../../tmp/tool-analysis-results.json');
  let scriptCount = 0;
  if (fs.existsSync(analysisResultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(analysisResultsPath, 'utf8'));
      scriptCount = results.summary.totalTools;
    } catch (error) {
      console.warn('Could not read analysis results:', error.message);
    }
  }
  
  console.log('\n🔍 COMPARISON ANALYSIS:');
  console.log('======================');
  console.log(`Analysis Script Count: ${scriptCount}`);
  console.log(`Actual MCP Tools: ${totalDefinitions}`);
  console.log(`Internal Configs: ${totalConfigs}`);
  console.log(`Documentation Claims: 50`);
  
  console.log('\n🎯 DISCREPANCY ANALYSIS:');
  console.log('========================');
  
  if (scriptCount === totalDefinitions) {
    console.log('✅ Analysis script correctly counts MCP registered tools');
  } else if (scriptCount === totalConfigs) {
    console.log('⚠️  Analysis script counts internal configs, not MCP tools');
  } else {
    console.log('❌ Analysis script count doesn\'t match any expected value');
  }
  
  if (totalDefinitions !== 50) {
    console.log(`⚠️  Documentation claims 50 tools but actual count is ${totalDefinitions}`);
    console.log('    This suggests documentation was written with different assumptions');
    
    const potentialSource = totalConfigs * 2; // Config + Definition pairs
    if (potentialSource >= 45 && potentialSource <= 55) {
      console.log(`💡 50 might come from counting both configs and definitions: ${totalConfigs} × 2 ≈ ${potentialSource}`);
    }
  } else {
    console.log('✅ Documentation tool count matches actual MCP tools');
  }
  
  console.log('\n📝 WHAT EACH COUNT REPRESENTS:');
  console.log('==============================');
  console.log(`• MCP Tools (${totalDefinitions}): Tools actually registered with MCP server`);
  console.log(`• Configs (${totalConfigs}): Internal tool configurations`);
  console.log(`• Script Count (${scriptCount}): What analysis script detects`);
  console.log('• Documentation (50): Claimed tool count for optimization');
  
  console.log('\n🎯 CORRECT TOOL COUNT:');
  console.log('======================');
  console.log(`The Attio MCP Server has ${totalDefinitions} actual tools`);
  console.log('This is what users see and what affects performance/context window usage');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  countActualTools().catch(console.error);
}

export default countActualTools;