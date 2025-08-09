#!/usr/bin/env node

/**
 * Simplified TypeScript 'any' type reducer
 * Performs safe bulk replacements to dramatically reduce ESLint warnings
 */

import fs from 'fs';
import path from 'path';

// Statistics tracking
let stats = {
  filesProcessed: 0,
  recordAnyReplaced: 0,
  catchAnyReplaced: 0,
  arrayAnyReplaced: 0,
  simpleAnyReplaced: 0,
  totalReplacements: 0,
  skippedFiles: 0
};

// Safe transformation patterns
const TRANSFORMATIONS = [
  {
    name: 'Record<string, any>',
    pattern: /Record<string,\s*any>/g,
    replacement: 'Record<string, unknown>',
    counter: 'recordAnyReplaced'
  },
  {
    name: 'Record<any, any>',
    pattern: /Record<any,\s*any>/g,
    replacement: 'Record<string, unknown>',
    counter: 'recordAnyReplaced'
  },
  {
    name: 'catch blocks',
    pattern: /catch\s*\(([^:)]+):\s*any\)/g,
    replacement: 'catch($1: unknown)',
    counter: 'catchAnyReplaced'
  },
  {
    name: 'array types',
    pattern: /:\s*any\[\]/g,
    replacement: ': unknown[]',
    counter: 'arrayAnyReplaced'
  },
  {
    name: 'Array<any>',
    pattern: /Array<any>/g,
    replacement: 'Array<unknown>',
    counter: 'arrayAnyReplaced'
  },
  {
    name: 'Promise<any>',
    pattern: /Promise<any>/g,
    replacement: 'Promise<unknown>',
    counter: 'simpleAnyReplaced'
  },
  {
    name: 'as any casts',
    pattern: /\s+as\s+any\b/g,
    replacement: ' as unknown',
    counter: 'simpleAnyReplaced'
  }
];

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = content;
    let fileChanges = 0;

    // Apply all transformations
    TRANSFORMATIONS.forEach(transform => {
      const originalLength = modified.length;
      const matches = modified.match(transform.pattern);
      if (matches) {
        const count = matches.length;
        modified = modified.replace(transform.pattern, transform.replacement);
        stats[transform.counter] += count;
        fileChanges += count;
      }
    });

    // Only write if changes were made
    if (fileChanges > 0) {
      fs.writeFileSync(filePath, modified, 'utf8');
      stats.filesProcessed++;
      stats.totalReplacements += fileChanges;
      console.log(`📝 ${path.relative(process.cwd(), filePath)}: ${fileChanges} replacements`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stats.skippedFiles++;
    return false;
  }
}

function findTypeScriptFiles(dir, files = []) {
  // Skip certain directories
  const skipDirs = ['node_modules', 'dist', 'build', '.git', '.archive'];
  const dirName = path.basename(dir);
  
  if (skipDirs.includes(dirName)) {
    return files;
  }

  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findTypeScriptFiles(fullPath, files);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

async function main() {
  console.log('🚀 Starting automated TypeScript any-type reduction...\n');
  
  const projectRoot = process.cwd();
  const files = findTypeScriptFiles(projectRoot);
  console.log(`Found ${files.length} TypeScript files to process\n`);

  // Process files
  files.forEach(file => {
    processFile(file);
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TRANSFORMATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files skipped: ${stats.skippedFiles}`);
  console.log('\nReplacements by type:');
  console.log(`  Record<string, any> → Record<string, unknown>: ${stats.recordAnyReplaced}`);
  console.log(`  catch(e: any) → catch(e: unknown): ${stats.catchAnyReplaced}`);
  console.log(`  any[] → unknown[]: ${stats.arrayAnyReplaced}`);
  console.log(`  Other any → unknown: ${stats.simpleAnyReplaced}`);
  console.log(`\n🎯 Total replacements: ${stats.totalReplacements}`);
  
  // Estimate warning reduction
  const estimatedReduction = Math.floor(stats.totalReplacements * 0.9);
  console.log(`\n✨ Estimated warning reduction: ~${estimatedReduction} warnings`);
  console.log(`   From: 1027 warnings`);
  console.log(`   To: ~${1027 - estimatedReduction} warnings`);
  
  console.log('\n⚠️  Next steps:');
  console.log('1. Run: npm run build');
  console.log('2. Run: npm test');
  console.log('3. Run: npm run lint:check');
  console.log('4. Review any compilation errors and adjust as needed');
  console.log('5. Commit changes if all tests pass');
}

// Run the script
main().catch(console.error);