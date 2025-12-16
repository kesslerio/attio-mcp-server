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

```
Step 1: Discover available lists
// Get all lists to see organization structure
get-lists
// Returns: ["Prospecting", "Qualified", "Customers", "Active Deals", "Q4 Pipeline"]

Step 2: Add record to multiple lists
// Records can be in multiple lists simultaneously
{
  listId: 'prospecting-list-id',
  record_id: company.record_id
}
{
  listId: 'q4-target-accounts-id',
  record_id: company.record_id
}
// Cross-ref: [schema skill] for list IDs

Step 3: Filter list entries
// Find high-value deals in active pipeline
{
  listId: 'active-deals-id',
  attributeSlug: 'value',                  // Check schema for exact slug
  condition: 'greater_than',
  value: 25000
}

// Find companies in specific industry
{
  listId: 'prospecting-id',
  attributeSlug: 'industry',
  condition: 'equals',
  value: 'Technology'
}

Step 4: Update list entry attributes
// Update priority on list entry (not record)
{
  listId: 'prospecting-id',
  entryId: list_entry.entry_id,
  attributes: {
    priority: 'High',
    follow_up_date: '2024-12-20'
  }
}

Step 5: Batch operations on list
// Get all entries
{
  listId: 'target-accounts-id',
  limit: 100
}
// Process each entry
for (const entry of entries) {
  // Update record or list entry
  // Add notes, create tasks, etc.
}
```

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
