#!/usr/bin/env node

import { execSync } from 'child_process';
/**
 * Script to organize test files from project root into proper test directory structure
 */
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Define mapping of test files to their destinations
const testFileMapping = {
  // Attribute mapping tests
  'test-various-mappings.js':
    'utils/attribute-mapping/various-mappings-test.js',
  'test-value-match.js': 'utils/attribute-mapping/value-match-test.js',
  'test-value-matching.js': 'utils/attribute-mapping/value-matching-test.js',
  'test-specific-mappings.js':
    'utils/attribute-mapping/specific-mappings-test.js',
  'test-type-persona-values.js':
    'utils/attribute-mapping/type-persona-values-test.js',

  // Error handling tests
  'test-error-handler.mjs': 'errors/error-handler-test.mjs',
  'test-simple-error.js': 'errors/simple-error-test.js',
  'test-simple-error.mjs': 'errors/simple-error-test.mjs',
  'test-direct-error.js': 'errors/direct-error-test.js',
  'test-final-enhancement.mjs': 'errors/final-enhancement-test.mjs',

  // Integration tests
  'test-complete-integration.js': 'integration/complete-integration-test.js',
  'test-value-matching-integration.js':
    'integration/value-matching-integration-test.js',

  // Object tests
  'test-company-details.js': 'objects/company-details-test.js',
  'test-list-entries.js': 'objects/list-entries-test.js',

  // Text samples (small text files likely used for testing text parsing)
  'test-attribution-block.txt': 'utils/text-samples/attribution-block.txt',
  'test-attribution.txt': 'utils/text-samples/attribution.txt',
  'test-commit-msg.txt': 'utils/text-samples/commit-msg.txt',
  'test-commit-pattern.txt': 'utils/text-samples/commit-pattern.txt',
};

// Ensure directories exist
const requiredDirs = [
  'utils/attribute-mapping',
  'utils/text-samples',
  'errors',
  'integration',
  'objects',
].map((dir) => path.join(projectRoot, 'test', dir));

requiredDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Move files to their destinations
Object.entries(testFileMapping).forEach(([sourceFile, destPath]) => {
  const sourcePath = path.join(projectRoot, sourceFile);
  const destFullPath = path.join(projectRoot, 'test', destPath);

  if (fs.existsSync(sourcePath)) {
    // Copy file to ensure no data loss
    console.log(`Moving ${sourcePath} to ${destFullPath}`);
    fs.copyFileSync(sourcePath, destFullPath);

    // Check if copy succeeded before removing
    if (fs.existsSync(destFullPath)) {
      fs.unlinkSync(sourcePath);
      console.log(`Successfully moved ${sourcePath}`);
    } else {
      console.error(`Failed to copy ${sourcePath} to ${destFullPath}`);
    }
  } else {
    console.warn(`Source file not found: ${sourcePath}`);
  }
});

console.log('Test file organization complete.');
