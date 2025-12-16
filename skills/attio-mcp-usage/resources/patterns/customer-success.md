# Customer Success Pattern

## Keywords

`renewal`, `churn`, `health score`, `CSM`, `retention`, `NRR`, `expansion`, `QBR`, `onboarding`, `customer lifecycle`

## Overview

Customer Success workflows for retention and renewal management. Track customer health, monitor churn risk, manage CSM books of business, and orchestrate renewal and expansion motions.

## When to Use

- Managing customer health scores
- Tracking renewal pipelines
- Monitoring churn risk signals
- Running quarterly business reviews (QBRs)
- Managing CSM account assignments
- Driving expansion and upsell opportunities

## Workflow Steps

### Customer Health Scoring

Calculate health score based on: usage trend, support tickets, NPS score, engagement, payment status, days to renewal.

#### Step 1: Update company with health score

Call `update-record` with:

```json
{
  "resource_type": "companies",
  "record_id": "<customer_record_id>",
  "record_data": {
    "description": "Health: Healthy (85/100) - Active usage, positive NPS"
  }
}
```

> **Note**: Custom attributes (verify via schema): `health_score`, `health_status`, `last_health_update`.

#### Step 2: Route at-risk accounts to list

For accounts with health score < 40:

Call `add-record-to-list` with:

```json
{
  "listId": "<at-risk-customers-id>",
  "record_id": "<customer_record_id>",
  "resource_type": "companies"
}
```

#### Step 3: Create urgent task for CSM

Call `create-task` with:

```json
{
  "content": "Critical health score (35) - immediate intervention needed for Acme Corp",
  "title": "At-Risk Account Review",
  "linked_records": [
    {
      "target_object": "companies",
      "target_record_id": "<customer_record_id>"
    }
  ],
  "assignees": ["<csm_person_id>"],
  "dueDate": "2024-12-15T17:00:00Z"
}
```

### Renewal Pipeline Management

#### Step 1: Get renewals in window (90 days)

Call `get-list-entries` with:

```json
{
  "listId": "<upcoming-renewals-id>",
  "limit": 100
}
```

> **Note**: Filter returned entries by renewal_date within 90 days.

#### Step 2: Create renewal deal

Call `create-record` with:

```json
{
  "resource_type": "deals",
  "record_data": {
    "name": "Renewal - Acme Corp - 2025",
    "value": 48000,
    "stage": "Renewal Due",
    "associated_company": ["<customer_record_id>"]
  }
}
```

> **Note**: Custom attributes (verify via schema): `renewal_date`, `contract_term`, `expansion_potential`.

#### Step 3: Add to renewal pipeline

Call `add-record-to-list` with:

```json
{
  "listId": "<renewal-pipeline-id>",
  "record_id": "<deal_record_id>",
  "resource_type": "deals"
}
```

#### Step 4: Create renewal kickoff task

Call `create-task` with:

```json
{
  "content": "Schedule renewal discussion with Acme Corp",
  "title": "Renewal Kickoff",
  "linked_records": [
    {
      "target_object": "deals",
      "target_record_id": "<deal_record_id>"
    }
  ],
  "dueDate": "2024-10-15T10:00:00Z"
}
```

> **Note**: Due date should be ~60 days before renewal.

### Churn Risk Monitoring

When multiple churn signals detected (usage decline, key contact left, support escalation, payment issues, competitor mention):

#### Step 1: Document churn risk assessment

Call `create-note` with:

```json
{
  "resource_type": "companies",
  "record_id": "<customer_record_id>",
  "title": "Churn Risk Assessment",
  "content": "Risk Level: High\nSignals Detected:\n- Usage declined 30% MoM\n- Champion (Jane Smith) left company\n- Recent support escalation\n\nRecommended Actions:\n1. Executive outreach\n2. Product roadmap review\n3. Pricing discussion\n4. Success plan refresh"
}
```

#### Step 2: Create escalation task

For critical risk (3+ signals detected):

Call `create-task` with:

```json
{
  "content": "Multiple churn signals detected - executive escalation needed for Acme Corp",
  "title": "Churn Risk Escalation",
  "linked_records": [
    {
      "target_object": "companies",
      "target_record_id": "<customer_record_id>"
    }
  ],
  "assignees": ["<cs_manager_id>", "<account_exec_id>"],
  "dueDate": "2024-12-15T17:00:00Z"
}
```

### CSM Book Management

#### Step 1: Assign CSM to account

Call `update-record` with:

```json
{
  "resource_type": "companies",
  "record_id": "<customer_record_id>",
  "record_data": {
    "team": ["<csm_person_id>"]
  }
}
```

> **Note**: `team` is a standard attribute for team assignment. Custom attributes (verify via schema): `primary_csm`, `csm_assigned_date`.

#### Step 2: Get CSM's book of business

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "<csm_name>"
}
```

> **Note**: Filter by team contains CSM's person ID. Calculate book metrics: total ARR, account count, avg health, upcoming renewals.

## Health Score Tiers

| Score  | Status   | Action                  |
| ------ | -------- | ----------------------- |
| 80-100 | Healthy  | Expansion opportunities |
| 60-79  | Stable   | Regular engagement      |
| 40-59  | At-Risk  | Proactive outreach      |
| 0-39   | Critical | Immediate intervention  |

## Renewal Timeline

| Days to Renewal | Action                           |
| --------------- | -------------------------------- |
| 90              | Create renewal deal, assign CSM  |
| 60              | Kickoff call, value review       |
| 45              | Pricing/terms discussion         |
| 30              | Contract negotiation             |
| 14              | Final terms, executive alignment |
| 0               | Close and renew                  |

## Key Points

- **Health = leading indicator** - Monitor before churn happens
- **Renewal = deal object** - Track value and stages
- **CSM = team assignment** - Use standard team field
- **Notes = relationship history** - Document every interaction
- **Tasks = never miss renewals** - Automated reminders

## Cross-References

- [Golden Rules](../golden-rules.md) - Team assignments, date formatting
- [Tool Reference](../tool-reference.md) - `update-record`, `create-deal`, `create-task`
- [Deal Stage Automation](deal-stage-automation.md) - Renewal stage progression
- **attio-workspace-schema skill** - Your CS-specific attributes
