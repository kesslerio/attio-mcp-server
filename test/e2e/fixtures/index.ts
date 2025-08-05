/**
 * E2E Test Fixtures - Main Export File
 * 
 * Consolidates all test data factories for easy import in test files.
 */

export * from './companies.js';
export * from './people.js';
export * from './lists.js';
export * from './tasks.js';

// Re-export the factories from test-data for convenience
export { 
  CompanyFactory, 
  PersonFactory, 
  ListFactory, 
  TaskFactory,
  NoteFactory,
  TestScenarios,
  TestDataValidator
} from '../utils/test-data.js';