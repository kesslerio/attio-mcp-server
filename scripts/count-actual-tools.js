#!/usr/bin/env node
/**
 * Simple tool counter that gets the accurate MCP tool count
 * by importing the actual registry and counting tool definitions.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function countActualTools() {
  console.log('🔍 Counting actual MCP tools...\n');

  try {
    // Import the actual registry - try both .js and .ts
    let registry;
    try {
      const registryPath = path.resolve(
        __dirname,
        '../dist/handlers/tools/registry.js'
      );
      registry = await import(registryPath);
    } catch (error) {
      // Fallback to source TypeScript file
      const registryPath = path.resolve(
        __dirname,
        '../src/handlers/tools/registry.ts'
      );
      registry = await import(registryPath);
    }

    if (!registry.TOOL_DEFINITIONS) {
      console.error('❌ TOOL_DEFINITIONS not found in registry');
      return;
    }

    let totalTools = 0;
    const breakdown = {};
    const toolList = [];

    // Count tools in each category
    Object.entries(registry.TOOL_DEFINITIONS).forEach(
      ([category, definitions]) => {
        let categoryCount = 0;

        if (Array.isArray(definitions)) {
          categoryCount = definitions.length;
          definitions.forEach((tool) => {
            if (tool && tool.name) {
              toolList.push({ name: tool.name, category });
            }
          });
        } else if (definitions && typeof definitions === 'object') {
          categoryCount = Object.keys(definitions).length;
          Object.entries(definitions).forEach(([key, tool]) => {
            if (tool && tool.name) {
              toolList.push({ name: tool.name, category, key });
            }
          });
        }

        if (categoryCount > 0) {
          breakdown[category] = categoryCount;
          totalTools += categoryCount;
        }
      }
    );

    // Display results
    console.log('📊 MCP Tool Count Results:');
    console.log('=========================');
    console.log(`🎯 Total MCP Tools: ${totalTools}`);
    console.log('\n📂 Breakdown by Category:');

    Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        const percentage = ((count / totalTools) * 100).toFixed(1);
        console.log(`   ${category}: ${count} tools (${percentage}%)`);
      });

    console.log('\n📋 Tool List:');
    toolList
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      )
      .forEach((tool, index) => {
        console.log(
          `   ${(index + 1).toString().padStart(2, '0')}. ${tool.name} (${tool.category})`
        );
      });

    console.log(`\n✅ Analysis complete: Found ${totalTools} actual MCP tools`);

    return {
      totalTools,
      breakdown,
      toolList,
    };
  } catch (error) {
    console.error('❌ Failed to count tools:', error.message);
    console.error('\nTry building the project first: npm run build');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  countActualTools();
}

export default countActualTools;
