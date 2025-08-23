#!/usr/bin/env node

/**
 * Debug script to validate tool names across the codebase
 * Checks for incorrect/legacy tool name usage and validates against actual universal tools
 */

import { universalToolDefinitions } from '../../dist/handlers/tool-configs/universal/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('🔍 TOOL NAME VALIDATION');
console.log('=======================\n');

// Get actual universal tool names
const actualTools = Object.keys(universalToolDefinitions).sort();
console.log('✅ Current Universal Tools:', actualTools.length);
actualTools.forEach(tool => console.log(`  - ${tool}`));
console.log('');

// Known legacy/incorrect tool mappings to check for
const legacyTools = [
  'get-record', // Should be get-record-details
  'search-companies', // Should be search-records
  'search-people', // Should be search-records
  'list-records', // Should be search-records
  'list-tasks', // Should be search-records
  'create-company', // Should be create-record
  'create-person', // Should be create-record
  'create-task', // Should be create-record
  'update-company', // Should be update-record
  'update-person', // Should be update-record
  'update-task', // Should be update-record
  'delete-company', // Should be delete-record
  'delete-person', // Should be delete-record
  'delete-task', // Should be delete-record
  'get-company-details', // Should be get-record-details
  'get-person-details', // Should be get-record-details
  'get-task-details', // Should be get-record-details
];

console.log('🚫 Legacy Tools to Check For:', legacyTools.length);
legacyTools.forEach(tool => console.log(`  - ${tool}`));
console.log('');

// File patterns to search
const searchPatterns = [
  '**/*.ts',
  '**/*.js',
  '**/*.md'
];

// Directories to search
const searchDirs = [
  'src',
  'docs',
  'test',
  'scripts'
];

console.log('🔍 Searching for legacy tool references...\n');

const findings = [];

function searchInFile(filePath, content) {
  const lines = content.split('\n');
  
  legacyTools.forEach(legacyTool => {
    lines.forEach((line, index) => {
      // Look for quoted tool names and MCP tool calls
      const patterns = [
        `'${legacyTool}'`,
        `"${legacyTool}"`,
        `mcp__attio__${legacyTool}`,
        `name: '${legacyTool}'`,
        `name: "${legacyTool}"`,
        // Handle cases where legacy tool might be in comments or documentation
        new RegExp(`\\b${legacyTool}\\b`, 'g')
      ];
      
      patterns.forEach(pattern => {
        if (typeof pattern === 'string' ? line.includes(pattern) : pattern.test(line)) {
          // Skip if it's in a mapping that shows legacy -> new (which is correct)
          if (line.includes('→') || line.includes('->') || line.includes('Should be')) {
            return;
          }
          
          findings.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
            legacyTool,
            pattern: typeof pattern === 'string' ? pattern : pattern.source
          });
        }
      });
    });
  });
}

function searchDirectory(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .git, dist (built files), and .archive
        if (!['node_modules', '.git', 'dist', '.archive', '.windsurf'].includes(entry.name)) {
          searchDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        // Check file extensions
        const ext = path.extname(entry.name);
        if (['.ts', '.js', '.md'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relativePath = path.relative(projectRoot, fullPath);
            searchInFile(relativePath, content);
          } catch (error) {
            console.log(`⚠️  Could not read ${fullPath}: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not search directory ${dir}: ${error.message}`);
  }
}

// Search each directory
for (const dir of searchDirs) {
  const fullDir = path.join(projectRoot, dir);
  if (fs.existsSync(fullDir)) {
    console.log(`🔍 Searching ${dir}/...`);
    searchDirectory(fullDir);
  }
}

console.log('\n📋 RESULTS');
console.log('===========\n');

if (findings.length === 0) {
  console.log('✅ No legacy tool names found! All tool references appear to be using current universal tools.');
} else {
  console.log(`❌ Found ${findings.length} potential legacy tool name references:\n`);
  
  // Group by file for better readability
  const byFile = findings.reduce((acc, finding) => {
    if (!acc[finding.file]) {
      acc[finding.file] = [];
    }
    acc[finding.file].push(finding);
    return acc;
  }, {});
  
  Object.entries(byFile).forEach(([file, fileFindings]) => {
    console.log(`📄 ${file}:`);
    fileFindings.forEach(finding => {
      console.log(`  Line ${finding.line}: ${finding.content}`);
      console.log(`    🔍 Found: ${finding.legacyTool}`);
      
      // Suggest replacement
      const suggestions = {
        'get-record': 'get-record-details',
        'search-companies': 'search-records (with resource_type: "companies")',
        'search-people': 'search-records (with resource_type: "people")',
        'list-records': 'search-records',
        'list-tasks': 'search-records (with resource_type: "tasks")',
        'create-company': 'create-record (with resource_type: "companies")',
        'create-person': 'create-record (with resource_type: "people")',
        'create-task': 'create-record (with resource_type: "tasks")',
        'update-company': 'update-record (with resource_type: "companies")',
        'update-person': 'update-record (with resource_type: "people")',
        'update-task': 'update-record (with resource_type: "tasks")',
        'delete-company': 'delete-record (with resource_type: "companies")',
        'delete-person': 'delete-record (with resource_type: "people")',
        'delete-task': 'delete-record (with resource_type: "tasks")',
        'get-company-details': 'get-record-details (with resource_type: "companies")',
        'get-person-details': 'get-record-details (with resource_type: "people")',
        'get-task-details': 'get-record-details (with resource_type: "tasks")'
      };
      
      if (suggestions[finding.legacyTool]) {
        console.log(`    💡 Suggest: ${suggestions[finding.legacyTool]}`);
      }
    });
    console.log('');
  });
  
  console.log('🔧 REMEDIATION STEPS:');
  console.log('- Review each finding to determine if it needs updating');
  console.log('- Some findings might be in documentation showing migrations (which is correct)');
  console.log('- Replace actual legacy tool usage with universal tool equivalents');
  console.log('- Update MCP tool calls to use new naming convention');
}

console.log('\n✅ Tool name validation complete!');