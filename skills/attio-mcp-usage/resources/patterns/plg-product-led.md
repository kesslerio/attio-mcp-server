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

#### Step 1: Create or update person from signup

Call `create-record` with:

```json
{
  "resource_type": "people",
  "record_data": {
    "name": "John Doe",
    "email_addresses": ["john@acme.com"],
    "job_title": "Engineering Manager"
  }
}
```

> **Note**: Custom attributes (verify via schema): `signup_date`, `signup_source`, `plan_type`.

#### Step 2: Search for existing company

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "acme.com"
}
```

#### Step 3: Create company if not found

Call `create-record` with:

```json
{
  "resource_type": "companies",
  "record_data": {
    "name": "Acme Corp",
    "domains": ["acme.com"]
  }
}
```

> **Note**: Custom attributes (verify via schema): `company_size`, `industry`.

#### Step 4: Link person to company

Call `update-record` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "record_data": {
    "company": "<company_record_id>"
  }
}
```

#### Step 5: Add to trial list

Call `add-record-to-list` with:

```json
{
  "listId": "<active-trials-id>",
  "record_id": "<person_record_id>",
  "resource_type": "people"
}
```

### PQL Scoring and Detection

When product usage indicates high engagement (e.g., 5+ logins, 3+ features used, team invites sent), create a PQL deal.

#### Step 1: Update person with PQL data

Call `update-record` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "record_data": {
    "description": "High product engagement - PQL candidate"
  }
}
```

> **Note**: Custom attributes (verify via schema): `pql_score`, `last_activity_date`, `features_activated`.

#### Step 2: Create deal for sales follow-up

When PQL threshold is met (e.g., score >= 60):

Call `create-record` with:

```json
{
  "resource_type": "deals",
  "record_data": {
    "name": "PQL - Acme Corp",
    "stage": "Product Qualified",
    "associated_company": ["<company_record_id>"],
    "associated_people": ["<person_record_id>"]
  }
}
```

> **Note**: Custom attributes (verify via schema): `pql_score`, `activation_events`.

#### Step 3: Move to PQL list

Call `add-record-to-list` with:

```json
{
  "listId": "<pql-queue-id>",
  "record_id": "<person_record_id>",
  "resource_type": "people"
}
```

#### Step 4: Create task for sales

Call `create-task` with:

```json
{
  "content": "High PQL score (75) - reach out to John Doe at Acme Corp",
  "title": "PQL Follow-up",
  "linked_records": [
    {
      "target_object": "people",
      "target_record_id": "<person_record_id>"
    }
  ],
  "assignees": ["<sales_rep_id>"],
  "dueDate": "2024-12-16T09:00:00Z"
}
```

### Activation Milestone Tracking

Track key activation events: first_login, profile_complete, first_integration, invite_teammate, first_workflow.

#### Step 1: Document milestone achievement

Call `create-note` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "title": "Activation Milestone",
  "content": "Milestone: invite_teammate\nTimestamp: 2024-12-15T14:30:00Z\nDays since signup: 3"
}
```

### Sales Handoff Flow

When account is sales-ready (high PQL + large company + active usage):

#### Step 1: Create opportunity

Call `create-record` with:

```json
{
  "resource_type": "deals",
  "record_data": {
    "name": "Enterprise Upgrade - Acme Corp",
    "value": 24000,
    "stage": "Sales Qualified",
    "associated_company": ["<company_record_id>"]
  }
}
```

#### Step 2: Create handoff task

Call `create-task` with:

```json
{
  "content": "Sales-ready account from PLG funnel",
  "title": "PLG → Sales Handoff",
  "linked_records": [
    {
      "target_object": "deals",
      "target_record_id": "<deal_record_id>"
    }
  ],
  "assignees": ["<assigned_rep_id>"],
  "dueDate": "2024-12-15T17:00:00Z"
}
```

#### Step 3: Document handoff context

Call `create-note` with:

```json
{
  "resource_type": "deals",
  "record_id": "<deal_record_id>",
  "title": "PLG Handoff Context",
  "content": "PQL Score: 82\nActive Users: 5\nKey Features: Integrations, Team Workspaces, API\nTrial Start: 2024-12-01\nActivation: 90%\nRecommended Approach: Enterprise expansion play"
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
