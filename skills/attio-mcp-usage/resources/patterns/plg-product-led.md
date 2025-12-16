# PLG Product-Led Growth Pattern

## Keywords

`product usage`, `PQL`, `activation`, `signup`, `trial`, `freemium`, `conversion`, `product qualified`, `usage events`, `self-serve`

## Overview

Product-Led Growth workflows that connect product events to CRM actions. Track user signups, activation milestones, product-qualified leads (PQLs), and conversion from self-serve to sales-assisted.

## When to Use

- Tracking user signups and trial starts
- Identifying product-qualified leads (PQLs)
- Monitoring activation and engagement milestones
- Routing high-value users to sales
- Managing freemium to paid conversion

## Workflow Steps

### Signup Event Processing

```
Step 1: Create or update person from signup
{
  resource_type: 'people',
  record_data: {
    name: signup_event.name,
    email_addresses: [signup_event.email],
    job_title: signup_event.job_title
    // Custom: signup_date, signup_source, plan_type
  }
}

Step 2: Create or link company
// Search for existing company
{
  resource_type: 'companies',
  query: signup_event.company_domain
}

// Create if not found
{
  resource_type: 'companies',
  record_data: {
    name: signup_event.company_name,
    domains: [signup_event.company_domain]
    // Custom: company_size, industry
  }
}

Step 3: Link person to company
{
  resource_type: 'people',
  record_id: person.record_id,
  record_data: {
    company: company.record_id
  }
}

Step 4: Add to trial list
{
  listId: 'active-trials-id',
  record_id: person.record_id
}
```

### PQL Scoring and Detection

```
Step 1: Process product events
// Aggregate usage metrics
const pql_score = calculate_pql_score({
  logins_7d: event.logins,
  features_used: event.features,
  team_members: event.invites_sent,
  integrations: event.integrations_connected
});

Step 2: Update PQL score on record
{
  resource_type: 'people',
  record_id: person.record_id,
  record_data: {
    // Custom attributes - verify via schema
    // pql_score: pql_score,
    // last_activity_date: event.timestamp,
    // features_activated: event.features
  }
}

Step 3: Check PQL threshold
if (pql_score >= PQL_THRESHOLD) {
  // Create deal for sales follow-up
  {
    resource_type: 'deals',
    record_data: {
      name: `PQL - ${company.name}`,
      stage: 'Product Qualified',
      associated_company: [company.record_id],
      associated_people: [person.record_id]
      // Custom: pql_score, activation_events
    }
  }

  // Move to PQL list
  {
    listId: 'pql-queue-id',
    record_id: person.record_id
  }

  // Create task for sales
  {
    content: `High PQL score (${pql_score}) - reach out to ${person.name}`,
    title: 'PQL Follow-up',
    linked_records: [{
      target_object: 'people',
      target_record_id: person.record_id
    }],
    assignees: ['sales_rep_id'],
    dueDate: next_business_day()
  }
}
```

### Activation Milestone Tracking

```
Step 1: Define activation milestones
const milestones = [
  { event: 'first_login', weight: 1 },
  { event: 'profile_complete', weight: 2 },
  { event: 'first_integration', weight: 3 },
  { event: 'invite_teammate', weight: 4 },
  { event: 'first_workflow', weight: 5 }
];

Step 2: Update activation progress
{
  resource_type: 'people',
  record_id: person.record_id,
  record_data: {
    // Custom: activation_score, milestones_completed
  }
}

Step 3: Document milestone achievement
{
  resource_type: 'people',
  record_id: person.record_id,
  title: 'Activation Milestone',
  content: `Milestone: ${milestone.event}\nTimestamp: ${event.timestamp}\nDays since signup: ${days_since_signup}`
}
```

### Sales Handoff Flow

```
Step 1: Identify sales-ready accounts
// High PQL + large company + active usage
const sales_ready = pql_score >= 80 &&
                    company.employees >= 50 &&
                    active_users >= 5;

Step 2: Create opportunity
{
  resource_type: 'deals',
  record_data: {
    name: `Enterprise Upgrade - ${company.name}`,
    value: calculate_arr(company.employees, plan),
    stage: 'Sales Qualified',
    associated_company: [company.record_id]
  }
}

Step 3: Assign to sales rep
{
  content: `Sales-ready account from PLG funnel`,
  title: 'PLG → Sales Handoff',
  linked_records: [{
    target_object: 'deals',
    target_record_id: deal.record_id
  }],
  assignees: [assigned_rep_id],
  dueDate: today()
}

Step 4: Document handoff context
{
  resource_type: 'deals',
  record_id: deal.record_id,
  title: 'PLG Handoff Context',
  content: `PQL Score: ${pql_score}
Active Users: ${active_users}
Key Features: ${features.join(', ')}
Trial Start: ${signup_date}
Activation: ${activation_score}%
Recommended Approach: ${sales_playbook}`
}
```

## PQL Scoring Model Example

| Signal                | Weight | Threshold      |
| --------------------- | ------ | -------------- |
| Logins (7d)           | 10     | 5+ logins      |
| Features activated    | 15     | 3+ features    |
| Team invites          | 20     | 2+ members     |
| Integration connected | 25     | 1+ integration |
| Data imported         | 20     | 100+ records   |
| Active days (14d)     | 10     | 7+ days        |

**PQL Threshold**: Score >= 60

## Key Points

- **Product events drive CRM updates** - Real-time sync from product
- **PQL scoring** - Quantify product engagement for prioritization
- **Activation tracking** - Monitor time-to-value milestones
- **Self-serve to sales** - Route high-value accounts to reps
- **Context preservation** - Capture product usage in handoff notes

## Cross-References

- [Golden Rules](../golden-rules.md) - Data sync patterns, attribute types
- [Tool Reference](../tool-reference.md) - `create-record`, `update-record`, `create-task`
- [Lead Qualification](lead-qualification.md) - Similar inbound processing patterns
- **attio-workspace-schema skill** - Your PLG-specific attributes
