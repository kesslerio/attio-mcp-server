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

```
for each row in import_data:

  Step 1: Validate data
  - Check required fields present
  - Validate data types match schema
  - Confirm attribute slugs exist
  // Cross-ref: [schema skill] for validation

  Step 2: Check for existing record
  {
    resource_type: import_object_type,
    query: row.unique_identifier
  }

  Step 3: Create or update
  if (exists) {
    // Update existing
    {
      resource_type: import_object_type,
      record_id: existing.record_id,
      record_data: changed_fields_only
    }
  } else {
    // Create new
    {
      resource_type: import_object_type,
      record_data: all_required_fields
    }
  }

  Step 4: Handle errors gracefully
  try {
    // Operation
  } catch (error) {
    log_failure(row, error);
    continue;  // Don't stop entire import
  }

  Step 5: Rate limit
  await delay(100);  // 100ms between requests

  Step 6: Track progress
  completed++;
  log_progress(completed, total);
```

## Best Practices

- **Validate ALL data before starting** - Don't start import with invalid data
- **Use find-or-create pattern** - Prevents duplicates
- **Handle errors without stopping** - Log and continue
- **Rate limit: 100ms delay** between requests
- **Log results** for troubleshooting
- **Batch in groups of 100** for large imports

## Error Handling

```typescript
const results = {
  success: [],
  failed: [],
  skipped: [],
};

for (const row of data) {
  try {
    const result = await processRow(row);
    results.success.push({ row, result });
  } catch (error) {
    if (error.code === 'DUPLICATE') {
      results.skipped.push({ row, reason: 'duplicate' });
    } else {
      results.failed.push({ row, error: error.message });
    }
  }
  await delay(100);
}

// Summary report
console.log(`Success: ${results.success.length}`);
console.log(`Failed: ${results.failed.length}`);
console.log(`Skipped: ${results.skipped.length}`);
```

## Cross-References

- [Golden Rules](../golden-rules.md) - Rate limiting, error handling
- [Tool Reference](../tool-reference.md) - `search-records`, `create-record`, `update-record`
- **attio-workspace-schema skill** - Object schemas and required fields
