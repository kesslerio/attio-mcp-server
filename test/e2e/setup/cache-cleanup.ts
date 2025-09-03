/**
 * E2E Test Suite Cache Cleanup Setup
 * 
 * Manages TestDataSeeder cache lifecycle to prevent test interdependencies
 * and ensure deterministic test execution across suites.
 */
import { afterEach, beforeEach } from 'vitest';
import { TestDataSeeder } from '../utils/test-data-seeder.js';
import { E2EAssertions } from '../utils/assertions.js';

// Track suite-specific seeders for proper cleanup
const suiteSeederMap = new Map<string, TestDataSeeder>();

/**
 * Register a suite-specific seeder for lifecycle management
 */
export function registerSuiteSeeder(suiteName: string, seeder: TestDataSeeder): void {
  suiteSeederMap.set(suiteName, seeder);
  console.log(`[CACHE_CLEANUP] Registered seeder for suite: ${suiteName}`);
}

/**
 * Get or create a suite-specific seeder
 */
export function getSuiteSeeder(suiteName: string): TestDataSeeder {
  if (!suiteSeederMap.has(suiteName)) {
    const seeder = TestDataSeeder.createForSuite(suiteName);
    registerSuiteSeeder(suiteName, seeder);
  }
  return suiteSeederMap.get(suiteName)!;
}

// Global setup for cache cleanup
beforeEach(() => {
  // Reset API contract tracking for each test
  E2EAssertions.ApiContractTracker.resetMetrics();
  
  console.log(`[CACHE_CLEANUP] Test starting - API contract metrics reset`);
});

afterEach(() => {
  // Log API contract metrics after each test for visibility
  E2EAssertions.ApiContractTracker.logMetrics();
  
  // Clean up individual suite caches when tests complete
  // This happens after each suite completes all its tests
  const currentTest = expect.getState().currentTestName;
  if (currentTest) {
    console.log(`[CACHE_CLEANUP] Test completed: ${currentTest}`);
  }
});

// Global cleanup when all tests are done
process.on('exit', () => {
  console.log(`[CACHE_CLEANUP] Process exit - cleaning up ${suiteSeederMap.size} suite caches`);
  
  // Log metrics for all suite seeders
  suiteSeederMap.forEach((seeder, suiteName) => {
    console.log(`[CACHE_CLEANUP] Final metrics for ${suiteName}:`);
    seeder.logMetrics();
    seeder.clearCache();
  });
  
  // Clear static seeder cache as well
  TestDataSeeder.clearCache();
  TestDataSeeder.logMetrics();
  
  // Final API contract visibility metrics
  console.log(`[CACHE_CLEANUP] Final API contract metrics:`);
  E2EAssertions.ApiContractTracker.logMetrics();
});

export { TestDataSeeder };