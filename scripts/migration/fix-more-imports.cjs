#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'test');

// Function to fix imports in a file
function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace specific import paths that need index to be added
  const replacements = [
    {
      from: "from '../../src/objects/companies'",
      to: "from '../../src/objects/companies/index'",
    },
    {
      from: 'from "../../src/objects/companies"',
      to: 'from "../../src/objects/companies/index"',
    },
    {
      from: "jest.mock('../../src/objects/companies')",
      to: "jest.mock('../../src/objects/companies/index')",
    },
    {
      from: 'jest.mock("../../src/objects/companies")',
      to: 'jest.mock("../../src/objects/companies/index")',
    },
    {
      from: "from '../../src/handlers/tools'",
      to: "from '../../src/handlers/tools/index'",
    },
    {
      from: 'from "../../src/handlers/tools"',
      to: 'from "../../src/handlers/tools/index"',
    },
    // Fix the attio-operations import
    {
      from: "from '../../src/api/operations'",
      to: "from '../../src/api/operations/index'",
    },
    {
      from: 'from "../../src/api/operations"',
      to: 'from "../../src/api/operations/index"',
    },
    // Fix lingering attio-operations references
    {
      from: "('../../src/api/attio-operations')",
      to: "('../../src/api/operations/index')",
    },
  ];

  for (const { from, to } of replacements) {
    if (content.includes(from)) {
      content = content.replace(
        new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        to
      );
      modified = true;
    }
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
console.log('Fixing additional test imports...');
processDirectory(testDir);
console.log('Done fixing imports.');
