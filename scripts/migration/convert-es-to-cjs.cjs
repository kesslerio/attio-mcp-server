#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'test');

// Function to convert ES modules to CommonJS in .js test files
function convertToCommonJS(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Convert import statements to require
  const importPattern =
    /^import\s+({[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"](.*)['"]\s*;?$/gm;

  if (importPattern.test(content)) {
    content = content.replace(importPattern, (match, imports, module) => {
      // Handle destructuring imports
      if (imports.startsWith('{')) {
        return `const ${imports} = require('${module}');`;
      }
      // Handle namespace imports
      if (imports.includes('*')) {
        const alias = imports.split('as')[1].trim();
        return `const ${alias} = require('${module}');`;
      }
      // Handle default imports

      return `const ${imports} = require('${module}');`;
    });
    modified = true;
  }

  // Convert export statements to module.exports
  const exportPattern =
    /^export\s+(const|let|var|function|class|default)\s+(.*)$/gm;

  if (exportPattern.test(content)) {
    content = content.replace(exportPattern, (match, type, rest) => {
      if (type === 'default') {
        return `module.exports = ${rest}`;
      }
      return `${type} ${rest}\nmodule.exports.${rest.split(' ')[0]} = ${rest.split(' ')[0]};`;
    });
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Converted to CommonJS: ${filePath}`);
  }
}

// Recursively find and convert all JavaScript test files
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.test.js') && !file.includes('.test.ts')) {
      convertToCommonJS(filePath);
    }
  }
}

// Start processing
console.log('Converting JavaScript test files from ES modules to CommonJS...');
processDirectory(testDir);
console.log('Done converting to CommonJS.');
