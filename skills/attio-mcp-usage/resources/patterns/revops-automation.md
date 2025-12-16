# RevOps Automation Pattern

## Keywords

`webhook`, `form submission`, `automation`, `Slack`, `integration`, `Zapier`, `trigger`, `sync`, `workflow automation`, `multi-tool`

## Overview

Revenue Operations automation patterns for multi-tool orchestration. Handle webhook events, process form submissions, sync data across systems, and build automated workflows that connect Attio with external tools.

## When to Use

- Processing inbound webhooks from forms or apps
- Syncing data between Attio and external systems
- Building automated lead routing workflows
- Sending notifications to Slack, email, or other channels
- Orchestrating multi-step automation sequences

## Workflow Steps

### Form Submission Processing

When receiving webhook from form provider (Typeform, HubSpot, Tally, etc.):

#### Step 1: Search for existing company

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "acme.com"
}
```

> **Note**: Use normalized domain from form email.

#### Step 2: Create company if not found

Call `create-record` with:

```json
{
  "resource_type": "companies",
  "record_data": {
    "name": "Acme Corp",
    "domains": ["acme.com"],
    "description": "Inbound from contact form"
  }
}
```

> **Note**: Custom attributes (verify via schema): `lead_source`, `form_id`.

#### Step 3: Create or update person

Call `create-record` with:

```json
{
  "resource_type": "people",
  "record_data": {
    "name": "John Doe",
    "email_addresses": ["john@acme.com"],
    "company": "<company_record_id>"
  }
}
```

> **Note**: Custom attributes (verify via schema): `lead_source`, `form_submission_date`.

#### Step 4: Add to appropriate list

Call `add-record-to-list` with:

```json
{
  "listId": "<inbound-leads-id>",
  "record_id": "<person_record_id>",
  "resource_type": "people"
}
```

> **Note**: List selection depends on form source (contact form → inbound-leads, demo request → demo-requests, etc.).

#### Step 5: Create follow-up task

Call `create-task` with:

```json
{
  "content": "Form submission: Interested in enterprise pricing...",
  "title": "Form Lead Follow-up",
  "linked_records": [
    {
      "target_object": "people",
      "target_record_id": "<person_record_id>"
    }
  ],
  "assignees": ["<routed_rep_id>"],
  "dueDate": "2024-12-16T09:00:00Z"
}
```

### Notification Workflow (e.g., Slack)

After significant events (deal won, high-value lead, etc.), document the notification:

#### Step 1: Document notification sent

Call `create-note` with:

```json
{
  "resource_type": "deals",
  "record_id": "<deal_record_id>",
  "title": "Notification Sent",
  "content": "Slack notification sent to #sales-wins\nTimestamp: 2024-12-15T15:30:00Z\nMessage: Deal Won - Acme Corp ($50,000)"
}
```

### Data Sync Pattern

For syncing records between Attio and external systems (Salesforce, HubSpot, etc.):

#### Step 1: Search for existing record by external ID

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "sf_12345"
}
```

> **Note**: Search by Salesforce ID stored in custom attribute.

#### Step 2: Update existing record

Call `update-record` with:

```json
{
  "resource_type": "companies",
  "record_id": "<company_record_id>",
  "record_data": {
    "description": "Updated from Salesforce sync"
  }
}
```

> **Note**: Custom attributes (verify via schema): `salesforce_id`, `industry`, `employee_count`, `annual_revenue`.

#### Step 3: Or create new record

Call `create-record` with:

```json
{
  "resource_type": "companies",
  "record_data": {
    "name": "New Corp from Salesforce",
    "domains": ["newcorp.com"],
    "description": "Synced from Salesforce"
  }
}
```

> **Note**: Rate limit: Add 100ms delay between sync calls for bulk operations.

### Lead Routing Automation

Route leads based on criteria (company size, industry, region):

#### Step 1: Assign to appropriate rep/team

Call `update-record` with:

```json
{
  "resource_type": "people",
  "record_id": "<lead_record_id>",
  "record_data": {
    "team": ["<assigned_rep_id>"]
  }
}
```

> **Note**: `team` is standard attribute. Custom attributes (verify via schema): `assigned_date`, `routing_reason`.

#### Step 2: Notify assigned rep

Call `create-task` with:

```json
{
  "content": "New lead assigned: John Doe from Acme Corp (Enterprise, Technology)",
  "title": "New Lead Assignment",
  "linked_records": [
    {
      "target_object": "people",
      "target_record_id": "<lead_record_id>"
    }
  ],
  "assignees": ["<assigned_rep_id>"],
  "dueDate": "2024-12-15T17:00:00Z"
}
```

### Multi-Tool Orchestration

For complex workflows spanning multiple systems:

#### Step 1: Document workflow execution

Call `create-note` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "title": "Automation Executed",
  "content": "Workflow: form_submission\nSteps Completed: create_attio_record, enrich_data, send_notification, create_task\nStatus: Success\nTimestamp: 2024-12-15T15:45:00Z"
}
```

## Common Integration Patterns

| External Tool      | Integration Type   | Use Case            |
| ------------------ | ------------------ | ------------------- |
| Typeform/Tally     | Webhook → Attio    | Form to lead        |
| Slack              | Attio → Webhook    | Notifications       |
| Salesforce         | Bidirectional sync | CRM sync            |
| Clearbit           | Enrich → Attio     | Data enrichment     |
| Outreach/Salesloft | Attio → API        | Sequence enrollment |
| Segment            | Events → Attio     | Product usage sync  |

## Key Points

- **Webhooks = real-time triggers** - Process events as they happen
- **Idempotency** - Handle duplicate webhooks gracefully (search before create)
- **Error recovery** - Log failures, retry transients
- **Rate limiting** - Respect API limits across all systems (100ms between calls)
- **Audit trail** - Document automation actions in notes

## Cross-References

- [Golden Rules](../golden-rules.md) - Rate limiting, error handling
- [Tool Reference](../tool-reference.md) - All MCP tool signatures
- [Bulk Operations](bulk-operations.md) - Batch sync patterns
- [Error Handling](error-handling.md) - Robust error recovery
- **attio-workspace-schema skill** - Your integration-specific attributes
