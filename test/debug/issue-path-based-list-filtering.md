# Issue: Implement Path-Based Filtering for List Entries

## Problem Description

Currently, there's an issue with filtering list entries by properties of the parent record (like company name or record ID). When attempting to search for a company in a list using the `filter-list-entries` tool, it doesn't find the record even when it exists.

Example query:
```json
{
  "listId": "88709359-01f6-478b-ba66-c07347891b6f",
  "attributeSlug": "name",
  "condition": "contains",
  "value": "Vancouver Muscle Doctor"
}
```

This fails because the current implementation attempts to filter on list entry attributes directly, not on the properties of the parent record.

## Analysis

After reviewing the Attio API documentation, the correct approach for filtering list entries based on parent record properties is to use "path-based filtering". This allows for drilling down through related objects to filter based on their properties.

The Attio API requires a specific structure for path-based filtering:

```json
{
  "path": [
    ["listslug", "parent_record"],
    ["companies", "name"]
  ],
  "constraints": {
    "full_name": "Vancouver Muscle Doctor"
  }
}
```

Or for filtering by record ID:

```json
{
  "path": [
    ["listslug", "parent_record"]
  ],
  "constraints": {
    "record_id": "b41a0d79-30b7-5010-bcc0-f7c664bc7d8d"
  }
}
```

Our current implementation doesn't support this type of filtering.

## Proposed Solution

1. Create a new tool called `filter-list-entries-by-parent` with an appropriate schema:
   ```json
   {
     "listId": "string",
     "parentObjectType": "string",
     "parentAttributeSlug": "string",
     "condition": "string",
     "value": "string|number|boolean"
   }
   ```

2. Implement a handler that constructs the proper path-based filtering payload for the Attio API.

3. Update the existing list filtering utilities in `src/utils/record-utils.js` to support path-based filtering.

4. Add comprehensive tests for the new functionality.

## Affected Files

- `src/handlers/tool-configs/lists.ts` - Add new tool definition
- `src/handlers/tools/dispatcher/operations/lists.ts` - Add new handler
- `src/objects/lists.ts` - Implement path-based filtering logic
- `src/utils/record-utils.js` - Update filtering utilities to support path-based filtering
- `test/handlers/tools.path-filter-list.test.ts` - Add tests for the new tool
- `test/objects/lists.path-filter.test.ts` - Add tests for the new functionality

## Related Issues

This is related to the issue with the `add-record-to-list` tool that requires fixing the API payload structure. Both issues involve properly mapping our tool interfaces to the Attio API's expected payload structure.

## Expected Timeline

- Implementation: 2-3 days
- Testing: 1 day
- Documentation: 0.5 day