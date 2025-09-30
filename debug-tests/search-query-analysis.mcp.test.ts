/**
 * Search Query Analysis Test
 * Tests various search query patterns to identify shortcomings
 *
 * Purpose: Validate search behavior with multi-field queries, partial matching,
 * location context, and phone number variations
 *
 * Run from project root:
 * E2E_MODE=true npm test -- /tmp/search-query-analysis.mcp.test.ts --run
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

interface SearchTestCase {
  name: string;
  resourceType: 'people' | 'companies';
  query: string;
  expectedBehavior: string;
  pattern: string;
  shouldFind: boolean;
}

describe('Search Query Analysis - Issue #781', () => {
  let client: MCPTestClient;
  const results: Array<{
    test: SearchTestCase;
    found: number;
    passed: boolean;
    notes: string;
  }> = [];

  // Fake test data for search validation (no real PII)
  const KNOWN_PERSON = {
    id: 'test-person-id-12345',
    name: 'John Smith',
    email: 'john.smith@example.com',
    secondaryEmail: 'jsmith@testcompany.com',
    phone: '+15551234567',
  };

  const KNOWN_COMPANY = {
    id: 'test-company-id-67890',
    name: 'Test Corporation Inc',
    domain: 'testcorp.example',
  };

  const testCases: SearchTestCase[] = [
    // Multi-field queries (CRITICAL FAILURE PATTERN)
    {
      name: 'Multi-field: name + email',
      resourceType: 'people',
      query: 'John Smith john.smith@example.com',
      expectedBehavior: 'Should find person by parsing name OR email',
      pattern: 'multi-field',
      shouldFind: true,
    },
    {
      name: 'Email only (baseline)',
      resourceType: 'people',
      query: 'john.smith@example.com',
      expectedBehavior: 'Should find person (baseline - currently works)',
      pattern: 'single-field',
      shouldFind: true,
    },
    {
      name: 'Name only (baseline)',
      resourceType: 'people',
      query: 'John Smith',
      expectedBehavior: 'Should find person (baseline - currently works)',
      pattern: 'single-field',
      shouldFind: true,
    },

    // Partial matching patterns
    {
      name: 'Partial email domain',
      resourceType: 'people',
      query: 'testcompany',
      expectedBehavior: 'Should find person with testcompany email domain',
      pattern: 'partial-domain',
      shouldFind: true,
    },
    {
      name: 'Partial first name',
      resourceType: 'people',
      query: 'John',
      expectedBehavior: 'Should find John Smith',
      pattern: 'partial-name',
      shouldFind: true,
    },
    {
      name: 'Last name only',
      resourceType: 'people',
      query: 'Smith',
      expectedBehavior: 'Should find John Smith',
      pattern: 'partial-name',
      shouldFind: true,
    },

    // Company queries with location/context (CRITICAL FAILURE PATTERN)
    {
      name: 'Company name + location',
      resourceType: 'companies',
      query: 'Test Corporation California',
      expectedBehavior: 'Should find company by removing location token',
      pattern: 'location-context',
      shouldFind: true,
    },
    {
      name: 'Exact company name (baseline)',
      resourceType: 'companies',
      query: 'Test Corporation Inc',
      expectedBehavior: 'Should find company (baseline - currently works)',
      pattern: 'single-field',
      shouldFind: true,
    },
    {
      name: 'Partial company name',
      resourceType: 'companies',
      query: 'Test Corporation',
      expectedBehavior: 'Should find Test Corporation Inc',
      pattern: 'partial-name',
      shouldFind: true,
    },

    // Domain matching patterns
    {
      name: 'Domain without TLD',
      resourceType: 'companies',
      query: 'testcorp',
      expectedBehavior: 'Should find company by domain',
      pattern: 'partial-domain',
      shouldFind: true,
    },
    {
      name: 'Full domain',
      resourceType: 'companies',
      query: 'testcorp.example',
      expectedBehavior: 'Should find company by full domain',
      pattern: 'domain',
      shouldFind: true,
    },

    // Phone number variations
    {
      name: 'Phone with +1 and formatting',
      resourceType: 'people',
      query: '+15551234567',
      expectedBehavior: 'Should find person by phone',
      pattern: 'phone-formatted',
      shouldFind: true,
    },
    {
      name: 'Phone without country code',
      resourceType: 'people',
      query: '5551234567',
      expectedBehavior: 'Should find person by phone',
      pattern: 'phone-normalized',
      shouldFind: true,
    },
    {
      name: 'Phone with dashes',
      resourceType: 'people',
      query: '555-123-4567',
      expectedBehavior: 'Should find person by phone',
      pattern: 'phone-formatted',
      shouldFind: true,
    },
  ];

  beforeAll(async () => {
    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: ['./dist/cli.js'],
    });
    await client.init();
  });

  afterAll(async () => {
    if (client) {
      await client.cleanup();
    }

    // Generate summary report
    console.log('\n' + '='.repeat(80));
    console.log('SEARCH QUERY ANALYSIS SUMMARY - Issue #781');
    console.log('='.repeat(80) + '\n');

    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success rate: ${successRate}%\n`);

    // Group failures by pattern
    const failuresByPattern: Record<string, typeof results> = {};
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        const pattern = r.test.pattern;
        if (!failuresByPattern[pattern]) {
          failuresByPattern[pattern] = [];
        }
        failuresByPattern[pattern].push(r);
      });

    if (failedTests > 0) {
      console.log('🔴 FAILED TEST PATTERNS:\n');
      Object.entries(failuresByPattern).forEach(([pattern, tests]) => {
        console.log(`  ${pattern}: ${tests.length} failures`);
        tests.forEach((t) => {
          console.log(`    ❌ "${t.test.query}" (${t.test.resourceType})`);
          console.log(`       Expected: ${t.test.expectedBehavior}`);
          console.log(`       Actual: Found ${t.found} results`);
          console.log(`       Notes: ${t.notes}\n`);
        });
      });
    }

    // Show passing patterns for comparison
    const passingPatterns: Record<string, number> = {};
    results
      .filter((r) => r.passed)
      .forEach((r) => {
        passingPatterns[r.test.pattern] =
          (passingPatterns[r.test.pattern] || 0) + 1;
      });

    if (passedTests > 0) {
      console.log('✅ PASSING TEST PATTERNS:\n');
      Object.entries(passingPatterns).forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count} passing`);
      });
      console.log('');
    }

    // Critical insights
    console.log('🔍 CRITICAL INSIGHTS:\n');
    const multiFieldFails = failuresByPattern['multi-field']?.length || 0;
    const locationContextFails =
      failuresByPattern['location-context']?.length || 0;
    const partialDomainFails = failuresByPattern['partial-domain']?.length || 0;

    if (multiFieldFails > 0) {
      console.log('  ⚠️  Multi-field queries (name + email) are failing');
      console.log('      Root cause: Literal string pass-through to Attio API');
      console.log('      Impact: Users must try multiple separate queries\n');
    }

    if (locationContextFails > 0) {
      console.log('  ⚠️  Location/context queries are failing');
      console.log(
        '      Root cause: No query tokenization or progressive fallback'
      );
      console.log(
        '      Impact: "Company Name Oregon" fails but "Company Name" works\n'
      );
    }

    if (partialDomainFails > 0) {
      console.log('  ⚠️  Partial domain matching is failing');
      console.log('      Root cause: Email field search may not parse domains');
      console.log('      Impact: Cannot find by domain substring\n');
    }

    console.log('📊 DETAILED RESULTS:');
    console.log('   See src/api/operations/search.ts:31-74 for root cause');
    console.log('   See GitHub issue #781 for proposed solution\n');
  });

  testCases.forEach((testCase) => {
    it(testCase.name, async () => {
      let found = 0;
      let passed = false;
      let notes = '';

      try {
        await client.assertToolCall(
          'search-records',
          {
            resource_type: testCase.resourceType,
            query: testCase.query,
            limit: 5,
          },
          (result) => {
            // Parse result to count found records (callback receives the actual result)
            if (
              result.content &&
              result.content[0] &&
              'text' in result.content[0]
            ) {
              const text = result.content[0].text;
              const match = text.match(/Found (\d+)/);
              found = match ? parseInt(match[1]) : 0;
            }
          }
        );

        // Determine if test passed
        passed = testCase.shouldFind ? found > 0 : found === 0;
        notes = passed
          ? 'Working as expected'
          : `Expected ${testCase.shouldFind ? '>0' : '0'} results, got ${found}`;
      } catch (error) {
        notes = `Error: ${error instanceof Error ? error.message : String(error)}`;
        passed = false;
      } finally {
        results.push({ test: testCase, found, passed, notes });
      }

      // Assert based on expected behavior (will fail if not working)
      if (testCase.shouldFind) {
        expect(found).toBeGreaterThan(0);
      } else {
        expect(found).toBe(0);
      }
    });
  });
});
