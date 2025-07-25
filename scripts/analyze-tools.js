#!/usr/bin/env node
/**
 * MCP Tool Analysis Script - Issue #352
 * 
 * Analyzes the current MCP tool configuration to identify consolidation opportunities
 * and measure the impact of proposed optimizations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TOOL_CONFIGS_DIR = path.join(__dirname, '../src/handlers/tool-configs');
const OUTPUT_FILE = path.join(__dirname, '../tmp/tool-analysis-results.json');

class ToolAnalyzer {
  constructor() {
    this.tools = [];
    this.categories = {};
    this.consolidationCandidates = [];
  }

  /**
   * Scan all tool configuration files
   */
  async scanToolConfigs() {
    console.log('🔍 Scanning tool configurations...');
    
    const scanDirectory = async (dir, category = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath, entry.name);
        } else if (entry.name.endsWith('.ts') && !entry.name.includes('.test.')) {
          await this.analyzeToolFile(fullPath, category);
        }
      }
    };

    await scanDirectory(TOOL_CONFIGS_DIR);
    console.log(`✅ Found ${this.tools.length} tools across ${Object.keys(this.categories).length} categories`);
  }

  /**
   * Analyze individual tool file
   */
  async analyzeToolFile(filePath, category) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(TOOL_CONFIGS_DIR, filePath);
      
      // Extract tool exports
      const toolConfigMatches = content.match(/export\s+const\s+(\w+)ToolConfig/g) || [];
      const toolDefinitionMatches = content.match(/export\s+const\s+(\w+)ToolDefinition/g) || [];
      
      // Extract tool names from content
      const nameMatches = content.match(/name:\s*['"`]([^'"`]+)['"`]/g) || [];
      const toolNames = nameMatches.map(match => match.match(/['"`]([^'"`]+)['"`]/)[1]);
      
      // Extract descriptions
      const descMatches = content.match(/description:\s*['"`]([^'"`]+)['"`]/g) || [];
      const descriptions = descMatches.map(match => match.match(/['"`]([^'"`]+)['"`]/)[1]);
      
      // Analyze tool complexity (rough estimation)
      const complexity = this.analyzeComplexity(content);
      
      // Store tool information
      toolConfigMatches.forEach((match, index) => {
        const toolName = toolNames[index] || `unknown-${index}`;
        const description = descriptions[index] || 'No description';
        
        const tool = {
          name: toolName,
          description,
          category,
          filePath: relativePath,
          configExport: match,
          definitionExport: toolDefinitionMatches[index] || null,
          complexity,
          lineCount: content.split('\n').length,
          hasHandler: content.includes('handler:'),
          hasFormatter: content.includes('formatResult:'),
          operations: this.extractOperations(toolName, description)
        };
        
        this.tools.push(tool);
        
        if (!this.categories[category]) {
          this.categories[category] = [];
        }
        this.categories[category].push(tool);
      });
      
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${filePath}: ${error.message}`);
    }
  }

  /**
   * Analyze code complexity (basic heuristics)
   */
  analyzeComplexity(content) {
    let score = 0;
    
    // Count conditional statements
    score += (content.match(/if\s*\(/g) || []).length;
    score += (content.match(/switch\s*\(/g) || []).length * 2;
    score += (content.match(/try\s*{/g) || []).length;
    
    // Count async operations
    score += (content.match(/await\s+/g) || []).length;
    score += (content.match(/\.then\(/g) || []).length;
    
    // Count schema properties
    score += (content.match(/properties:\s*{/g) || []).length;
    
    if (score < 5) return 'low';
    if (score < 15) return 'medium';
    return 'high';
  }

  /**
   * Extract operation types from tool name and description
   */
  extractOperations(name, description) {
    const operations = [];
    const text = `${name} ${description}`.toLowerCase();
    
    if (text.includes('create') || text.includes('add')) operations.push('create');
    if (text.includes('update') || text.includes('edit')) operations.push('update');
    if (text.includes('get') || text.includes('fetch') || text.includes('search')) operations.push('read');
    if (text.includes('delete') || text.includes('remove')) operations.push('delete');
    if (text.includes('batch') || text.includes('bulk')) operations.push('batch');
    if (text.includes('relationship')) operations.push('relationship');
    if (text.includes('note')) operations.push('notes');
    if (text.includes('attribute')) operations.push('attributes');
    
    return operations;
  }

  /**
   * Identify consolidation opportunities
   */
  identifyConsolidationOpportunities() {
    console.log('🔄 Identifying consolidation opportunities...');
    
    // Group tools by similar operations and categories
    const operationGroups = {};
    
    this.tools.forEach(tool => {
      const key = `${tool.category}-${tool.operations.sort().join('-')}`;
      if (!operationGroups[key]) {
        operationGroups[key] = [];
      }
      operationGroups[key].push(tool);
    });

    // Identify consolidation candidates
    Object.entries(operationGroups).forEach(([key, tools]) => {
      if (tools.length > 1) {
        this.consolidationCandidates.push({
          groupKey: key,
          tools,
          consolidationType: this.determineConsolidationType(tools),
          estimatedReduction: tools.length - 1,
          riskLevel: this.assessConsolidationRisk(tools)
        });
      }
    });

    // Identify duplicate/similar tools
    this.identifyDuplicates();
    
    console.log(`✅ Identified ${this.consolidationCandidates.length} consolidation opportunities`);
  }

  /**
   * Identify duplicate or very similar tools
   */
  identifyDuplicates() {
    const nameGroups = {};
    
    // Group by similar names
    this.tools.forEach(tool => {
      const baseName = tool.name
        .replace(/-/g, '')
        .replace(/toolconfig|tooldefinition/gi, '')
        .toLowerCase();
      
      if (!nameGroups[baseName]) {
        nameGroups[baseName] = [];
      }
      nameGroups[baseName].push(tool);
    });

    // Find potential duplicates
    Object.entries(nameGroups).forEach(([baseName, tools]) => {
      if (tools.length > 1) {
        // Check if these are just config/definition pairs (expected)
        const hasConfig = tools.some(t => t.configExport);
        const hasDefinition = tools.some(t => t.definitionExport);
        
        if (!(hasConfig && hasDefinition && tools.length === 2)) {
          // Potential duplicate
          this.consolidationCandidates.push({
            groupKey: `duplicate-${baseName}`,
            tools,
            consolidationType: 'duplicate-removal',
            estimatedReduction: tools.length - 1,
            riskLevel: 'low'
          });
        }
      }
    });
  }

  /**
   * Determine consolidation type based on tool analysis
   */
  determineConsolidationType(tools) {
    const operations = new Set();
    tools.forEach(tool => tool.operations.forEach(op => operations.add(op)));
    
    if (operations.has('create') && operations.has('update') && operations.has('read')) {
      return 'crud-consolidation';
    }
    
    if (operations.has('batch')) {
      return 'batch-consolidation';
    }
    
    if (tools.every(tool => tool.operations.includes('read'))) {
      return 'search-consolidation';
    }
    
    return 'functional-consolidation';
  }

  /**
   * Assess risk level for consolidation
   */
  assessConsolidationRisk(tools) {
    // High complexity tools are riskier to consolidate
    const highComplexityCount = tools.filter(t => t.complexity === 'high').length;
    if (highComplexityCount > 0) return 'high';
    
    // Cross-category consolidations are medium risk
    const categories = new Set(tools.map(t => t.category));
    if (categories.size > 1) return 'medium';
    
    // Same category, similar operations = low risk
    return 'low';
  }

  /**
   * Generate consolidation recommendations
   */
  generateRecommendations() {
    console.log('💡 Generating consolidation recommendations...');
    
    const recommendations = {
      phase1: [], // Low risk, high impact
      phase2: [], // Medium risk, good impact  
      phase3: []  // High risk, careful consideration
    };

    this.consolidationCandidates.forEach(candidate => {
      const phase = candidate.riskLevel === 'low' ? 'phase1' : 
                   candidate.riskLevel === 'medium' ? 'phase2' : 'phase3';
      
      recommendations[phase].push({
        ...candidate,
        recommendation: this.generateConsolidationRecommendation(candidate)
      });
    });

    return recommendations;
  }

  /**
   * Generate specific recommendation for consolidation candidate
   */
  generateConsolidationRecommendation(candidate) {
    const toolNames = candidate.tools.map(t => t.name);
    
    switch (candidate.consolidationType) {
      case 'crud-consolidation':
        return {
          action: 'Create unified CRUD tool',
          newToolName: `manage-${candidate.tools[0].category}`,
          approach: 'Use operation parameter to discriminate between create/update/read/delete',
          schema: 'Add operation enum field, make other fields conditional'
        };
        
      case 'search-consolidation':
        return {
          action: 'Merge search operations',
          newToolName: `search-${candidate.tools[0].category}`,
          approach: 'Combine search parameters, use optional advanced filters',
          schema: 'Extend base search with optional advanced parameters'
        };
        
      case 'duplicate-removal':
        return {
          action: 'Remove duplicate tools',
          newToolName: candidate.tools[0].name,
          approach: 'Keep most comprehensive version, remove others',
          schema: 'No schema changes needed'
        };
        
      default:
        return {
          action: 'Functional consolidation',
          newToolName: `${candidate.tools[0].category}-operations`,
          approach: 'Group related operations under single tool',
          schema: 'Use operation type parameter'
        };
    }
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    const recommendations = this.generateRecommendations();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTools: this.tools.length,
        totalCategories: Object.keys(this.categories).length,
        consolidationOpportunities: this.consolidationCandidates.length,
        estimatedReduction: this.consolidationCandidates.reduce((sum, c) => sum + c.estimatedReduction, 0)
      },
      categories: this.categories,
      tools: this.tools,
      consolidationCandidates: this.consolidationCandidates,
      recommendations,
      phaseBreakdown: {
        phase1: {
          count: recommendations.phase1.length,
          reduction: recommendations.phase1.reduce((sum, r) => sum + r.estimatedReduction, 0),
          riskLevel: 'low'
        },
        phase2: {
          count: recommendations.phase2.length,
          reduction: recommendations.phase2.reduce((sum, r) => sum + r.estimatedReduction, 0),
          riskLevel: 'medium'
        },
        phase3: {
          count: recommendations.phase3.length,
          reduction: recommendations.phase3.reduce((sum, r) => sum + r.estimatedReduction, 0),
          riskLevel: 'high'
        }
      }
    };

    return report;
  }

  /**
   * Save analysis results
   */
  async saveResults(report) {
    // Ensure tmp directory exists
    const tmpDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`📊 Analysis results saved to: ${OUTPUT_FILE}`);
  }

  /**
   * Print summary to console
   */
  printSummary(report) {
    console.log('\n📊 ANALYSIS SUMMARY');
    console.log('===================');
    console.log(`Total Tools: ${report.summary.totalTools}`);
    console.log(`Categories: ${report.summary.totalCategories}`);
    console.log(`Consolidation Opportunities: ${report.summary.consolidationOpportunities}`);
    console.log(`Estimated Tool Reduction: ${report.summary.estimatedReduction}`);
    console.log(`Final Tool Count: ${report.summary.totalTools - report.summary.estimatedReduction}`);
    
    console.log('\n📋 PHASE BREAKDOWN');
    console.log('==================');
    console.log(`Phase 1 (Low Risk): ${report.phaseBreakdown.phase1.count} opportunities, -${report.phaseBreakdown.phase1.reduction} tools`);
    console.log(`Phase 2 (Medium Risk): ${report.phaseBreakdown.phase2.count} opportunities, -${report.phaseBreakdown.phase2.reduction} tools`);
    console.log(`Phase 3 (High Risk): ${report.phaseBreakdown.phase3.count} opportunities, -${report.phaseBreakdown.phase3.reduction} tools`);
    
    console.log('\n🎯 TOP CONSOLIDATION OPPORTUNITIES');
    console.log('==================================');
    report.consolidationCandidates
      .sort((a, b) => b.estimatedReduction - a.estimatedReduction)
      .slice(0, 5)
      .forEach((candidate, index) => {
        console.log(`${index + 1}. ${candidate.consolidationType} (${candidate.riskLevel} risk)`);
        console.log(`   Tools: ${candidate.tools.map(t => t.name).join(', ')}`);
        console.log(`   Reduction: -${candidate.estimatedReduction} tools`);
      });
  }

  /**
   * Main analysis workflow
   */
  async run() {
    console.log('🚀 Starting MCP Tool Analysis - Issue #352\n');
    
    try {
      await this.scanToolConfigs();
      this.identifyConsolidationOpportunities();
      const report = this.generateReport();
      await this.saveResults(report);
      this.printSummary(report);
      
      console.log('\n✅ Analysis complete! Check the generated report for detailed findings.');
      return report;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new ToolAnalyzer();
  analyzer.run();
}

export default ToolAnalyzer;