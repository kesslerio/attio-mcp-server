#!/usr/bin/env node

/**
 * Debug script to validate tool names across the codebase
 * Intelligently filters out legitimate legacy references to focus on actual problems
 * Shows only CRITICAL and HIGH priority issues by default
 */

import { universalToolDefinitions } from '../../dist/handlers/tool-configs/universal/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const quickMode = args.includes('--quick') || args.includes('-q');
const showHigh = args.includes('--high');
const showMedium = args.includes('--medium');
const showLow = args.includes('--low');
const showCritical = args.includes('--critical');

if (args.includes('--help') || args.includes('-h')) {
  console.log('🔍 Smart Tool Name Validation');
  console.log('=============================\n');
  console.log('Intelligently scans the codebase for legacy tool name usage,');
  console.log('filtering out legitimate references to focus on actual problems.\n');
  console.log('Usage:');
  console.log('  node scripts/debug/debug-tool-names.js [OPTIONS]\n');
  console.log('Options:');
  console.log('  --help, -h      Show this help message');
  console.log('  --verbose, -v   Show all findings (CRITICAL, HIGH, MEDIUM, LOW)');
  console.log('  --quick, -q     Fast mode: only check CRITICAL issues (MCP calls)');
  console.log('  --critical      Show only CRITICAL issues');
  console.log('  --high          Show only HIGH priority issues');
  console.log('  --medium        Show only MEDIUM priority issues');
  console.log('  --low           Show only LOW priority issues');
  console.log('\nPriority flags can be combined (e.g., --high --medium)\n');
  console.log('Default mode shows CRITICAL and HIGH priority issues only.\n');
  console.log('Examples:');
  console.log('  node scripts/debug/debug-tool-names.js --high --medium');
  console.log('  node scripts/debug/debug-tool-names.js --critical');
  console.log('  node scripts/debug/debug-tool-names.js --low\n');
  console.log('EXCLUDED (automatically filtered out):');
  console.log('  - Tool config definitions in src/handlers/tool-configs/');
  console.log('  - Migration documentation in docs/migration/, docs/universal-tools/');
  console.log('  - Lines with migration indicators (→, ->, "Should be")');
  console.log('  - Test mapping files');
  console.log('  - Archive files\n');
  process.exit(0);
}

console.log('🔍 SMART TOOL NAME VALIDATION' + (quickMode ? ' (QUICK MODE)' : ''));
console.log('==============================\n');

if (quickMode) {
  console.log('⚡ Quick Mode: Only checking for CRITICAL issues (MCP tool calls)\n');
}

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
const stats = {
  total: 0,
  excluded: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0
};

/**
 * Check if a tool reference is legitimate and should be excluded
 */
function isLegitimateReference(filePath, line, legacyTool) {
  // Tool config definitions (legitimate backward compatibility)
  if (filePath.includes('src/handlers/tool-configs/') && 
      (line.includes(`name: '${legacyTool}'`) || line.includes(`name: "${legacyTool}"`))) {
    return true;
  }
  
  // Migration documentation directories
  if (filePath.includes('docs/migration/') || filePath.includes('docs/universal-tools/')) {
    return true;
  }
  
  // Lines showing mappings/migrations (arrows, "Should be", table separators)
  if (line.includes('→') || line.includes('->') || line.includes('Should be') || 
      line.includes('Consolidates') || line.match(/\|\s*-+\s*\|/) ||
      line.includes('| Deprecated Tool | Universal Tool |')) {
    return true;
  }
  
  // Archive files (already excluded in directory traversal but double-check)
  if (filePath.includes('.archive/')) {
    return true;
  }
  
  // Test mapping files (test utilities for mapping validation)
  if (filePath.includes('test/mapping/') || filePath.includes('test-fixed-mapping')) {
    return true;
  }
  
  return false;
}

/**
 * Determine severity of a finding
 */
function getSeverity(filePath, line, legacyTool, pattern) {
  // CRITICAL: MCP tool calls using wrong names
  if (line.includes(`mcp__attio__${legacyTool}`)) {
    return 'CRITICAL';
  }
  
  // HIGH: Direct tool calls in production code (not in tool-configs)
  if (filePath.startsWith('src/') && !filePath.includes('tool-configs/') &&
      (line.includes(`'${legacyTool}'`) || line.includes(`"${legacyTool}"`)) &&
      (line.includes('name:') || line.includes('tool:') || line.includes('call'))) {
    return 'HIGH';
  }
  
  // MEDIUM: Tool calls in test files (may need updating)
  if (filePath.startsWith('test/') &&
      (line.includes(`'${legacyTool}'`) || line.includes(`"${legacyTool}"`))) {
    return 'MEDIUM';
  }
  
  // LOW: Comments, documentation, or other references
  return 'LOW';
}

