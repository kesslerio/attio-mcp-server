# MCP P1 Task Management Tests

This directory contains the P1 (Priority 1) Task Management test suite for the Attio MCP Server. These tests validate core task operations through the Model Context Protocol interface using universal tools.

## Test Structure

```
test/e2e/mcp/task-operations/
├── task-crud.mcp.test.ts        # CRUD operations (Create, Read, Update, Delete)
├── task-assignments.mcp.test.ts # User assignment operations
├── task-workflow.mcp.test.ts    # Status updates, deadlines, completion
../shared/
├── constants.ts                 # API constraints and validation patterns
├── task-test-builder.ts         # Fluent interface for task creation
├── test-assertions.ts           # Standardized assertion patterns
├── test-logger.ts              # Structured logging utilities
└── mcp-test-base.js            # Base test infrastructure
```

## API Constraints & Field Behavior

### Task Field Immutability

**CRITICAL**: The Attio API enforces field-level immutability for tasks:

- **Immutable Fields**: `title`, `content` - Cannot be modified after creation
- **Mutable Fields**: `priority`, `status`, `due_date`, `assignees` - Can be updated via PATCH operations
- **Required Fields**: `title` and `content` - Must be provided during creation

### Universal Tool Integration

These tests use universal tools instead of task-specific tools:

```typescript
// ✅ Correct - Universal tool pattern
await this.executeToolCall('create-record', {
  resource_type: 'tasks',
  record_data: taskData,
});

// ❌ Incorrect - Task-specific tool (not available)
await this.executeToolCall('create-task', taskData);
```

### Response Validation Patterns

The tests use standardized patterns for validating API responses:

- **Create Success**: `/Created task|Successfully created task|✅.*created|created.*task/i`
- **Update Success**: `/Updated task|Successfully updated task|✅.*updated|updated.*task/i`
- **Delete Success**: `/deleted|removed|success/i`
- **Error Response**: `/error|invalid|validation|not found/i`

## Test Quality Standards

### P1 Quality Gate Requirements

- **Target**: 100% test pass rate for P1 priority tests
- **Current**: 96.5% (28/29 passing, 1 intentionally skipped)
- **Automatic Cleanup**: All tests clean up created data in `afterEach` hooks
- **Performance**: Tests complete within 30-second timeout

### Test Categories

1. **CRUD Operations** (10 tests)
   - Basic task creation with required/optional fields
   - Task retrieval and search functionality
   - Field updates (mutable fields only)
   - Safe deletion handling

2. **Assignment Operations** (9 tests)
   - Single and multiple user assignments
   - Assignment changes and removal
   - Edge cases (invalid data, duplicates)

3. **Workflow Operations** (10 tests)
   - Status progression through workflow states
   - Deadline management and updates
   - Task completion with workflow validation
   - Record linking (skipped - awaiting universal tool)

## Usage Examples

### Using TaskTestBuilder

```typescript
import { TaskTestBuilder } from '../shared/task-test-builder.js';

// Fluent interface for consistent task creation
const task = TaskTestBuilder.sales(this.generateTestId)
  .withPriority('high')
  .withStatus('in_progress')
  .withDueDateInDays(7)
  .withAssignee('user123', 'John Doe', 'john@example.com')
  .build();
```

### Using TestAssertions

```typescript
import { TestAssertions } from '../shared/test-assertions.js';

// Simplified assertion patterns
const taskId = TestAssertions.assertTaskCreated(result, 'Test Task');
TestAssertions.assertTaskUpdated(updateResult, taskId);
TestAssertions.assertGracefulError(errorResult, 'Invalid operation');
```

### Using Structured Logging

```typescript
import { testLogger } from '../shared/test-logger.js';

// Structured logging instead of console.log
testLogger.taskCreated(taskId, taskData.title, { testSuite: 'CRUD' });
testLogger.taskUpdated(taskId, updateData);
testLogger.cleanupCompleted('tasks', 5, 0);
```

## Configuration

### Environment Variables

- `E2E_MODE=true` - Enable E2E testing mode
- `USE_MOCK_DATA=false` - Use real API (required for E2E)
- `ATTIO_API_KEY` - API key for Attio integration
- `TEST_LOG_LEVEL` - Logging level (DEBUG, INFO, WARN, ERROR)
- `NO_COLOR=1` - Disable colored output

### Test Commands

```bash
# Run all P1 task management tests
npm run test:e2e:tasks

# Run specific test suite
E2E_MODE=true npm test test/e2e/mcp/task-operations/task-crud.mcp.test.ts

# Run with debug logging
TEST_LOG_LEVEL=DEBUG E2E_MODE=true npm test test/e2e/mcp/task-operations/

# Clean up test data
npm run cleanup:test-data:tasks --dry-run
npm run cleanup:test-data:tasks --live  # Use with caution
```

## Known Limitations

### Skipped Tests

1. **Record Linking Tests** - Marked as `describe.skip()`
   - **Reason**: Universal tool for record linking not yet available
   - **Status**: Waiting for universal equivalent of `link-record-to-task` tool
   - **Impact**: 1 test skipped, does not affect P1 quality gate

### API Limitations

1. **Content Field Immutability**
   - Cannot update task content after creation
   - Discovered during testing - not documented in API specs
   - Workaround: Create new task if content changes needed

2. **UUID Validation**
   - Task IDs must follow strict UUID format
   - Invalid IDs result in validation errors
   - Pattern: `/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i`

## Troubleshooting

### Common Issues

1. **Tool Not Found Errors**

   ```
   Error: Tool not found: create-task
   ```

   - **Solution**: Use universal tools with `resource_type: 'tasks'`

2. **Missing record_data Parameter**

   ```
   Error: Missing required parameter: record_data
   ```

   - **Solution**: Wrap data in `record_data` parameter for universal tools

3. **Content Immutability Errors**
   ```
   Error: Content field cannot be updated
   ```

   - **Solution**: Remove `content` from update operations

### Debug Commands

```bash
# Debug specific test with verbose output
E2E_MODE=true npm test task-crud.mcp.test.ts -- --reporter=verbose --bail=0

# Run with debug logging to see API calls
TEST_LOG_LEVEL=DEBUG E2E_MODE=true npm test task-operations/

# Check cleanup status
npm run cleanup:test-data:tasks --dry-run
```

## Contributing

When adding new tests to this suite:

1. **Use Shared Utilities**: Leverage TaskTestBuilder, TestAssertions, and testLogger
2. **Follow Cleanup Pattern**: Always implement cleanup in `afterEach` hooks
3. **Use Constants**: Import validation patterns and constraints from `constants.ts`
4. **Document Constraints**: Update this README with any new API constraints discovered
5. **Performance**: Ensure tests complete within 30-second timeout

## Related Issues

- **Issue #638**: P1 Task Management Tests implementation
- **Issue #612**: Complete MCP Testing Suite Implementation
- **Issue #352**: Universal tool consolidation
- **PR #643**: Initial P1 Task Management Tests implementation
