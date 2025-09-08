/**
 * Shared constants and configuration for universal tool tests
 *
 * This file centralizes constants used across multiple universal test files:
 * - advanced-operations.test.ts
 * - core-operations.test.ts
 * - integration.test.ts
 * - performance.test.ts
 */

import {
  UniversalResourceType,
  DetailedInfoType,
  RelationshipType,
  ContentSearchType,
  TimeframeType,
  BatchOperationType,
} from '../../../../../src/handlers/tool-configs/universal/types.js';

// Environment Detection
export const TEST_ENVIRONMENT = {
  isCI: process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true',
  skipIntegrationTests: !process.env.ATTIO_API_KEY,
  skipPerformanceTests:
    !process.env.ATTIO_API_KEY || process.env.SKIP_PERFORMANCE_TESTS === 'true',
  ciMultiplier:
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'
      ? 2.5
      : 1,
} as const;

// Test Timeouts (with CI adjustments)
export const TEST_TIMEOUTS = {
  default: Math.round(30000 * TEST_ENVIRONMENT.ciMultiplier), // 30s local, 75s CI
  integration: Math.round(30000 * TEST_ENVIRONMENT.ciMultiplier), // 30s local, 75s CI
  performance: Math.max(
    120000,
    Math.round(60000 * TEST_ENVIRONMENT.ciMultiplier)
  ), // At least 2 minutes, more in CI
  hook: Math.round(30000 * TEST_ENVIRONMENT.ciMultiplier), // For beforeAll/afterAll hooks
} as const;

// Performance Budgets (with CI adjustments)
export const PERFORMANCE_BUDGETS = {
  singleRecord: Math.round(5000 * TEST_ENVIRONMENT.ciMultiplier), // 5s local, 12.5s CI
  tenRecords: Math.round(15000 * TEST_ENVIRONMENT.ciMultiplier), // 15s local, 37.5s CI
  twentyFiveRecords: Math.round(30000 * TEST_ENVIRONMENT.ciMultiplier), // 30s local, 75s CI
  fiftyRecords: Math.round(60000 * TEST_ENVIRONMENT.ciMultiplier), // 60s local, 150s CI
  searchBasic: Math.round(5000 * TEST_ENVIRONMENT.ciMultiplier), // 5s local, 12.5s CI
  searchLarge: Math.round(10000 * TEST_ENVIRONMENT.ciMultiplier), // 10s local, 25s CI
  searchFiltered: Math.round(8000 * TEST_ENVIRONMENT.ciMultiplier), // 8s local, 20s CI
  batchGet: Math.round(10000 * TEST_ENVIRONMENT.ciMultiplier), // 10s local, 25s CI
  batchDelete: Math.round(10000 * TEST_ENVIRONMENT.ciMultiplier), // 10s local, 25s CI
  rateLimitMin: TEST_ENVIRONMENT.isCI ? 100 : 300, // Lower minimum for CI
  rateLimitMax: Math.round(15000 * TEST_ENVIRONMENT.ciMultiplier), // 15s local, 37.5s CI
  concurrency: Math.round(25000 * TEST_ENVIRONMENT.ciMultiplier), // 25s local, 62.5s CI
  comparison: Math.round(10000 * TEST_ENVIRONMENT.ciMultiplier), // 10s local, 25s CI
} as const;

// Batch Operation Limits
export const BATCH_LIMITS = {
  cleanupBatchSize: 45, // Stay well under the 50 limit
  maxBatchSize: 50, // API limit
  staggerDelayMs: 100, // Delay between batch operations
} as const;

// Test Data Generation Patterns
export const TEST_DATA_PATTERNS = {
  timestamp: () => Date.now(),
  randomId: () => Math.random().toString(36).substring(7),
  generateTestName: (type: string, timestamp?: number, randomId?: string) => {
    return `${type} Test ${ts}-${id}`;
  },
  generateTestEmail: (
    prefix: string,
    timestamp?: number,
    randomId?: string
  ) => {
    return `${prefix}-${ts}-${id}@example.com`;
  },
  generateTestDomain: (
    prefix: string,
    timestamp?: number,
    randomId?: string
  ) => {
    return `${prefix}-${ts}-${id}.com`;
  },
} as const;