function searchInFile(filePath, content) {
  const lines = content.split('\n');
  
  // Quick mode: only check for CRITICAL patterns (MCP calls)
  if (quickMode) {
    legacyTools.forEach(legacyTool => {
      lines.forEach((line, index) => {
        if (line.includes(`mcp__attio__${legacyTool}`)) {
          stats.total++;
          
          if (isLegitimateReference(filePath, line, legacyTool)) {
            stats.excluded++;
            return;
          }
          
          stats.critical++;
          findings.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
            legacyTool,
            pattern: `mcp__attio__${legacyTool}`,
            severity: 'CRITICAL'
          });
        }
      });
    });
    return;
  }
  
  // Full mode: check all patterns
  legacyTools.forEach(legacyTool => {
    lines.forEach((line, index) => {
      // Pre-filter: skip lines that can't possibly contain the tool name
      if (!line.includes(legacyTool)) {
        return;
      }
      
      // Look for quoted tool names and MCP tool calls
      // Use word boundaries and negative lookahead to avoid matching substrings of valid tools
      const patterns = [
        `'${legacyTool}'`,
        `"${legacyTool}"`,
        `mcp__attio__${legacyTool}\\b`, // Word boundary to avoid matching get-record within get-record-details
        `name: '${legacyTool}'`,
        `name: "${legacyTool}"`,
        // Handle cases where legacy tool might be in comments or documentation
        // Use negative lookahead to avoid matching get-record in get-record-details
        legacyTool === 'get-record' 
          ? new RegExp(`\\bget-record(?!-details)\\b`, 'g')
          : new RegExp(`\\b${legacyTool}\\b`, 'g')
      ];
      
      patterns.forEach(pattern => {
        if (typeof pattern === 'string' ? line.includes(pattern) : pattern.test(line)) {
          stats.total++;
          
          // Skip legitimate references entirely
          if (isLegitimateReference(filePath, line, legacyTool)) {
            stats.excluded++;
            return;
          }
          
          // Determine severity for remaining findings
          const severity = getSeverity(filePath, line, legacyTool, pattern);
          stats[severity.toLowerCase()]++;
          
          findings.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
            legacyTool,
            pattern: typeof pattern === 'string' ? pattern : pattern.source,
            severity
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

console.log('\n📊 SCAN STATISTICS');
console.log('==================\n');
console.log(`🔍 Total references found: ${stats.total}`);
console.log(`✅ Legitimate references excluded: ${stats.excluded}`);
console.log(`🚨 Issues to review: ${stats.critical + stats.high + stats.medium + stats.low}`);
console.log(`   - CRITICAL: ${stats.critical} (MCP tool calls using wrong names)`);
console.log(`   - HIGH: ${stats.high} (Production code using legacy tools)`);
console.log(`   - MEDIUM: ${stats.medium} (Test code using legacy tools)`);
console.log(`   - LOW: ${stats.low} (Comments/docs with legacy references)`);

// Filter findings based on priority flags or verbosity
let priorityFindings;
if (verbose) {
  priorityFindings = findings;
} else if (showCritical || showHigh || showMedium || showLow) {
  // Use specific priority flags
  const allowedSeverities = [];
  if (showCritical) allowedSeverities.push('CRITICAL');
  if (showHigh) allowedSeverities.push('HIGH');
  if (showMedium) allowedSeverities.push('MEDIUM');
  if (showLow) allowedSeverities.push('LOW');
  priorityFindings = findings.filter(f => allowedSeverities.includes(f.severity));
} else {
  // Default mode: CRITICAL + HIGH
  priorityFindings = findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
}

// Determine mode description
let modeDescription;
if (verbose) {
  modeDescription = ' (VERBOSE MODE)';
} else if (showCritical || showHigh || showMedium || showLow) {
  const selectedPriorities = [];
  if (showCritical) selectedPriorities.push('CRITICAL');
  if (showHigh) selectedPriorities.push('HIGH');
  if (showMedium) selectedPriorities.push('MEDIUM');
  if (showLow) selectedPriorities.push('LOW');
  modeDescription = ` (${selectedPriorities.join(' + ')} ONLY)`;
} else {
  modeDescription = ' (CRITICAL & HIGH ONLY)';
}

console.log('\n📋 PRIORITY ISSUES' + modeDescription);
console.log('===================\n');

if (priorityFindings.length === 0) {
  if (verbose) {
    console.log('✅ No legacy tool name issues found! All references are legitimate.');
  } else {
    console.log('✅ No CRITICAL or HIGH priority issues found!');
    if (stats.medium + stats.low > 0) {
      console.log(`📝 Note: ${stats.medium + stats.low} lower-priority references exist. Use --verbose to see them.`);
    }
  }
} else {
  console.log(`🎯 Showing ${priorityFindings.length} ${verbose ? '' : 'high-priority '}issues:\n`);
  
  // Group by severity, then by file
  const bySeverity = priorityFindings.reduce((acc, finding) => {
    if (!acc[finding.severity]) {
      acc[finding.severity] = {};
    }
    if (!acc[finding.severity][finding.file]) {
      acc[finding.severity][finding.file] = [];
    }
    acc[finding.severity][finding.file].push(finding);
    return acc;
  }, {});
  
  // Show in severity order
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const severityEmojis = { CRITICAL: '🚨', HIGH: '⚠️', MEDIUM: '📝', LOW: '💭' };
  
  severityOrder.forEach(severity => {
    if (bySeverity[severity]) {
      console.log(`${severityEmojis[severity]} ${severity} PRIORITY:`);
      Object.entries(bySeverity[severity]).forEach(([file, fileFindings]) => {
        console.log(`  📄 ${file}:`);
        fileFindings.forEach(finding => {
          console.log(`    Line ${finding.line}: ${finding.content}`);
          console.log(`      🔍 Found: ${finding.legacyTool}`);
          
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
            console.log(`      💡 Suggest: ${suggestions[finding.legacyTool]}`);
          }
        });
        console.log('');
      });
    }
  });
  
  console.log('🔧 NEXT STEPS:');
  console.log('- Focus on CRITICAL issues first (MCP tool calls)');
  console.log('- Review HIGH priority issues in production code');
  if (!verbose) {
    console.log('- Use --verbose flag to see all findings including MEDIUM and LOW priority');
    console.log('- Use priority flags like --high --medium to see specific priority levels');
  }
  if (!quickMode) {
    console.log('- Use --quick flag for faster CRITICAL-only scans');
  }
  console.log('- Legitimate references in tool-configs and migration docs are automatically excluded');
}

console.log('\n✅ Tool name validation complete!');