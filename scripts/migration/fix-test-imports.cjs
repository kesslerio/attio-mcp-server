#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'test');

// Function to fix imports in a file
function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace .js extensions in import statements
  const jsImportPattern = /(from\s+['"])(\.\.\/[^'"]+)(\.js)(['"])/g;
  if (jsImportPattern.test(content)) {
    content = content.replace(jsImportPattern, '$1$2$4');
    modified = true;
  }

  // Specific replacements for known patterns
  const replacements = [
    {
      from: "from '../../src/handlers/tools.js'",
      to: "from '../../src/handlers/tools'",
    },
    {
      from: 'from "../../src/handlers/tools.js"',
      to: 'from "../../src/handlers/tools"',
    },
    {
      from: "from '../../src/api/attio-operations.js'",
      to: "from '../../src/api/operations'",
    },
    {
      from: 'from "../../src/api/attio-operations.js"',
      to: 'from "../../src/api/operations"',
    },
  ];

  for (const { from, to } of replacements) {
    if (content.includes(from)) {
      content = content.replace(new RegExp(from, 'g'), to);
      modified = true;
    }
  }

  // Also fix jest.mock statements
  const mockPattern = /jest\.mock\(['"]([^'"]+\.js)['"]\)/g;
  if (mockPattern.test(content)) {
    content = content.replace(mockPattern, (match, p1) => {
      return `jest.mock('${p1.replace('.js', '')}')`;
    });
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in: ${filePath}`);
  }
}

// Recursively find and fix all test files
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
      fixImports(filePath);
    }
  }
}

// Start processing
console.log('Fixing test imports...');
processDirectory(testDir);
console.log('Done fixing imports.');
