# Error Handling Pattern

## Keywords

`error`, `retry`, `validate`, `exception`, `graceful`, `recovery`, `logging`, `debug`, `troubleshoot`

## Overview

Universal error handling guidance for all Attio MCP workflows. This pattern provides structured validation, error recovery, and best practices for robust integrations.

## When to Use

- Any multi-step workflow needing robust error handling
- Operations that may fail due to rate limits
- Validating data before API calls
- Recovering from transient failures

## Validation Before Calls

### Validate Record IDs

Before calling any tool with a `record_id`, verify the UUID format:

- Valid: `12345678-1234-1234-1234-123456789012`
- Invalid: `12345`, `abc`, `null`

### Validate Attributes

Before calling `update-record` or `create-record`:

1. Check attribute slugs exist via schema skill
2. Verify data types match (text, number, select, date)
3. For select/status fields, use exact option titles

## Common Error Recovery

### INVALID_UUID Error

**Cause**: Malformed or missing record ID

**Recovery**:

1. Verify the record ID format
2. Search for the record first if ID is unknown

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "Acme Corp"
}
```

### RATE_LIMIT Error

**Cause**: Too many requests in short time

**Recovery**:

1. Wait 1 second before retrying
2. For bulk operations, add 100ms delay between calls

### NOT_FOUND Error

**Cause**: Record doesn't exist or was deleted

**Recovery**:

1. Search to verify record exists
2. Create the record if it should exist

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "<search_term>"
}
```

If not found, create:

Call `create-record` with:

```json
{
  "resource_type": "companies",
  "record_data": {
    "name": "Acme Corp",
    "domains": ["acme.com"]
  }
}
```

### VALIDATION_ERROR

**Cause**: Invalid attribute slug or value type

**Recovery**:

1. Check schema skill for valid attributes
2. Verify data type matches attribute type
3. For select fields, use exact option title

Call `records_discover_attributes` with:

```json
{
  "resource_type": "companies"
}
```

### DUPLICATE Error

**Cause**: Record already exists (unique constraint)

**Recovery**:

1. Search first, then update existing record

### PERMISSION_DENIED

**Cause**: API key lacks required scope

**Recovery**:

1. Check API key permissions in Attio settings
2. Request additional scopes if needed

## Error Code Reference

| Error Code          | Cause                 | Recovery                    |
| ------------------- | --------------------- | --------------------------- |
| `INVALID_UUID`      | Malformed record ID   | Validate format before call |
| `RATE_LIMIT`        | Too many requests     | Delay and retry (1s)        |
| `NOT_FOUND`         | Record doesn't exist  | Check ID, search first      |
| `VALIDATION_ERROR`  | Invalid attribute     | Check schema skill          |
| `PERMISSION_DENIED` | API key scope         | Check API permissions       |
| `DUPLICATE`         | Record already exists | Search before create        |

## Best Practices

1. **Validate before calling** - Check IDs and attributes upfront
2. **Search before create** - Prevent duplicates
3. **Handle partial failures** - In bulk operations, log failures and continue
4. **Document errors** - Create notes when operations fail for audit trail

### Document Operation Failure

Call `create-note` with:

```json
{
  "resource_type": "companies",
  "record_id": "<company_record_id>",
  "title": "Operation Failed",
  "content": "Operation: update-record\nError: VALIDATION_ERROR\nField: industry\nTimestamp: 2024-12-15T10:00:00Z"
}
```

## Cross-References

- [Golden Rules](../golden-rules.md) - Validation rules, error prevention
- [Tool Reference](../tool-reference.md) - Tool-specific error responses
- **CLAUDE.md** - Structured logging requirements
