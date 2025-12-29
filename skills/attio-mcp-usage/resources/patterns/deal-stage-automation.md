# Deal Stage Automation Pattern

## Keywords

`stage`, `auto-advance`, `progression`, `workflow`, `automation`, `trigger`, `deal velocity`, `pipeline automation`

## Overview

Auto-advance deals through pipeline stages based on activity, data completeness, or time-based rules. This pattern evaluates deals and progresses them when criteria are met, with task creation and notification.

## When to Use

- Automating deal progression based on activity
- Moving deals between lists based on criteria
- Creating follow-up tasks after stage changes
- Enforcing data requirements for stage advancement
- Monitoring stale deals

## Workflow Steps

### Step 1: Get deals in current stage

Option A - Get from list:

Call `get-list-entries` with:

```json
{
  "listId": "<discovery-stage-list-id>",
  "limit": 100
}
```

Option B - Approximate search (not a deterministic stage filter):

Call `records_search` with:

```json
{
  "resource_type": "deals",
  "query": "Discovery"
}
```

> **Note**: `records_search` is a universal text search. It may not reliably return "stage = Discovery" deals unless your workspace uses consistent naming conventions. Prefer list-based pipelines (Option A) for deterministic stage selection.

### Step 2: Evaluate advancement criteria

For each deal, check:

- **Activity timestamps**: Has `updated_at` within last 7 days?
- **Required fields**: Has company, value, and contact assigned?
- **Data completeness**: All required fields populated?

> **Note**: Only advance deals that meet ALL criteria.

### Step 3: Update stage

Call `update-record` with:

```json
{
  "resource_type": "deals",
  "record_id": "<deal_record_id>",
  "record_data": {
    "stage": "In Progress",
    "value": 60000
  }
}
```

> **Note**: Use exact stage option title from your workspace. Check schema skill for available stage options.

### Step 4: Move to new list (if list-based pipeline)

Remove from current list:

Call `remove-record-from-list` with:

```json
{
  "listId": "<discovery-list-id>",
  "entryId": "<discovery_entry_id>"
}
```

Add to next stage list:

Call `add-record-to-list` with:

```json
{
  "listId": "<proposal-list-id>",
  "record_id": "<deal_record_id>",
  "resource_type": "deals"
}
```

### Step 5: Create next-step task

Call `create-task` with:

```json
{
  "content": "Follow up on proposal for Acme deal",
  "title": "Proposal Follow-up",
  "linked_records": [
    {
      "target_object": "deals",
      "target_record_id": "<deal_record_id>"
    }
  ],
  "dueDate": "2024-12-19T10:00:00Z"
}
```

### Step 6: Document stage change

Call `create-note` with markdown for structured logging:

```json
{
  "resource_type": "deals",
  "record_id": "<deal_record_id>",
  "title": "Stage Advanced",
  "content": "## Stage Change\nAuto-advanced to **Proposal Sent** based on activity.\n\n## Next Steps\n- Follow up in 3 days\n- Prepare proposal document",
  "format": "markdown"
}
```

## Advancement Criteria Examples

| From Stage    | To Stage      | Criteria                              |
| ------------- | ------------- | ------------------------------------- |
| Discovery     | Qualification | Has company + contact + budget info   |
| Qualification | Proposal      | Recent activity (<7 days) + value set |
| Proposal      | Negotiation   | Proposal sent + response received     |
| Negotiation   | Closed Won    | Contract signed                       |

## Key Points

- **Stage OR list movement** - Depends on workspace setup
- **Required data gates** - Enforce completeness before advancement
- **Activity tracking** - Use `updated_at` for staleness detection
- **Task creation** - Next steps after each advancement
- **Notes for audit trail** - Document automation actions

## Cross-References

- [Golden Rules](../golden-rules.md) - Stage field formatting, exact option titles
- [Tool Reference](../tool-reference.md) - `get-list-entries`, `update-record`, `create-task`, `create-note`
- **attio-workspace-schema skill** - Stage options, list IDs, required fields
