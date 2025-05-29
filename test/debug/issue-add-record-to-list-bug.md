# Issue: Fix `add-record-to-list` Tool API Payload Bug

## Problem Description

The `add-record-to-list` MCP tool fails due to sending an incorrect payload structure to the Attio API. The API expects a nested `data` object with `parent_record_id`, `parent_object`, and `entry_values` as required fields, but the tool currently sends `listId` and `recordId` at the root level.

## Error Details

When using the `add-record-to-list` tool, users encounter errors like:

```
Validation error adding record to list: data: Required property 'data' not provided
```

or

```
data.parent_record_id: Property required but not provided
```

## Analysis

The issue is in how we construct the API payload. The Attio API expects:

```json
{
  "data": {
    "parent_record_id": "record-uuid-here",
    "parent_object": "companies", // or "people", etc.
    "entry_values": {
      // optional initial values for the list entry
      "stage": "Qualified",
      "priority": "High"
    }
  }
}
```

But our current implementation sends:

```json
{
  "listId": "list-uuid-here",
  "recordId": "record-uuid-here"
}
```

This mismatch is causing API validation errors.

## Expected Behavior

The tool should properly format the request payload according to the Attio API requirements, allowing users to add records to lists with optional initial values.

## Suggested Fixes

1. Update the `inputSchema` in `src/handlers/tool-configs/lists.ts` to include:
   - Required: `listId` and `recordId`
   - Optional: `objectType` (default to "companies") and `initialValues` (for setting initial attributes)

2. Update the handler in `src/handlers/tools/dispatcher/operations/lists.ts` to transform the input parameters into the correct API payload structure.

3. Modify `src/objects/lists.ts` to ensure the `addRecordToList` function accepts and properly utilizes the new parameters.

4. Update `src/api/operations/lists.ts` to ensure the core API call formats the payload correctly.

## Affected Files

- `src/handlers/tool-configs/lists.ts`
- `src/handlers/tools/dispatcher/operations/lists.ts`
- `src/objects/lists.ts`
- `src/api/operations/lists.ts`

## Test Cases

To verify the fix:
1. Add a company record to a list with no initial values
2. Add a person record to a list, specifying the object type
3. Add a record to a list with initial values for custom attributes
4. Try adding with an invalid object type (should fail with appropriate error)

## Expected Timeline

- Implementation: 1 day
- Testing: 0.5 day
- Documentation updates: 0.5 day