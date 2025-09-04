#!/usr/bin/env node
/**
 * QA Test Script for Issue #507: Content Search for Tasks and Lists
 * 
 * This script validates that the enhanced content search functionality works correctly
 * for both Tasks and Lists resource types as specified in the issue requirements.
 */

import { UniversalSearchService } from './src/services/UniversalSearchService.js';
import { UniversalResourceType, SearchType, MatchType, SortType } from './src/handlers/tool-configs/universal/types.js';

// Mock dependencies for QA testing
const mockTasks = [
  {
    id: { task_id: 'task-001' },
    content: 'Complete project alpha testing and documentation',
    title: 'Alpha Project Testing',
    content_plaintext: 'Complete project alpha testing and documentation',
    status: 'open',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: { task_id: 'task-002' },
    content: 'Review beta release candidate',
    title: 'Beta Review',
    content_plaintext: 'Review beta release candidate',
    status: 'open',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: { task_id: 'task-003' },
    content: 'AI integration task for machine learning models',
    title: 'AI Integration',
    content_plaintext: 'AI integration task for machine learning models',
    status: 'in_progress',
    created_at: '2024-01-03T00:00:00Z',
  },
];

const mockLists = [
  {
    id: { list_id: 'list-001' },
    name: 'Customer Prospects',
    title: 'Customer Prospects',
    description: 'List of potential customers and prospects for sales team',
    api_slug: 'customer-prospects',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: { list_id: 'list-002' },
    name: 'Employee Directory',
    title: 'Employee Directory',
    description: 'Complete list of all company employees and contractors',
    api_slug: 'employees',
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: { list_id: 'list-003' },
    name: 'Customer Support Tickets',
    title: 'Customer Support Tickets',
    description: 'Customer service tickets and support requests',
    api_slug: 'support-tickets',
    created_at: '2024-01-03T00:00:00Z',
  },
];

// Mock the required modules
await import('./test/utils/test-setup.js');

// Import required modules for mocking
import { vi } from 'vitest';

// Setup mocks
vi.mock('./src/objects/tasks.js', () => ({
  listTasks: vi.fn().mockResolvedValue(mockTasks),
}));

vi.mock('./src/objects/lists.js', () => ({
  searchLists: vi.fn().mockResolvedValue(mockLists),
}));

vi.mock('./src/services/CachingService.js', () => ({
  CachingService: {
    getOrLoadTasks: vi.fn().mockImplementation(async (loadFn) => {
      const data = await loadFn();
      return { data, fromCache: false };
    }),
  },
}));

vi.mock('./src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: {
    convertTaskToRecord: vi.fn().mockImplementation((task) => ({
      id: { record_id: task.id.task_id, task_id: task.id.task_id },
      values: {
        content: task.content,
        title: task.title || task.content?.substring(0, 50) + '...',
        content_plaintext: task.content_plaintext || task.content,
        status: task.status,
        created_at: task.created_at,
      },
    })),
  },
}));

vi.mock('./src/services/create/index.js', () => ({
  shouldUseMockData: vi.fn(() => false),
}));

vi.mock('./src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    startOperation: vi.fn(() => 'test-perf-id'),
    markApiStart: vi.fn(() => Date.now()),
    markApiEnd: vi.fn(),
    markTiming: vi.fn(),
    endOperation: vi.fn(),
  },
}));

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logTest(message) {
  log(`🧪 ${message}`, colors.yellow);
}

