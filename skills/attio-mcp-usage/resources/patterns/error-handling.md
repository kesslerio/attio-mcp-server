# Error Handling Pattern

## Keywords

`error`, `retry`, `validate`, `exception`, `graceful`, `recovery`, `logging`, `debug`, `troubleshoot`

## Overview

Universal error handling template for all Attio MCP workflows. This pattern provides structured validation, execution, verification, and graceful error recovery with proper logging.

## When to Use

- Any multi-step workflow needing robust error handling
- Operations that may fail due to rate limits
- Validating data before API calls
- Logging operations for debugging
- Recovering from transient failures

## Workflow Steps

```typescript
async function safeWorkflow(params) {
  const operation = 'update-record'; // or passed as param
  let success = false;

  try {
    // Step 1: Validate inputs
    validateRecordId(params.record_id);
    validateAttributes(params.record_data, schema);

    // Step 2: Execute operation
    const result = await executeOperation(params);

    // Step 3: Verify result
    if (!result.record_id) {
      throw new Error('Operation failed: no record_id returned');
    }

    // Step 4: Log success (use structured logger)
    logger.info('Operation completed', {
      operation,
      record_id: result.record_id,
    });
    success = true;

    return result;
  } catch (error) {
    // Step 5: Handle errors gracefully
    if (error.message.includes('INVALID_UUID')) {
      logger.warn('Validation error', { operation, error: 'Invalid UUID' });
      return { error: 'Invalid UUID format', code: 'VALIDATION_ERROR' };
    } else if (error.message.includes('RATE_LIMIT')) {
      logger.warn('Rate limited, retrying', { operation });
      await delay(1000);
      return safeWorkflow(params); // Retry once
    } else if (error.message.includes('NOT_FOUND')) {
      logger.warn('Record not found', {
        operation,
        record_id: params.record_id,
      });
      return { error: 'Record not found', code: 'NOT_FOUND' };
    } else {
      // Log and escalate unknown errors
      logger.error('Unexpected error', { operation, error: error.message });
      throw error;
    }
  } finally {
    // Step 6: Document operation (optional)
    await createNote({
      resource_type: params.resource_type,
      record_id: params.record_id,
      title: 'Operation Attempted',
      content: `Operation: ${operation}\nStatus: ${success ? 'Success' : 'Failed'}\nTimestamp: ${new Date().toISOString()}`,
    });
  }
}
```

## Common Error Types

| Error Code          | Cause                 | Recovery                    |
| ------------------- | --------------------- | --------------------------- |
| `INVALID_UUID`      | Malformed record ID   | Validate format before call |
| `RATE_LIMIT`        | Too many requests     | Delay and retry (1s)        |
| `NOT_FOUND`         | Record doesn't exist  | Check ID, search first      |
| `VALIDATION_ERROR`  | Invalid attribute     | Check schema skill          |
| `PERMISSION_DENIED` | API key scope         | Check API permissions       |
| `DUPLICATE`         | Record already exists | Search before create        |

## Validation Functions

```typescript
function validateRecordId(id: string): void {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error('INVALID_UUID: ' + id);
  }
}

function validateAttributes(data: object, schema: object): void {
  for (const [key, value] of Object.entries(data)) {
    if (!schema[key]) {
      throw new Error(`VALIDATION_ERROR: Unknown attribute ${key}`);
    }
    // Type checking based on schema
  }
}
```

## Logging Best Practices

```typescript
// DO: Structured logging with context
logger.info('Operation completed', {
  toolName: 'update-record',
  userId: context.userId,
  requestId: context.requestId,
  record_id: result.record_id,
});

// DON'T: Console.log in production
console.log('Updated record'); // Never in src/

// DON'T: Log secrets or PII
logger.info({ apiKey: key }); // Never!
```

## Cross-References

- [Golden Rules](../golden-rules.md) - Validation rules, error prevention
- [Tool Reference](../tool-reference.md) - Tool-specific error responses
- **CLAUDE.md** - Structured logging requirements with `toolName`, `userId`, `requestId`
