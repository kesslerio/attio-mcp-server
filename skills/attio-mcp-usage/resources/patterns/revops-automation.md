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

```
Step 1: Receive webhook payload
// Webhook from Typeform, HubSpot, or custom form
const form_data = {
  email: payload.email,
  name: payload.name,
  company: payload.company,
  message: payload.message,
  source: payload.form_id,
  timestamp: payload.submitted_at
};

Step 2: Validate and normalize data
const normalized = {
  email: form_data.email.toLowerCase().trim(),
  name: capitalize(form_data.name),
  company_name: form_data.company,
  domain: extract_domain(form_data.email)
};

Step 3: Search or create company
{
  resource_type: 'companies',
  query: normalized.domain
}
// If not found:
{
  resource_type: 'companies',
  record_data: {
    name: normalized.company_name,
    domains: [normalized.domain],
    description: `Inbound from ${form_data.source}`
    // Custom: lead_source, form_id
  }
}

Step 4: Create or update person
{
  resource_type: 'people',
  record_data: {
    name: normalized.name,
    email_addresses: [normalized.email],
    company: company.record_id
    // Custom: lead_source, form_submission_date
  }
}

Step 5: Add to appropriate list
{
  listId: determine_list(form_data.source),
  record_id: person.record_id
}

Step 6: Create follow-up task
{
  content: `Form submission: ${form_data.message.substring(0, 100)}`,
  title: 'Form Lead Follow-up',
  linked_records: [{
    target_object: 'people',
    target_record_id: person.record_id
  }],
  assignees: [route_to_rep(company)],
  dueDate: next_business_day()
}
```

### Slack Notification Workflow

```
Step 1: Trigger on significant event
// Events: new deal created, deal won, high-value lead
const event = {
  type: 'deal_won',
  deal: deal_record,
  company: associated_company,
  value: deal.value
};

Step 2: Prepare notification
const notification = {
  channel: '#sales-wins',
  message: format_slack_message(event),
  attachments: [{
    title: event.deal.name,
    value: format_currency(event.value),
    company: event.company.name,
    rep: event.deal.owner
  }]
};

Step 3: Document notification sent
{
  resource_type: 'deals',
  record_id: deal.record_id,
  title: 'Notification Sent',
  content: `Slack notification sent to ${notification.channel}\nTimestamp: ${new Date().toISOString()}`
}
```

### Data Sync Pattern

```
Step 1: Define sync mapping
const field_mapping = {
  // External System → Attio
  'sf_account_id': 'salesforce_id',        // Custom text field
  'sf_industry': 'industry',                // Custom select
  'sf_employees': 'employee_count',         // Custom number
  'sf_annual_revenue': 'annual_revenue'     // Custom currency
};

Step 2: Fetch external data
const external_records = await fetch_from_salesforce(query);

Step 3: Process each record
for (const external of external_records) {
  // Map fields
  const attio_data = {};
  for (const [ext_field, attio_field] of Object.entries(field_mapping)) {
    if (external[ext_field]) {
      attio_data[attio_field] = transform_value(external[ext_field], attio_field);
    }
  }

  // Search for existing record
  const existing = await search_by_external_id(external.sf_account_id);

  // Create or update
  if (existing) {
    {
      resource_type: 'companies',
      record_id: existing.record_id,
      record_data: attio_data
    }
  } else {
    {
      resource_type: 'companies',
      record_data: {
        name: external.name,
        domains: [external.website],
        ...attio_data
      }
    }
  }

  // Rate limit
  await delay(100);
}
```

### Lead Routing Automation

```
Step 1: Define routing rules
const routing_rules = [
  { condition: (lead) => lead.company_size >= 500, assign_to: 'enterprise_team_id' },
  { condition: (lead) => lead.industry === 'Technology', assign_to: 'tech_rep_id' },
  { condition: (lead) => lead.region === 'EMEA', assign_to: 'emea_team_id' },
  { default: 'general_queue_id' }
];

Step 2: Evaluate rules
function route_lead(lead) {
  for (const rule of routing_rules) {
    if (rule.condition && rule.condition(lead)) {
      return rule.assign_to;
    }
  }
  return routing_rules.find(r => r.default).default;
}

Step 3: Apply routing
const assigned_rep = route_lead(lead_data);

{
  resource_type: 'people',
  record_id: lead.record_id,
  record_data: {
    team: [assigned_rep]                  // Standard: team assignment
    // Custom: assigned_date, routing_reason
  }
}

Step 4: Notify assigned rep
{
  content: `New lead assigned: ${lead.name} from ${lead.company}`,
  title: 'New Lead Assignment',
  linked_records: [{
    target_object: 'people',
    target_record_id: lead.record_id
  }],
  assignees: [assigned_rep],
  dueDate: today()
}
```

### Multi-Tool Orchestration

```
Step 1: Define workflow sequence
const workflow = {
  trigger: 'form_submission',
  steps: [
    { action: 'create_attio_record', tool: 'attio' },
    { action: 'enrich_data', tool: 'clearbit' },
    { action: 'send_notification', tool: 'slack' },
    { action: 'create_task', tool: 'attio' },
    { action: 'add_to_sequence', tool: 'outreach' }
  ]
};

Step 2: Execute with error handling
for (const step of workflow.steps) {
  try {
    const result = await execute_step(step);
    log_success(step, result);
  } catch (error) {
    log_failure(step, error);
    // Continue or abort based on step criticality
    if (step.critical) {
      throw error;
    }
  }
}

Step 3: Document workflow execution
{
  resource_type: 'people',
  record_id: person.record_id,
  title: 'Automation Executed',
  content: `Workflow: ${workflow.trigger}
Steps Completed: ${completed_steps.join(', ')}
Status: ${all_success ? 'Success' : 'Partial'}
Timestamp: ${new Date().toISOString()}`
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
- **Idempotency** - Handle duplicate webhooks gracefully
- **Error recovery** - Log failures, retry transients
- **Rate limiting** - Respect API limits across all systems
- **Audit trail** - Document automation actions in notes

## Cross-References

- [Golden Rules](../golden-rules.md) - Rate limiting, error handling
- [Tool Reference](../tool-reference.md) - All MCP tool signatures
- [Bulk Operations](bulk-operations.md) - Batch sync patterns
- [Error Handling](error-handling.md) - Robust error recovery
- **attio-workspace-schema skill** - Your integration-specific attributes
