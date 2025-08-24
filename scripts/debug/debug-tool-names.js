#!/usr/bin/env node

/**
 * Debug script to validate tool names across the codebase
 * Intelligently filters out legitimate legacy references to focus on actual problems
 * Shows only CRITICAL and HIGH priority issues by default
 */

import { universalToolDefinitions } from '../../dist/handlers/tool-configs/universal/index.js';
import { TOOL_MAPPING_RULES } from '../../dist/test/e2e/utils/tool-migration.js';
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
  console.log('🔍 Comprehensive Legacy Tool Detection & Analysis');
  console.log('==============================================\n');
  console.log('Comprehensively discovers and analyzes legacy tool usage across the codebase.');
  console.log('Combines authoritative mappings with dynamic discovery for complete coverage.\n');
  console.log('Features:');
  console.log('  ✅ Dynamic discovery from all handler configurations (86+ tools)');
  console.log('  ✅ Authoritative mappings from tool-migration.ts (28+ tools)');
  console.log('  ✅ Tool categorization (CRUD, Search, Info, Batch, Notes, etc.)');
  console.log('  ✅ Intelligent universal tool suggestions');
  console.log('  ✅ Source file tracking and resource type inference');
  console.log('  ✅ Smart filtering of legitimate references\n');
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
  console.log('DISCOVERY SOURCES:');
  console.log('  - src/handlers/tool-configs/ (all non-universal configs)');
  console.log('  - test/e2e/utils/tool-migration.ts (authoritative mappings)');
  console.log('  - Pattern-based detection for edge cases\n');
  console.log('EXCLUDED (automatically filtered out):');
  console.log('  - Tool config definitions in src/handlers/tool-configs/');
  console.log('  - Migration documentation in docs/migration/, docs/universal-tools/');
  console.log('  - Lines with migration indicators (→, ->, "Should be")');
  console.log('  - Test mapping files');
  console.log('  - Archive files');
  console.log('  - Legacy test directories (test/legacy/, test/debug/, test/manual/)\n');
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

/**
 * Dynamically discover all legacy tools by scanning handler configurations
 */
