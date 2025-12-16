# Bulk Operations Pattern

## Keywords

`import`, `bulk`, `batch`, `mass`, `migrate`, `upload`, `CSV`, `spreadsheet`, `sync`

## Overview

Import or update records from external sources at scale. This pattern handles validation, deduplication, error handling, and rate limiting for mass operations across any object type.

## When to Use

- Importing data from spreadsheets or external systems
- Bulk updating records based on external data
- Migrating data from other CRMs
- Syncing records from external databases
- Mass enrichment operations

## Workflow Steps

### For each row in import data:

#### Step 1: Validate data

Before making any API calls:

- Check required fields present (name, domain/email)
- Validate data types match schema (text, number, select, date)
- Confirm attribute slugs exist via schema skill

#### Step 2: Search for existing record

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "acme.com"
}
```

> **Note**: Use unique identifier (domain for companies, email for people).

#### Step 3a: Update if exists

Call `update-record` with:

```json
{
  "resource_type": "companies",
  "record_id": "<existing_record_id>",
  "record_data": {
    "description": "Updated via bulk import",
    "categories": ["Enterprise"]
  }
}
```

> **Note**: Only update changed fields, not all fields.

#### Step 3b: Create if not found

Call `create-record` with:

```json
{
  "resource_type": "companies",
  "record_data": {
    "name": "Acme Corp",
    "domains": ["acme.com"],
    "description": "Imported from spreadsheet"
  }
}
```

#### Step 4: Handle errors gracefully

If a call fails, log the error and continue with the next row. Don't stop the entire import.

Error types to handle:

- **DUPLICATE**: Record already exists → search and update instead
- **VALIDATION_ERROR**: Invalid attribute → check schema, skip row
- **RATE_LIMIT**: Too many requests → wait 1 second, retry

#### Step 5: Rate limit

Wait 100ms between API calls to respect rate limits.

#### Step 6: Track progress

After processing all rows, document the import results.

Call `create-note` with:

```json
{
  "resource_type": "companies",
  "record_id": "<any_processed_record_id>",
  "title": "Bulk Import Completed",
  "content": "Import Date: 2024-12-15\nTotal Rows: 500\nSuccess: 485\nFailed: 10\nSkipped (duplicates): 5\nSource: Q4 prospect list"
}
```

## Best Practices

- **Validate ALL data before starting** - Don't start import with invalid data
- **Use find-or-create pattern** - Prevents duplicates
- **Handle errors without stopping** - Log and continue
- **Rate limit: 100ms delay** between requests
- **Log results** for troubleshooting
- **Batch in groups of 100** for large imports

## Error Handling Summary

| Error Type        | Action                         |
| ----------------- | ------------------------------ |
| DUPLICATE         | Search and update existing     |
| VALIDATION_ERROR  | Log error, skip row            |
| RATE_LIMIT        | Wait 1 second, retry once      |
| NOT_FOUND         | Create new record              |
| PERMISSION_DENIED | Log error, check API key scope |

## Import Results Tracking

Track results for each import batch:

- **Success**: Record created or updated
- **Failed**: Error occurred, logged for review
- **Skipped**: Duplicate detected, existing record unchanged

## Cross-References

- [Golden Rules](../golden-rules.md) - Rate limiting, error handling
- [Tool Reference](../tool-reference.md) - `records_search`, `create-record`, `update-record`
- [Error Handling](error-handling.md) - Detailed error recovery patterns
- **attio-workspace-schema skill** - Object schemas and required fields