// Test runner
async function runTests() {
  log(`${colors.bold}QA Test Script for Issue #507: Content Search for Tasks and Lists${colors.reset}\n`);
  
  let passedTests = 0;
  let totalTests = 0;
  
  const runTest = async (testName, testFn) => {
    totalTests++;
    logTest(`Running: ${testName}`);
    
    try {
      await testFn();
      logSuccess(`PASSED: ${testName}`);
      passedTests++;
    } catch (error) {
      logError(`FAILED: ${testName} - ${error.message}`);
      console.log(error.stack);
    }
    console.log();
  };

  // Test 1: Tasks content search across default fields
  await runTest('Tasks content search - default fields', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.TASKS,
      query: 'project',
      search_type: SearchType.CONTENT,
    });

    if (result.length !== 1) {
      throw new Error(`Expected 1 result, got ${result.length}`);
    }
    
    if (!result[0].values?.content?.includes('project alpha testing')) {
      throw new Error('Expected task content to contain "project alpha testing"');
    }
  });

  // Test 2: Tasks content search with custom fields
  await runTest('Tasks content search - custom fields', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.TASKS,
      query: 'Alpha',
      search_type: SearchType.CONTENT,
      fields: ['title'],
    });

    if (result.length !== 1) {
      throw new Error(`Expected 1 result, got ${result.length}`);
    }
    
    if (!result[0].values?.title?.includes('Alpha Project Testing')) {
      throw new Error('Expected task title to contain "Alpha Project Testing"');
    }
  });

  // Test 3: Tasks exact match
  await runTest('Tasks content search - exact match', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.TASKS,
      query: 'AI Integration',
      search_type: SearchType.CONTENT,
      match_type: MatchType.EXACT,
      fields: ['title'],
    });

    if (result.length !== 1) {
      throw new Error(`Expected 1 result for exact match, got ${result.length}`);
    }
    
    if (result[0].values?.title !== 'AI Integration') {
      throw new Error('Expected exact match for title "AI Integration"');
    }
  });

  // Test 4: Tasks relevance ranking
  await runTest('Tasks content search - relevance ranking', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.TASKS,
      query: 'AI',
      search_type: SearchType.CONTENT,
      sort: SortType.RELEVANCE,
    });

    if (result.length !== 1) {
      throw new Error(`Expected 1 result, got ${result.length}`);
    }
    
    // The task with "AI" in both title and content should be the only match
    if (result[0].id?.task_id !== 'task-003') {
      throw new Error('Expected task-003 to rank highest with AI mentions');
    }
  });

  // Test 5: Lists content search across default fields
  await runTest('Lists content search - default fields', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.LISTS,
      query: 'Customer',
      search_type: SearchType.CONTENT,
    });

    if (result.length !== 2) {
      throw new Error(`Expected 2 results for "Customer", got ${result.length}`);
    }
    
    // Verify both customer-related lists are returned
    const names = result.map(r => r.values?.name);
    if (!names.includes('Customer Prospects') || !names.includes('Customer Support Tickets')) {
      throw new Error('Expected both Customer Prospects and Customer Support Tickets');
    }
  });

  // Test 6: Lists content search with custom fields
  await runTest('Lists content search - custom fields', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.LISTS,
      query: 'sales team',
      search_type: SearchType.CONTENT,
      fields: ['description'],
    });

    if (result.length !== 1) {
      throw new Error(`Expected 1 result, got ${result.length}`);
    }
    
    if (!result[0].values?.description?.includes('sales team')) {
      throw new Error('Expected list description to contain "sales team"');
    }
  });

  // Test 7: Lists exact match
  await runTest('Lists content search - exact match', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.LISTS,
      query: 'Employee Directory',
      search_type: SearchType.CONTENT,
      match_type: MatchType.EXACT,
      fields: ['name'],
    });

    if (result.length !== 1) {
      throw new Error(`Expected 1 result for exact match, got ${result.length}`);
    }
    
    if (result[0].values?.name !== 'Employee Directory') {
      throw new Error('Expected exact match for name "Employee Directory"');
    }
  });

  // Test 8: Lists relevance ranking
  await runTest('Lists content search - relevance ranking', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.LISTS,
      query: 'Customer',
      search_type: SearchType.CONTENT,
      sort: SortType.RELEVANCE,
    });

    if (result.length !== 2) {
      throw new Error(`Expected 2 results, got ${result.length}`);
    }
    
    // Customer Support Tickets should rank higher (more customer mentions)
    if (result[0].values?.name !== 'Customer Support Tickets') {
      throw new Error('Expected Customer Support Tickets to rank higher');
    }
  });

  // Test 9: Pagination with content search
  await runTest('Content search pagination', async () => {
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.LISTS,
      query: 'list',
      search_type: SearchType.CONTENT,
      limit: 1,
      offset: 0,
    });

    if (result.length !== 1) {
      throw new Error(`Expected 1 result with limit=1, got ${result.length}`);
    }
  });

  // Test 10: Performance - acceptable response time
  await runTest('Performance test - response time', async () => {
    const startTime = Date.now();
    
    await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.TASKS,
      query: 'test',
      search_type: SearchType.CONTENT,
    });
    
    const duration = Date.now() - startTime;
    
    // Should complete in under 100ms for small dataset (as specified in acceptance criteria)
    if (duration > 100) {
      throw new Error(`Response time ${duration}ms exceeds 100ms threshold`);
    }
    
    logInfo(`Response time: ${duration}ms`);
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  if (passedTests === totalTests) {
    logSuccess(`🎉 All ${totalTests} tests PASSED! Issue #507 implementation is working correctly.`);
  } else {
    logError(`❌ ${totalTests - passedTests} out of ${totalTests} tests FAILED.`);
  }
  console.log('='.repeat(60));

  return passedTests === totalTests;
}

// Run the tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  });