function discoverLegacyToolsFromConfigs() {
  const discoveredTools = [];
  const seenToolNames = new Set(); // Prevent duplicates
  const srcDir = path.join(projectRoot, 'src', 'handlers', 'tool-configs');
  
  // Recursively scan for tool config files (excluding universal directory)
  function scanConfigFiles(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(srcDir, fullPath);
        
        if (entry.isDirectory()) {
          // Skip universal directory - these are not legacy tools
          if (entry.name === 'universal') {
            continue;
          }
          scanConfigFiles(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Extract tool names from config definitions
            // Look for patterns: name: 'tool-name' or name: "tool-name"
            const nameMatches = content.matchAll(/name:\s*['"`]([^'"`]+)['"`]/g);
            
            for (const match of nameMatches) {
              const toolName = match[1];
              
              // Skip duplicates
              if (seenToolNames.has(toolName)) {
                continue;
              }
              seenToolNames.add(toolName);
              
              const category = categorizeTool(toolName, relativePath);
              
              discoveredTools.push({
                name: toolName,
                category,
                sourceFile: relativePath,
                universal: suggestUniversalTool(toolName, category),
                resourceType: inferResourceType(toolName, relativePath)
              });
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  if (fs.existsSync(srcDir)) {
    scanConfigFiles(srcDir);
  }
  
  return discoveredTools;
}

/**
 * Categorize a tool based on its name and source file
 */
function categorizeTool(toolName, sourceFile) {
  // CRUD operations
  if (toolName.match(/^(create|update|delete|patch)-/)) return 'CRUD';
  
  // Search operations
  if (toolName.match(/^(search|find|list|get-list)-/) || toolName.includes('-search-')) return 'Search';
  if (toolName.match(/^advanced-search-/) || toolName.includes('paginated-search')) return 'Search';
  if (toolName.match(/^rate-limited-search-/)) return 'Search';
  
  // Info/Details operations
  if (toolName.match(/^get-.*-(details|info|basic-info|business-info|contact-info|social-info)$/)) return 'Info';
  if (toolName.match(/^(get|fetch)-/) && !toolName.includes('list')) return 'Info';
  
  // Batch operations
  if (toolName.match(/^batch-/)) return 'Batch';
  
  // Note operations
  if (toolName.includes('-note') || toolName.includes('-notes')) return 'Notes';
  
  // Relationship operations
  if (toolName.match(/^(link|unlink)-/) || toolName.includes('-relationship')) return 'Relationships';
  
  // List operations
  if (toolName.match(/-(to|from)-list$/) || toolName.includes('list-entries')) return 'Lists';
  
  // Attribute operations
  if (toolName.includes('attribute') || toolName.includes('field')) return 'Attributes';
  
  // Prompt operations
  if (toolName.includes('prompt')) return 'Prompts';
  
  // Filter operations
  if (toolName.includes('filter')) return 'Filters';
  
  // Default to Specialized
  return 'Specialized';
}

/**
 * Infer resource type from tool name and source file
 */
function inferResourceType(toolName, sourceFile) {
  // Extract from source file path
  if (sourceFile.includes('companies/')) return 'companies';
  if (sourceFile.includes('people/')) return 'people';
  if (sourceFile.includes('tasks')) return 'tasks';
  if (sourceFile.includes('deals/')) return 'deals';
  if (sourceFile.includes('lists')) return 'lists';
  if (sourceFile.includes('records/')) return 'records';
  
  // Extract from tool name
  if (toolName.includes('company') || toolName.includes('companies')) return 'companies';
  if (toolName.includes('person') || toolName.includes('people')) return 'people';
  if (toolName.includes('task') || toolName.includes('tasks')) return 'tasks';
  if (toolName.includes('deal') || toolName.includes('deals')) return 'deals';
  if (toolName.includes('list') || toolName.includes('lists')) return 'lists';
  if (toolName.includes('record') || toolName.includes('records')) return 'records';
  if (toolName.includes('note') || toolName.includes('notes')) return 'notes';
  if (toolName.includes('prompt')) return 'prompts';
  
  return 'any';
}

/**
 * Suggest appropriate universal tool based on legacy tool pattern
 */
function suggestUniversalTool(toolName, category) {
  switch (category) {
    case 'CRUD':
      if (toolName.startsWith('create-')) return 'create-record';
      if (toolName.startsWith('update-')) return 'update-record';
      if (toolName.startsWith('delete-')) return 'delete-record';
      return 'create-record | update-record | delete-record';
      
    case 'Search':
      if (toolName.includes('advanced')) return 'advanced-search';
      return 'search-records';
      
    case 'Info':
      return 'get-record-details';
      
    case 'Batch':
      return 'batch-search (if searching) | create-record + update-record (if modifying)';
      
    case 'Notes':
      if (toolName.includes('create') || toolName.includes('add')) return 'create-note';
      if (toolName.includes('get') || toolName.includes('list')) return 'list-notes';
      if (toolName.includes('update')) return 'update-note';
      if (toolName.includes('delete')) return 'delete-note';
      return 'create-note | list-notes | update-note | delete-note';
      
    case 'Relationships':
      return 'search-by-relationship | update-record (for linking/unlinking)';
      
    case 'Lists':
      if (toolName.includes('entries')) return 'search-by-relationship';
      if (toolName.includes('add') || toolName.includes('remove')) return 'update-record';
      return 'search-records (for lists) | search-by-relationship (for entries)';
      
    case 'Attributes':
      return 'get-record-details | update-record';
      
    case 'Prompts':
      return 'search-records (with resource_type: "prompts")';
      
    case 'Filters':
      return 'advanced-search';
      
    default:
      return 'search-records | get-record-details | create-record | update-record';
  }
}

// Extract legacy tools from authoritative tool migration mappings
const legacyToolsFromMappings = TOOL_MAPPING_RULES.map(rule => ({
  name: rule.legacyToolName,
  universal: rule.universalToolName,
  resourceType: rule.resourceType,
  category: 'Mapped',
  description: rule.description || `${rule.legacyToolName} → ${rule.universalToolName}`,
  sourceFile: 'tool-migration.ts'
}));

// Dynamically discover all legacy tools from handler configurations
const discoveredLegacyTools = discoverLegacyToolsFromConfigs();

// CRITICAL FIX: Filter out universal tools from discovered tools
// This prevents universal tools from being flagged as legacy
const discoveredToolsWithoutUniversal = discoveredLegacyTools.filter(tool => 
  !actualTools.includes(tool.name)
);

// Remove duplicates (prefer mapping rules over discovered tools)
const mappedToolNames = new Set(legacyToolsFromMappings.map(t => t.name));
const uniqueDiscoveredTools = discoveredToolsWithoutUniversal.filter(t => !mappedToolNames.has(t.name));

// Combine all legacy tools for comprehensive detection
const allLegacyTools = [...legacyToolsFromMappings, ...uniqueDiscoveredTools];
const legacyToolNames = allLegacyTools.map(tool => tool.name);
const legacyTools = legacyToolNames; // For backward compatibility with existing code

// VALIDATION: Check for false positives (universal tools flagged as legacy)
const falsePositives = legacyTools.filter(tool => actualTools.includes(tool));
if (falsePositives.length > 0) {
  console.warn('⚠️  WARNING: Universal tools detected in legacy tool list!');
  console.warn('   These should NOT be flagged as legacy:', falsePositives.join(', '));
  console.warn('   This indicates a bug in the discovery logic.\\n');
}

// Create lookup map for suggestions with enhanced details
const legacyToolSuggestions = {};
const legacyToolDetails = {};
allLegacyTools.forEach(tool => {
  const suggestion = tool.resourceType === 'any' 
    ? tool.universal
    : `${tool.universal} (with resource_type: "${tool.resourceType}")`;
  legacyToolSuggestions[tool.name] = suggestion;
  legacyToolDetails[tool.name] = tool;
});

// Display comprehensive statistics
const categoryStats = allLegacyTools.reduce((stats, tool) => {
  stats[tool.category] = (stats[tool.category] || 0) + 1;
  return stats;
}, {});

console.log('🔍 COMPREHENSIVE LEGACY TOOL DISCOVERY');
console.log('=====================================\n');
console.log(`📊 Discovery Results:`);
console.log(`   - Mapped tools (in tool-migration.ts): ${legacyToolsFromMappings.length}`);
console.log(`   - Discovered tools (from handler configs): ${uniqueDiscoveredTools.length}`);
console.log(`   - Universal tools filtered out: ${discoveredLegacyTools.length - discoveredToolsWithoutUniversal.length}`);
console.log(`   - TOTAL LEGACY TOOLS: ${allLegacyTools.length}\n`);

console.log('📋 Tools by Category:');
Object.entries(categoryStats).sort(([,a], [,b]) => b - a).forEach(([category, count]) => {
  console.log(`   - ${category}: ${count} tools`);
});
console.log('');

console.log('🚫 All Legacy Tools Detected:', legacyTools.length);
// Group tools by category for better display
const toolsByCategory = allLegacyTools.reduce((groups, tool) => {
  if (!groups[tool.category]) groups[tool.category] = [];
  groups[tool.category].push(tool.name);
  return groups;
}, {});

Object.entries(toolsByCategory).forEach(([category, tools]) => {
  console.log(`\n  ${category} (${tools.length}):`);
  tools.slice(0, 8).forEach(tool => console.log(`    - ${tool}`));
  if (tools.length > 8) {
    console.log(`    ... and ${tools.length - 8} more`);
  }
});
console.log('');

console.log('🔍 Enhanced Detection: Authoritative mappings + Dynamic config scanning + Pattern-based discovery');
console.log(`📊 Coverage: ${allLegacyTools.length} legacy tools vs ${actualTools.length} universal tools`);
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
  
  // ENHANCED FALSE POSITIVE DETECTION
  // Error messages and function parameters
  if (line.match(new RegExp(`createErrorResponse\\([^,]+,\\s*['"\`]${legacyTool}['"\`]`)) ||
      line.match(new RegExp(`Error.*['"\`]${legacyTool}['"\`]`)) ||
      line.match(new RegExp(`console\\.(log|error|warn).*['"\`]${legacyTool}['"\`]`)) ||
      line.match(new RegExp(`throw.*['"\`]${legacyTool}['"\`]`))) {
    return true;
  }
  
  // Variable assignments and function parameters
  if (line.match(new RegExp(`(const|let|var)\\s+\\w+\\s*=\\s*['"\`]${legacyTool}['"\`]`)) ||
      line.match(new RegExp(`function\\s+\\w+\\([^)]*['"\`]${legacyTool}['"\`][^)]*\\)`))) {
    return true;
  }
  
  // Comments and documentation strings
  if (line.trim().startsWith('//') || line.trim().startsWith('*') || 
      line.includes('* @') || line.includes('/**') || line.includes('*/')) {
    return true;
  }
  
  // String literals in test descriptions
  if (line.includes('describe(') || line.includes('it(') || line.includes('test(')) {
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
  
  // Full mode: CONTEXT-AWARE pattern detection (only actual tool usage)
  legacyTools.forEach(legacyTool => {
    lines.forEach((line, index) => {
      // Pre-filter: skip lines that can't possibly contain the tool name
      if (!line.includes(legacyTool)) {
        return;
      }
      
      // CONTEXT-AWARE PATTERNS: Only detect actual tool usage, not string literals
      const toolCallPatterns = [
        // MCP tool calls (CRITICAL)
        new RegExp(`mcp__attio__${legacyTool}\\b`),
        
        // Tool calls in handlers (HIGH)
        new RegExp(`call\\w*Tool\\(['"\`]${legacyTool}['"\`]`),
        new RegExp(`callTasksTool\\(['"\`]${legacyTool}['"\`]`),
        
        // Tool config definitions (HIGH - if not in tool-configs directory)
        new RegExp(`name:\\s*['"\`]${legacyTool}['"\`]`),
        
        // Tool registrations (HIGH)
        new RegExp(`['"\`]${legacyTool}['"\`]:\\s*\\{[^}]*handler`),
        
        // Tool dispatch/lookup (MEDIUM)
        new RegExp(`\\['${legacyTool}'\\]|\\["${legacyTool}"\\]|\\[\`${legacyTool}\`\\]`)
      ];
      
      toolCallPatterns.forEach(pattern => {
        if (pattern.test(line)) {
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
            pattern: pattern.source,
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
      const relativePath = path.relative(projectRoot, fullPath);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .git, dist (built files), .archive, and legacy test directories
        const skipDirectories = ['node_modules', '.git', 'dist', '.archive', '.windsurf'];
        const skipPaths = [
          'test/legacy',
          'test/debug', 
          'test/manual'
        ];
        
        // Check if this is a directory we should skip
        const shouldSkipDirectory = skipDirectories.includes(entry.name);
        const shouldSkipPath = skipPaths.some(skipPath => 
          relativePath.startsWith(skipPath) || 
          fullPath.includes(path.sep + skipPath.replace('/', path.sep))
        );
        
        if (!shouldSkipDirectory && !shouldSkipPath) {
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
          
          // Enhanced suggestion with category and source information
          const toolDetail = legacyToolDetails[finding.legacyTool];
          if (toolDetail) {
            console.log(`      📂 Category: ${toolDetail.category} (${toolDetail.resourceType})`);
            console.log(`      📄 Source: ${toolDetail.sourceFile}`);
            console.log(`      💡 Suggest: ${legacyToolSuggestions[finding.legacyTool]}`);
          } else if (legacyToolSuggestions[finding.legacyTool]) {
            console.log(`      💡 Suggest: ${legacyToolSuggestions[finding.legacyTool]}`);
          } else {
            // Fallback pattern-based suggestion
            console.log(`      💡 Suggest: Check tool-migration.ts for correct universal tool mapping`);
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