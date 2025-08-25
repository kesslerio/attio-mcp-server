#!/usr/bin/env node

/**
 * Debug script to isolate the advancedSearchCompanies import issue
 */

console.log('🔍 Debug: Testing imports at each level...\n');

async function testImports() {
  try {
    // 1. Test direct import from search.ts
    console.log('1. Testing direct import from companies/search.js:');
    try {
      const searchModule = await import('./dist/objects/companies/search.js');
      console.log('   - advancedSearchCompanies type:', typeof searchModule.advancedSearchCompanies);
      console.log('   - searchCompanies type:', typeof searchModule.searchCompanies);
      console.log('   - Available exports:', Object.keys(searchModule));
    } catch (error) {
      console.error('   ERROR:', error.message);
    }
    console.log();

    // 2. Test import from companies/index.js
    console.log('2. Testing import from companies/index.js:');
    try {
      const indexModule = await import('./dist/objects/companies/index.js');
      console.log('   - advancedSearchCompanies type:', typeof indexModule.advancedSearchCompanies);
      console.log('   - searchCompanies type:', typeof indexModule.searchCompanies);
      console.log('   - Available exports:', Object.keys(indexModule));
    } catch (error) {
      console.error('   ERROR:', error.message);
    }
    console.log();

    // 3. Test working people imports for comparison
    console.log('3. Testing people imports for comparison:');
    try {
      const peopleModule = await import('./dist/objects/people/index.js');
      console.log('   - advancedSearchPeople type:', typeof peopleModule.advancedSearchPeople);
      console.log('   - searchPeople type:', typeof peopleModule.searchPeople);
    } catch (error) {
      console.error('   ERROR:', error.message);
    }
    console.log();

    // 4. Test UniversalSearchService imports (should show fixed circular dependency)
    console.log('4. Testing UniversalSearchService imports:');
    try {
      const universalModule = await import('./dist/services/UniversalSearchService.js');
      console.log('   - UniversalSearchService loaded successfully');
    } catch (error) {
      console.error('   ERROR:', error.message);
    }

  } catch (error) {
    console.error('Overall error:', error);
  }
}

// Set E2E environment to replicate the issue
process.env.NODE_ENV = 'test';
process.env.E2E_MODE = 'true';

testImports();