// Common Resource Types (for type safety and consistency)
export const RESOURCE_TYPES = {
  COMPANIES: UniversalResourceType.COMPANIES,
  PEOPLE: UniversalResourceType.PEOPLE,
  RECORDS: UniversalResourceType.RECORDS,
  TASKS: UniversalResourceType.TASKS,
} as const;

// Detailed Info Types
export const DETAILED_INFO_TYPES = {
  CONTACT: DetailedInfoType.CONTACT,
  BUSINESS: DetailedInfoType.BUSINESS,
  SOCIAL: DetailedInfoType.SOCIAL,
  BASIC: DetailedInfoType.BASIC,
  CUSTOM: DetailedInfoType.CUSTOM,
} as const;

// Relationship Types
export const RELATIONSHIP_TYPES = {
  COMPANY_TO_PEOPLE: RelationshipType.COMPANY_TO_PEOPLE,
  PEOPLE_TO_COMPANY: RelationshipType.PEOPLE_TO_COMPANY,
  PERSON_TO_TASKS: RelationshipType.PERSON_TO_TASKS,
  COMPANY_TO_TASKS: RelationshipType.COMPANY_TO_TASKS,
} as const;

// Content Search Types
export const CONTENT_SEARCH_TYPES = {
  NOTES: ContentSearchType.NOTES,
  ACTIVITY: ContentSearchType.ACTIVITY,
  INTERACTIONS: ContentSearchType.INTERACTIONS,
} as const;

// Timeframe Types
export const TIMEFRAME_TYPES = {
  CREATED: TimeframeType.CREATED,
  MODIFIED: TimeframeType.MODIFIED,
  LAST_INTERACTION: TimeframeType.LAST_INTERACTION,
} as const;

// Batch Operation Types
export const BATCH_OPERATION_TYPES = {
  CREATE: BatchOperationType.CREATE,
  UPDATE: BatchOperationType.UPDATE,
  DELETE: BatchOperationType.DELETE,
  GET: BatchOperationType.GET,
} as const;

// Common Test Schemas (empty schemas for mocking)
export const MOCK_SCHEMAS = {
  empty: { type: 'object', properties: {}, required: [] },
  advancedSearch: { type: 'object', properties: {}, required: [] },
  searchByRelationship: { type: 'object', properties: {}, required: [] },
  searchByContent: { type: 'object', properties: {}, required: [] },
  searchByTimeframe: { type: 'object', properties: {}, required: [] },
  batchOperations: { type: 'object', properties: {}, required: [] },
} as const;

// Date Validation Patterns
export const DATE_PATTERNS = {
  isoDateRegex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  defaultDateRange: {
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-31T23:59:59.999Z',
  },
} as const;

// Error Messages and Types
export const ERROR_MESSAGES = {
  apiError: (operation: string, resourceType: string, message: string) =>
    `${operation} failed for ${resourceType}: ${message}`,
  universalError: (operation: string, resourceType: string, message: string) =>
    `Universal ${operation} failed for resource type ${resourceType}: ${message}`,
} as const;

// Test Logging Configuration
export const TEST_LOGGING = {
  debugEnabled: process.env.TEST_DEBUG === 'true',
  logPerformance: (operation: string, duration: number) => {
    console.log(`${operation}: ${duration}ms`);
  },
  logEnvironment: () => {
    console.log(
      `Performance testing with ${TEST_ENVIRONMENT.isCI ? 'CI' : 'LOCAL'} budgets (multiplier: ${TEST_ENVIRONMENT.ciMultiplier}x)`
    );
  },
} as const;

/**
 * Performance Budget Soft Check
 * Validates performance budgets without failing tests during Phase A1
 * Returns boolean for test logic without console logging
 */
export const performanceBudgetSoftCheck = (
  actual: number,
  expected: number,
  isGreaterThan = true
): boolean => {
  return isGreaterThan ? actual > expected : actual < expected;
};

// Clean-up Delays
export const CLEANUP_DELAYS = {
  apiIndexing: 2000, // Wait for API to index new records
  betweenOperations: 100, // Small delay between operations
  batchStagger: 100, // Stagger between batch operations
} as const;
