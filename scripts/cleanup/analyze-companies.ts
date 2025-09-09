#!/usr/bin/env tsx

/**
 * Company Analysis Script
 * 
 * Analyzes companies created by API token and generates clean lists for review:
 * - /tmp/companies-protected.txt - Real companies that will be protected
 * - /tmp/companies-to-delete.txt - Test companies that will be deleted
 * 
 * Usage: npx tsx scripts/cleanup/analyze-companies.ts
 */

import { fetchCompaniesByCreator } from './fetchers/companies.js';
import { filterTestCompanies, isSafeCompany, isTestCompany } from './filters/safe-companies.js';
import { initializeCleanupClient } from './core/client.js';
import { getValidatedApiToken } from './filters/api-token-filter.js';
import { logInfo, logError, logSuccess } from './core/utils.js';
import fs from 'fs';
import path from 'path';

interface CompanyAnalysis {
  protected: string[];
  toDelete: string[];
  ambiguous: string[];
  summary: {
    totalFetched: number;
    totalProtected: number;
    totalToDelete: number;
    totalAmbiguous: number;
  };
}

async function analyzeCompanies(): Promise<CompanyAnalysis> {
  try {
    // Initialize client and get API token
    const client = initializeCleanupClient();
    const apiToken = getValidatedApiToken();
    
    logInfo('🔍 Fetching companies created by API token...');
    
    // Fetch all companies created by the API token
    const result = await fetchCompaniesByCreator(client, apiToken);
    logInfo(`Found ${result.records.length} companies created by API token`);
    
    // Apply safety filtering
    const { safe, toDelete } = filterTestCompanies(result.records);
    
    // Extract and clean company names
    const extractName = (company: any): string => {
      return company.values?.name?.[0]?.value || company.name || 'Unknown';
    };
    
    const protectedNames = safe.map(extractName).sort();
    const deleteNames = toDelete.map(extractName).sort();
    
    // Find ambiguous companies (those that don't match clear patterns)
    const ambiguous: string[] = [];
    for (const company of result.records) {
      const name = extractName(company);
      if (!isSafeCompany(name) && !isTestCompany(name)) {
        ambiguous.push(name);
      }
    }
    
    return {
      protected: protectedNames,
      toDelete: deleteNames,
      ambiguous: ambiguous.sort(),
      summary: {
        totalFetched: result.records.length,
        totalProtected: protectedNames.length,
        totalToDelete: deleteNames.length,
        totalAmbiguous: ambiguous.length
      }
    };
    
  } catch (error) {
    logError('Failed to analyze companies', error);
    throw error;
  }
}

