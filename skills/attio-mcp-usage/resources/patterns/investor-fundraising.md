# Investor Fundraising Pattern

## Keywords

`investors`, `fundraising`, `LP`, `term sheet`, `VC`, `angel`, `round`, `commitment`, `warm intro`, `cap table`, `lead investor`

## Overview

Manage investor relationships and fundraising pipelines. Track LPs, VCs, and angels through fundraising stages from initial outreach to commitment and close. Includes warm intro tracking, commitment management, and round progress monitoring.

## When to Use

- Managing fundraising rounds (Seed, Series A, B, etc.)
- Tracking investor conversations and commitments
- Organizing warm introductions and referrals
- Monitoring round progress and allocations
- Building investor relationship history

## Workflow Steps

### Setting Up Fundraising Pipeline

#### Step 1: Create investor record (company = fund)

Call `create-record` with:

```json
{
  "resource_type": "companies",
  "record_data": {
    "name": "Acme Ventures",
    "domains": ["acmeventures.com"],
    "description": "Series A-B investor, $200M fund"
  }
}
```

> **Note**: Custom attributes (verify via schema): `fund_size`, `check_size_min`, `check_size_max`, `focus_sectors`.

#### Step 2: Create contact (person = partner/associate)

Call `create-record` with:

```json
{
  "resource_type": "people",
  "record_data": {
    "name": "Jane Smith",
    "email_addresses": ["jane@acmeventures.com"],
    "job_title": "Partner",
    "company": "<investor_company_id>"
  }
}
```

> **Note**: Custom attributes (verify via schema): `decision_maker`, `portfolio_overlap`.

#### Step 3: Add to fundraising list

Call `add-record-to-list` with:

```json
{
  "listId": "<series-a-pipeline-id>",
  "record_id": "<investor_company_id>",
  "resource_type": "companies"
}
```

### Tracking Investor Progress

#### Step 1: Get investors by stage

Call `get-list-entries` with:

```json
{
  "listId": "<series-a-pipeline-id>",
  "limit": 100
}
```

#### Step 2: Update after meeting

Call `update-record` with:

```json
{
  "resource_type": "companies",
  "record_id": "<investor_record_id>",
  "record_data": {
    "description": "High interest - IC presentation scheduled"
  }
}
```

> **Note**: Custom attributes (verify via schema): `investor_stage`, `interest_level`, `next_step`.

#### Step 3: Document meeting notes

Call `create-note` with:

```json
{
  "resource_type": "companies",
  "record_id": "<investor_record_id>",
  "title": "Partner Meeting Notes",
  "content": "Attendees: Jane Smith (Partner), John Doe (Associate)\nDiscussed: Product roadmap, GTM strategy, unit economics\nInterest: High - want to present to IC\nNext Steps: Send updated deck, schedule IC meeting\nTimeline: Decision by end of month"
}
```

#### Step 4: Create follow-up task

Call `create-task` with:

```json
{
  "content": "Send updated deck to Acme Ventures",
  "title": "Deck Follow-up",
  "linked_records": [
    {
      "target_object": "companies",
      "target_record_id": "<investor_record_id>"
    }
  ],
  "dueDate": "2024-12-18T09:00:00Z"
}
```

### Warm Introduction Flow

#### Step 1: Search for mutual connection

Call `records_search` with:

```json
{
  "resource_type": "people",
  "query": "Sarah Chen"
}
```

#### Step 2: Create intro request note

Call `create-note` with:

```json
{
  "resource_type": "companies",
  "record_id": "<target_investor_record_id>",
  "title": "Warm Intro Request",
  "content": "Connector: Sarah Chen (mutual connection)\nRelationship: Portfolio CEO at TechCorp\nAsk: Introduction to Jane Smith at Acme Ventures\nForwardable Blurb: [Include pitch here]\nStatus: Request sent to connector"
}
```

#### Step 3: Track intro status

Call `update-record` with:

```json
{
  "resource_type": "companies",
  "record_id": "<target_investor_record_id>",
  "record_data": {
    "description": "Warm intro requested via Sarah Chen"
  }
}
```

> **Note**: Custom attributes (verify via schema): `intro_source`, `intro_status`, `connector_person_id`.

### Commitment Tracking

#### Step 1: Record commitment

Call `create-record` with:

```json
{
  "resource_type": "deals",
  "record_data": {
    "name": "Acme Ventures - Series A Commitment",
    "value": 2000000,
    "stage": "Committed",
    "associated_company": ["<investor_company_id>"]
  }
}
```

> **Note**: Custom attributes (verify via schema): `commitment_date`, `term_sheet_signed`, `wire_received`.

#### Step 2: Add to commitments list

Call `add-record-to-list` with:

```json
{
  "listId": "<series-a-commitments-id>",
  "record_id": "<deal_record_id>",
  "resource_type": "deals"
}
```

> **Note**: Sum all deal values in this list to track round progress (e.g., Target: $10M, Committed: $6M, Remaining: $4M).

#### Step 3: Move investor to committed list

Call `add-record-to-list` with:

```json
{
  "listId": "<committed-investors-id>",
  "record_id": "<investor_company_id>",
  "resource_type": "companies"
}
```

## Fundraising Stage Progression

| Stage           | Criteria                          | Next Action                     |
| --------------- | --------------------------------- | ------------------------------- |
| Target          | Identified, no contact            | Get warm intro or cold outreach |
| Intro Sent      | Warm intro sent                   | Wait for response               |
| First Meeting   | Intro call completed              | Send deck, schedule deep dive   |
| Partner Meeting | Met with decision maker           | Present to IC                   |
| IC Presentation | Presented to investment committee | Await decision                  |
| Term Sheet      | Received term sheet               | Negotiate terms                 |
| Committed       | Signed commitment                 | Wire instructions               |
| Closed          | Funds received                    | Add to cap table                |

## Key Points

- **Investor = Company** (fund), **Contact = Person** (partner)
- **Deals for commitments** - Track amounts and stages
- **Lists for pipeline stages** - Multiple investors per stage
- **Notes for relationship history** - Meeting notes, intros, updates
- **Tasks for follow-ups** - Never miss a next step

## Cross-References

- [Golden Rules](../golden-rules.md) - Record relationships, stage formatting
- [Tool Reference](../tool-reference.md) - `create-record`, `add-record-to-list`
- [Sales Pipeline](sales-pipeline.md) - Similar deal progression patterns
- **attio-workspace-schema skill** - Your fundraising-specific attributes
