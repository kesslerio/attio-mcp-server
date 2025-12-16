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

#### Step 1: Create (or update) person from signup

Call `create-record` with:

```json
{
  "resource_type": "people",
  "record_data": {
    "name": "Jane Doe",
    "email_addresses": ["jane@example.com"],
    "job_title": "Product Lead"
  }
}
```

> **Note**: Custom attributes (verify via schema skill): `signup_date`, `signup_source`, `plan_type`.

#### Step 2: Search for existing company by domain

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "example.com",
  "limit": 10
}
```

#### Step 3: Create company if not found

Call `create-record` with:

```json
{
  "resource_type": "companies",
  "record_data": {
    "name": "Example, Inc.",
    "domains": ["example.com"],
    "description": "Created from product signup"
  }
}
```

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

#### Step 5: Add person to trials list

Call `add-record-to-list` with:

```json
{
  "listId": "<active-trials-id>",
  "record_id": "<person_record_id>",
  "resource_type": "people"
}
```

### PQL Scoring and Detection

#### Step 1: Update PQL attributes on the person record

Call `update-record` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "record_data": {
    "description": "PQL score updated from product telemetry"
  }
}
```

> **Note**: Use your schema skill for workspace-specific PQL fields like `pql_score`, `last_activity_date`, `features_activated`.

#### Step 2: Create a deal when the person qualifies

Call `create-record` with:

```json
{
  "resource_type": "deals",
  "record_data": {
    "name": "PQL - Example, Inc.",
    "stage": "Product Qualified",
    "associated_company": ["<company_record_id>"],
    "associated_people": ["<person_record_id>"]
  }
}
```

> **Note**: `stage` option titles vary by workspace. Use the exact option title from your schema skill.

#### Step 3: Add the person to the PQL list

Call `add-record-to-list` with:

```json
{
  "listId": "<pql-queue-id>",
  "record_id": "<person_record_id>",
  "resource_type": "people"
}
```

#### Step 4: Create a sales follow-up task

Call `create-task` with:

```json
{
  "content": "High PQL score - reach out to Jane Doe",
  "title": "PQL Follow-up",
  "linked_records": [
    {
      "target_object": "people",
      "target_record_id": "<person_record_id>"
    }
  ],
  "assignees": ["<sales_rep_person_id>"],
  "dueDate": "2024-12-16T10:00:00Z"
}
```

### Activation Milestone Tracking

#### Step 1: Update activation progress

Call `update-record` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "record_data": {
    "description": "Activation progress updated"
  }
}
```

> **Note**: Use your schema skill for custom activation fields like `activation_score` or `milestones_completed`.

#### Step 2: Document milestone achievement

Call `create-note` with:

```json
{
  "resource_type": "people",
  "record_id": "<person_record_id>",
  "title": "Activation Milestone",
  "content": "Milestone: first_integration\nTimestamp: 2024-12-15T12:00:00Z\nDays since signup: 3"
}
```

### Sales Handoff Flow

#### Step 1: Create an opportunity (deal) for sales handoff

Call `create-record` with:

```json
{
  "resource_type": "deals",
  "record_data": {
    "name": "Enterprise Upgrade - Example, Inc.",
    "value": 75000,
    "stage": "Sales Qualified",
    "associated_company": ["<company_record_id>"],
    "associated_people": ["<person_record_id>"]
  }
}
```

#### Step 2: Assign a follow-up task to a rep

Call `create-task` with:

```json
{
  "content": "PLG → Sales handoff: schedule discovery and confirm upgrade path",
  "title": "PLG → Sales Handoff",
  "linked_records": [
    {
      "target_object": "deals",
      "target_record_id": "<deal_record_id>"
    }
  ],
  "assignees": ["<assigned_rep_person_id>"],
  "dueDate": "2024-12-16T10:00:00Z"
}
```

#### Step 3: Document handoff context

Call `create-note` with:

```json
{
  "resource_type": "deals",
  "record_id": "<deal_record_id>",
  "title": "PLG Handoff Context",
  "content": "PQL Score: 85\nActive Users: 7\nKey Features: Integrations, Imports\nTrial Start: 2024-12-01\nActivation: 92%\nRecommended Approach: Offer annual plan upgrade"
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
