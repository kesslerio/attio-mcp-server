#!/usr/bin/env node

/**
 * Automated TypeScript 'any' type reducer
 * Performs safe bulk replacements to dramatically reduce ESLint warnings
 * 
 * Safe transformations applied:
 * 1. Record<string, any> → Record<string, unknown>
 * 2. catch(error: any) → catch(error: unknown)
 * 3. any[] → unknown[]
 * 4. : any (in safe contexts) → : unknown
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Files to skip (tests might need special handling)
const SKIP_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.archive/**',
  '**/build/**'
];

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
    name: 'function parameters',
    pattern: /\(([^)]*?):\s*any([,)])/g,
    replacement: '($1: unknown$2',
    counter: 'simpleAnyReplaced'
  },
  {
    name: 'variable declarations',
    pattern: /^(\s*(?:let|const|var)\s+\w+):\s*any(\s*[;=])/gm,
    replacement: '$1: unknown$2',
    counter: 'simpleAnyReplaced'
  },
  {
    name: 'type declarations',
    pattern: /^(\s*type\s+\w+\s*=\s*)any(\s*[;|])/gm,
    replacement: '$1unknown$2',
    counter: 'simpleAnyReplaced'
  },
  {
    name: 'interface properties',
    pattern: /^(\s*\w+\??:\s*)any(\s*[;,}])/gm,
    replacement: '$1unknown$2',
    counter: 'simpleAnyReplaced'
  },
  {
    name: 'as any casts',
    pattern: /\s+as\s+any\b/g,
    replacement: ' as unknown',
    counter: 'simpleAnyReplaced'
  }
];

// Additional safe but more complex patterns
const COMPLEX_TRANSFORMATIONS = [
  {
    name: 'Promise<any>',
    pattern: /Promise<any>/g,
    replacement: 'Promise<unknown>',
    counter: 'simpleAnyReplaced'
  },
  {
    name: 'Observable<any>',
    pattern: /Observable<any>/g,
    replacement: 'Observable<unknown>',
    counter: 'simpleAnyReplaced'
  },
  {
    name: 'EventEmitter<any>',
    pattern: /EventEmitter<any>/g,
    replacement: 'EventEmitter<unknown>',
    counter: 'simpleAnyReplaced'
  }
];

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = content;
    let fileChanges = 0;

    // Apply all transformations
    [...TRANSFORMATIONS, ...COMPLEX_TRANSFORMATIONS].forEach(transform => {
      const matches = modified.match(transform.pattern);
      if (matches) {
        const count = matches.length;
        modified = modified.replace(transform.pattern, transform.replacement);
        stats[transform.counter] += count;
        fileChanges += count;
        console.log(`  ✓ Replaced ${count} ${transform.name} patterns`);
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

function findTypeScriptFiles() {
  const pattern = '**/*.{ts,tsx}';
  return globSync(pattern, {
    ignore: SKIP_PATTERNS,
    cwd: process.cwd()
  });
}

async function main() {
  console.log('🚀 Starting automated TypeScript any-type reduction...\n');
  
  const files = findTypeScriptFiles();
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
  const estimatedReduction = Math.floor(stats.totalReplacements * 0.9); // Conservative estimate
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

export { processFile, TRANSFORMATIONS };