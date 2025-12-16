# Sales Pipeline Pattern

## Keywords

`sales`, `deal`, `pipeline`, `opportunity`, `close`, `win`, `revenue`, `CRM`, `sales funnel`

## Overview

Manage deals from opportunity creation to close. This is the PRIMARY workflow for sales-focused workspaces, using deal-centric operations rather than company-centric tracking.

## When to Use

- Creating new sales opportunities
- Managing deal progression through stages
- Tracking deal values and close dates
- Associating companies and people with deals
- Creating follow-up tasks for sales reps

## Workflow Steps

```
Step 1: Create deal from opportunity
// Tool: create-record
{
  resource_type: 'deals',
  record_data: {
    name: 'Q4 Enterprise Deal - Acme Inc',
    value: 50000,                         // Standard: currency field
    stage: 'In Progress',                 // Standard: use exact option title
    associated_company: ['company_record_id']  // Standard: array for reference
  }
}

Step 2: Add to active deals list
// Tool: add-record-to-list
{
  listId: 'your-active-deals-list-id',   // From schema skill
  record_id: deal.record_id,
  resource_type: 'deals'
}

Step 3: Create discovery task
// Tool: create-task
{
  content: 'Schedule discovery call',
  title: 'Discovery Call',
  linked_records: [{
    target_object: 'deals',
    target_record_id: deal.record_id
  }],
  dueDate: '2024-12-16T10:00:00Z'
}

Step 4: Document opportunity context
// Tool: create-note
{
  resource_type: 'deals',
  record_id: deal.record_id,
  title: 'Opportunity Context',
  content: 'Source: Inbound demo request. Key stakeholders: CTO, VP Eng. Budget confirmed: $50k.'
}

Step 5: Progress through stages
// Tool: update-record
{
  resource_type: 'deals',
  record_id: deal.record_id,
  record_data: {
    stage: 'Won',                         // Standard: use exact option title
    value: 55000                          // Standard: updated deal value
  }
}

Step 6: Move between lists (if using list-based pipeline)
// Tool: remove-record-from-list
{
  listId: 'discovery-list-id',
  entryId: discovery_entry.entry_id
}
// Tool: add-record-to-list
{
  listId: 'proposal-list-id',
  record_id: deal.record_id
}
```

## Key Points

- **Deal-centric workflow** (not company-centric)
- **Status field updates OR list movement** (depending on workspace setup)
- **Task creation** for follow-ups
- **Notes** for context and audit trail
- Always use **exact option titles** for status/stage fields

## Cross-References

- [Golden Rules](../golden-rules.md) - Error prevention, especially status field formatting
- [Tool Reference](../tool-reference.md) - `create-record`, `update-record`, `create-task`, `create-note`
- **attio-workspace-schema skill** - Your workspace's deal attributes, stage options, list IDs
