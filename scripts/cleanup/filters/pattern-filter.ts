/**
 * Pattern-based filtering for cleanup operations
 */
import { AttioRecord, FilterResult, ResourceType } from '../core/types.js';
import { extractRecordName, matchesPatterns } from '../core/utils.js';
import { logInfo } from '../core/utils.js';

/**
 * Filter records by name patterns
 */
export function filterByPatterns(
  records: AttioRecord[], 
  patterns: string[],
  resourceType: ResourceType
): FilterResult {
  if (!patterns.length) {
    // SAFETY: When no patterns specified, return NO matches instead of ALL matches
    // This prevents accidental deletion of all records when patterns are empty
    logInfo(`⚠️  No patterns specified for ${resourceType} - returning no matches for safety`, {
      recordsCount: records.length,
      message: 'Use explicit patterns or API token filtering to select records for deletion'
    });
    return { matched: [], excluded: records, reasons: ['No patterns specified - defaulting to safe mode'] };
  }

  const matched: AttioRecord[] = [];
  const excluded: AttioRecord[] = [];
  const reasons: string[] = [];

  for (const record of records) {
    const name = extractRecordName(record, resourceType);
    
    if (matchesPatterns(name, patterns)) {
      matched.push(record);
    } else {
      excluded.push(record);
      reasons.push(`${name}: Does not match patterns [${patterns.join(', ')}]`);
    }
  }

  logInfo(`Pattern filter results for ${resourceType}`, {
    patterns,
    total: records.length,
    matched: matched.length,
    excluded: excluded.length
  });

  return { matched, excluded, reasons };
}

/**
 * Predefined test patterns for common test scenarios
 */
export const TEST_PATTERNS = {
  // E2E test patterns
  E2E_TASKS: [
    'E2E Test Task created for testing purposes*',
    'TEST_task_*',
    'E2E_TEST_task_*'
  ],
  
  // General test patterns
  GENERIC_TEST: [
    'test*',
    'Test*',
    'TEST*',
    '*test*',
    '*Test*',
    'E2E*',
    'Mock*',
    'Demo*',
    'Temp*'
  ],

  // API testing patterns
  API_TEST: [
    'Basic task',
    'Relationship validation task',
    'Consistency validation task',
    'Integration boundary test task',
    'Direct API test task',
    'Task with long content that tests field limits*'
  ],

  // Combined comprehensive patterns
  ALL_TEST: [
    // E2E patterns
    'E2E Test Task created for testing purposes*',
    'TEST_task_*',
    'E2E_TEST_task_*',
    // Generic test patterns
    'test*',
    'Test*',
    'TEST*',
    '*test*',
    '*Test*',
    'E2E*',
    'Mock*',
    'Demo*',
    'Temp*',
    // API test patterns  
    'Basic task',
    'Relationship validation task',
    'Consistency validation task',
    'Integration boundary test task',
    'Direct API test task',
    'Task with long content that tests field limits*'
  ]
};

/**
 * Get test patterns based on resource type
 */
export function getDefaultTestPatterns(resourceType: ResourceType): string[] {
  switch (resourceType) {
    case 'tasks':
      return TEST_PATTERNS.ALL_TEST;
    default:
      return TEST_PATTERNS.GENERIC_TEST;
  }
}