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

```
Step 1: Get deals in current stage
{
  listId: 'discovery-stage-list-id',      // Or filter by stage attribute
}
// OR
{
  resource_type: 'deals',
  // Filter by stage = "Discovery"
}

Step 2: Evaluate advancement criteria
for (const deal of deals) {
  // Check activity timestamps
  const daysSinceUpdate = getDaysSince(deal.updated_at);

  // Validate required fields completed
  const hasRequiredData = deal.company && deal.value;

  // Confirm progression rules met
  const hasRecentActivity = daysSinceUpdate < 7;

  if (hasRequiredData && hasRecentActivity) {
    // Eligible for advancement
  }
}

Step 3: Update stage
{
  resource_type: 'deals',
  record_id: deal.record_id,
  record_data: {
    stage: 'In Progress',                // Standard: use exact option title
    value: 60000                         // Standard: updated deal value
  }
}
// Cross-ref: Check attio-workspace-schema for custom attributes

Step 4: Move to new list (if list-based)
// Remove from Discovery list
{
  listId: 'discovery-list-id',
  entryId: deal.discovery_entry_id
}
// Add to Proposal list
{
  listId: 'proposal-list-id',
  record_id: deal.record_id
}

Step 5: Create next-step task
{
  content: 'Follow up on proposal',
  title: 'Proposal Follow-up',
  linked_records: [{
    target_object: 'deals',
    target_record_id: deal.record_id
  }],
  dueDate: calculate_due(3)  // 3 days from now
}

Step 6: Notify team
{
  resource_type: 'deals',
  record_id: deal.record_id,
  title: 'Stage Advanced',
  content: 'Auto-advanced to Proposal Sent based on activity. Next: Follow up in 3 days.'
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
