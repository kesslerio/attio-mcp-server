# List Organization Pattern

## Keywords

`list`, `organize`, `filter`, `segment`, `categorize`, `tag`, `group`, `pipeline view`, `multi-list`

## Overview

Organize records via lists as an alternative to status-based pipelines. Records can belong to multiple lists simultaneously, enabling flexible segmentation and categorization across any object type.

## When to Use

- Organizing records into segments or categories
- Creating pipeline views without status fields
- Managing records across multiple overlapping categories
- Filtering and segmenting list entries
- Batch operations on specific record groups

## Workflow Steps

### Step 1: Discover available lists

Call `get-lists` with:

```json
{}
```

> **Note**: Returns all lists in your workspace (e.g., "Prospecting", "Qualified", "Customers", "Active Deals", "Q4 Pipeline").

### Step 2: Add record to multiple lists

Records can be in multiple lists simultaneously.

Call `add-record-to-list` with:

```json
{
  "listId": "<prospecting-list-id>",
  "record_id": "<company_record_id>",
  "resource_type": "companies"
}
```

Then call `add-record-to-list` again with:

```json
{
  "listId": "<q4-target-accounts-id>",
  "record_id": "<company_record_id>",
  "resource_type": "companies"
}
```

> **Note**: Get list IDs from your schema skill.

### Step 3: Get list entries with filtering

Call `get-list-entries` with:

```json
{
  "listId": "<active-deals-id>",
  "limit": 100
}
```

> **Note**: Filtering by attributes like `value > 25000` or `industry = Technology` is done by examining the returned entries. Use your schema skill to verify available attribute slugs.

### Step 4: Update list entry attributes

List entries can have their own attributes separate from the record.

Call `update-list-entry` with:

```json
{
  "listId": "<prospecting-id>",
  "entryId": "<list_entry_id>",
  "attributes": {
    "priority": "High",
    "follow_up_date": "2024-12-20"
  }
}
```

> **Note**: Use `entryId` (not `record_id`) for list entry operations.

### Step 5: Process list entries in batch

First, get all entries:

Call `get-list-entries` with:

```json
{
  "listId": "<target-accounts-id>",
  "limit": 100
}
```

Then for each entry, you can update records, add notes, or create tasks as needed using the `record_id` from each entry.

## Key Points

- **List-heavy users** organize by lists, not status fields
- **Multiple list memberships** for flexible categorization
- **List entry attributes ≠ record attributes** - entries can have their own fields
- **Filtering** for segmentation and targeting
- Use `entry_id` for list operations, `record_id` for record operations

## Cross-References

- [Golden Rules](../golden-rules.md) - List entry vs record attribute distinction
- [Tool Reference](../tool-reference.md) - `get-lists`, `get-list-entries`, `add-record-to-list`, `update-list-entry`
- **attio-workspace-schema skill** - Your workspace's list IDs and list-specific attributes