function writeAnalysisFiles(analysis: CompanyAnalysis): void {
  const tmpDir = '/tmp';
  
  // Write protected companies
  const protectedFile = path.join(tmpDir, 'companies-protected.txt');
  fs.writeFileSync(protectedFile, analysis.protected.join('\\n') + '\\n');
  
  // Write companies to delete
  const deleteFile = path.join(tmpDir, 'companies-to-delete.txt');
  fs.writeFileSync(deleteFile, analysis.toDelete.join('\\n') + '\\n');
  
  // Write ambiguous companies for manual review
  const ambiguousFile = path.join(tmpDir, 'companies-ambiguous.txt');
  fs.writeFileSync(ambiguousFile, analysis.ambiguous.join('\\n') + '\\n');
  
  // Write detailed analysis report
  const reportFile = path.join(tmpDir, 'companies-analysis-report.txt');
  const report = `Company Cleanup Analysis Report
Generated: ${new Date().toISOString()}

SUMMARY:
========
Total companies fetched: ${analysis.summary.totalFetched}
Companies to protect: ${analysis.summary.totalProtected}
Companies to delete: ${analysis.summary.totalToDelete}
Ambiguous companies: ${analysis.summary.totalAmbiguous}

PROTECTED COMPANIES (Real Businesses):
=====================================
${analysis.protected.map((name, i) => `${i + 1}. ${name}`).join('\\n')}

COMPANIES TO DELETE (Test Data):
===============================
${analysis.toDelete.slice(0, 50).map((name, i) => `${i + 1}. ${name}`).join('\\n')}
${analysis.toDelete.length > 50 ? `... and ${analysis.toDelete.length - 50} more` : ''}

${analysis.ambiguous.length > 0 ? `
AMBIGUOUS COMPANIES (Manual Review Required):
=============================================
${analysis.ambiguous.map((name, i) => `${i + 1}. ${name}`).join('\\n')}

⚠️  WARNING: ${analysis.ambiguous.length} companies don't match clear test patterns.
    Review these manually before proceeding with cleanup.
` : 'All companies have clear pattern matches. ✅'}

FILES GENERATED:
===============
- ${protectedFile} (${analysis.summary.totalProtected} companies)
- ${deleteFile} (${analysis.summary.totalToDelete} companies)
- ${ambiguousFile} (${analysis.summary.totalAmbiguous} companies)
- ${reportFile} (this report)
`;
  
  fs.writeFileSync(reportFile, report);
  
  logSuccess(`Analysis files generated in ${tmpDir}:`);
  console.log(`  📋 Protected: ${protectedFile} (${analysis.summary.totalProtected} companies)`);
  console.log(`  🗑️  To Delete: ${deleteFile} (${analysis.summary.totalToDelete} companies)`);
  if (analysis.summary.totalAmbiguous > 0) {
    console.log(`  ⚠️  Ambiguous: ${ambiguousFile} (${analysis.summary.totalAmbiguous} companies)`);
  }
  console.log(`  📊 Report: ${reportFile}`);
}

function displaySummary(analysis: CompanyAnalysis): void {
  console.log('\\n' + '='.repeat(60));
  console.log('🔍 COMPANY CLEANUP ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\\n📊 OVERVIEW:`);
  console.log(`   Total companies: ${analysis.summary.totalFetched}`);
  console.log(`   Protected (real): ${analysis.summary.totalProtected}`);
  console.log(`   To delete (test): ${analysis.summary.totalToDelete}`);
  console.log(`   Ambiguous: ${analysis.summary.totalAmbiguous}`);
  
  if (analysis.summary.totalProtected > 0) {
    console.log(`\\n✅ PROTECTED COMPANIES (${analysis.summary.totalProtected}):`);
    analysis.protected.slice(0, 10).forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
    if (analysis.summary.totalProtected > 10) {
      console.log(`   ... and ${analysis.summary.totalProtected - 10} more`);
    }
  }
  
  if (analysis.summary.totalToDelete > 0) {
    console.log(`\\n🗑️  TEST COMPANIES TO DELETE (${analysis.summary.totalToDelete}):`);
    analysis.toDelete.slice(0, 10).forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
    if (analysis.summary.totalToDelete > 10) {
      console.log(`   ... and ${analysis.summary.totalToDelete - 10} more`);
    }
  }
  
  if (analysis.summary.totalAmbiguous > 0) {
    console.log(`\\n⚠️  AMBIGUOUS COMPANIES (${analysis.summary.totalAmbiguous}) - MANUAL REVIEW REQUIRED:`);
    analysis.ambiguous.slice(0, 5).forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
    if (analysis.summary.totalAmbiguous > 5) {
      console.log(`   ... and ${analysis.summary.totalAmbiguous - 5} more`);
    }
    console.log('\\n   ⚠️  These companies don\'t match clear test patterns.');
    console.log('   Review /tmp/companies-ambiguous.txt before proceeding.');
  }
  
  console.log('\\n' + '='.repeat(60));
}

// Main execution
async function main(): Promise<void> {
  try {
    console.log('🧹 Company Cleanup Analysis\\n');
    
    const analysis = await analyzeCompanies();
    
    displaySummary(analysis);
    
    writeAnalysisFiles(analysis);
    
    console.log('\\n✅ Analysis complete! Review the generated files before running cleanup.');
    
  } catch (error) {
    logError('Analysis failed', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeCompanies, writeAnalysisFiles, displaySummary };