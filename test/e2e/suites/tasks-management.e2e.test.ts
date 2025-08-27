/**
 * Tasks Management E2E Tests - Main Entry Point
 *
 * This file has been split into focused test suites to comply with the 600-line
 * file size limit and improve maintainability. The comprehensive task management
 * testing is now divided into three specialized test files:
 *
 * 1. **tasks-management-core.e2e.test.ts** - Core CRUD operations
 *    - Test data setup (companies and people for relationships)
 *    - Basic task creation with various configurations
 *    - Task updates and modifications
 *    - Task deletion and cleanup
 *
 * 2. **tasks-management-advanced.e2e.test.ts** - Advanced features
 *    - Task listing and filtering with pagination
 *    - Task record linking and relationships
 *    - Task lifecycle management workflows
 *
 * 3. **tasks-management-validation.e2e.test.ts** - Quality assurance
 *    - Error handling and validation scenarios
 *    - Performance and scalability testing
 *    - Data consistency and integration validation
 *
 * Tools tested (using universal tools):
 * - search-records (resource_type: 'tasks') [formerly list-tasks]
 * - create-record (resource_type: 'tasks') [formerly create-task]
 * - create-record (resource_type: 'companies') [formerly create-company]
 * - create-record (resource_type: 'people') [formerly create-person]
 * - update-record (resource_type: 'tasks') [formerly update-task]
 * - delete-record (resource_type: 'tasks') [formerly delete-task]
 * - update-record (resource_type: 'tasks', with linked_records) [formerly link-record-to-task]
 *
 * Run all task management tests:
 * ```bash
 * npm test -- test/e2e/suites/tasks-management*.e2e.test.ts
 * ```
 *
 * Run individual test suites:
 * ```bash
 * npm test -- test/e2e/suites/tasks-management-core.e2e.test.ts
 * npm test -- test/e2e/suites/tasks-management-advanced.e2e.test.ts
 * npm test -- test/e2e/suites/tasks-management-validation.e2e.test.ts
 * ```
 *
 * @deprecated This file serves as documentation only. Tests have been moved to separate files.
 */

import { describe, it } from 'vitest';

describe.skip('Tasks Management E2E Tests - Redirected', () => {
  it('should reference the split test files', () => {
    // This test suite has been split into three focused files:
    // - tasks-management-core.e2e.test.ts
    // - tasks-management-advanced.e2e.test.ts  
    // - tasks-management-validation.e2e.test.ts
    //
    // See file header documentation for details on running the tests.
  });
});