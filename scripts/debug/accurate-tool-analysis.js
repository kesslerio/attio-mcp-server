#!/usr/bin/env node
/**
 * Accurate Tool Analysis Script
 * 
 * This script provides the correct tool count by importing the actual
 * tool definitions from the registry, not by parsing file patterns.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeActualTools() {
  console.log('🔍 Accurate MCP Tool Analysis\n');
  
  try {
    // Import the actual registry
    const registryPath = path.resolve(__dirname, '../../dist/handlers/tools/registry.js');
    const registry = await import(registryPath);
    
    const { TOOL_DEFINITIONS } = registry;
    
    console.log('📊 TOOL BREAKDOWN BY CATEGORY:');
    console.log('==============================');
    
    let totalTools = 0;
    const categoryBreakdown = {};
    
    Object.entries(TOOL_DEFINITIONS).forEach(([resourceType, definitions]) => {
      if (Array.isArray(definitions)) {
        console.log(`\n${resourceType.toUpperCase()}:`);
        console.log(`  Total: ${definitions.length} tools`);
        
        // Group tools by operation type
        const operationTypes = {};
        definitions.forEach(tool => {
          const name = tool.name.toLowerCase();
          let category = 'other';
          
          if (name.includes('search')) category = 'search';
          else if (name.includes('create')) category = 'create';
          else if (name.includes('update')) category = 'update';
          else if (name.includes('get')) category = 'read';
          else if (name.includes('batch')) category = 'batch';
          else if (name.includes('note')) category = 'notes';
          else if (name.includes('relationship')) category = 'relationships';
          else if (name.includes('attribute')) category = 'attributes';
          
          if (!operationTypes[category]) {
            operationTypes[category] = [];
          }
          operationTypes[category].push(tool.name);
        });
        
        Object.entries(operationTypes).forEach(([category, tools]) => {
          console.log(`  ${category}: ${tools.length} tools`);
          tools.forEach(toolName => {
            console.log(`    - ${toolName}`);
          });
        });
        
        categoryBreakdown[resourceType] = {
          total: definitions.length,
          breakdown: operationTypes
        };
        
        totalTools += definitions.length;
      }
    });
    
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`Total MCP Tools: ${totalTools}`);
    console.log(`Resource Types: ${Object.keys(TOOL_DEFINITIONS).length}`);
    
    // Compare with analysis script results
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
    
    console.log('\n🎯 TOOL COUNT DISCREPANCY ANALYSIS:');
    console.log('===================================');
    console.log(`Actual MCP Tools: ${totalTools}`);
    console.log(`Analysis Script Count: ${scriptCount}`);
    console.log(`Documentation Claims: 50`);
    
    const difference = totalTools - scriptCount;
    console.log(`\nDiscrepancy: ${difference} tools missing from analysis script`);
    
    if (difference > 0) {
      console.log('\n❌ ROOT CAUSE: Analysis script regex patterns are incomplete');
      console.log('The script looks for individual exports like "someToolConfig"');
      console.log('but actual exports are aggregated like "searchToolConfigs" containing multiple tools');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('==================');
    console.log('1. Update documentation to reflect actual tool count of', totalTools);
    console.log('2. Fix analysis script to import actual registry instead of parsing files');
    console.log('3. Use this accurate count for consolidation planning');
    
    // Save accurate results
    const accurateResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTools,
        totalCategories: Object.keys(TOOL_DEFINITIONS).length,
        method: 'registry-import'
      },
      categories: categoryBreakdown,
      comparisonAnalysis: {
        actualTools: totalTools,
        scriptCount,
        documentationClaim: 50,
        discrepancy: difference,
        rootCause: 'Script uses incomplete regex patterns instead of importing registry'
      }
    };
    
    const outputPath = path.resolve(__dirname, '../../tmp/accurate-tool-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(accurateResults, null, 2));
    console.log(`\n📁 Accurate results saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error analyzing tools:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeActualTools().catch(console.error);
}

export default analyzeActualTools;