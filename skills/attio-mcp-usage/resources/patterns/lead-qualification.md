# Lead Qualification Pattern

## Keywords

`lead`, `qualification`, `inbound`, `form`, `MQL`, `SQL`, `prospect`, `qualify`, `scoring`

## Overview

Qualify inbound leads from form submissions or external sources. This pattern handles the search-or-create flow, enrichment, list assignment, and follow-up task creation for new prospects.

## When to Use

- Processing inbound form submissions
- Qualifying new leads from marketing campaigns
- Creating prospect records from external sources
- Assigning leads to sales reps
- Documenting qualification criteria

## Workflow Steps

### Step 1: Search for existing record

Call `records_search` with:

```json
{
  "resource_type": "companies",
  "query": "<company_name_from_form>"
}
```

> **Note**: Always search before creating to prevent duplicates.

### Step 2: Create record if not found

Call `create-record` with:

```json
{
  "resource_type": "companies",
  "record_data": {
    "name": "Acme Corp",
    "domains": ["acme.com"],
    "description": "Inbound lead from contact form"
  }
}
```

> **Note**: `domains` is standard (unique, can have multiple per company). Custom attributes like `source`, `lead_status` should be verified via schema skill.

### Step 3: Update with qualification data

Call `update-record` with:

```json
{
  "resource_type": "companies",
  "record_id": "<company_record_id>",
  "record_data": {
    "description": "Qualified lead - meets criteria",
    "categories": ["Enterprise"]
  }
}
```

> **Note**: `categories` is standard (array for multi-select). Custom attributes like `employee_count`, `industry`, `lead_score` should be verified via schema skill.

### Step 4: Add to pipeline list

Call `add-record-to-list` with:

```json
{
  "listId": "<prospecting-list-id>",
  "record_id": "<company_record_id>",
  "resource_type": "companies"
}
```

> **Note**: Get `listId` from your schema skill.

### Step 5: Create qualification task

Call `create-task` with:

```json
{
  "content": "Schedule qualification call with Acme Corp",
  "title": "Qualification Call",
  "linked_records": [
    {
      "target_object": "companies",
      "target_record_id": "<company_record_id>"
    }
  ],
  "assignees": ["<sales_rep_person_id>"],
  "dueDate": "2024-12-16T10:00:00Z"
}
```

### Step 6: Document qualification

Call `create-note` with:

```json
{
  "resource_type": "companies",
  "record_id": "<company_record_id>",
  "title": "Lead Qualification",
  "content": "Source: Contact form\nScore: 85\nReason: Enterprise company, high intent"
}
```

## Key Points

- **Search before create** to avoid duplicates
- **Standard attributes** work across all workspaces
- **Custom attributes** need verification via schema skill
- **List assignment** for pipeline visibility
- **Task + Note** for follow-up and documentation

## Cross-References

- [Golden Rules](../golden-rules.md) - Duplicate prevention, attribute validation
- [Tool Reference](../tool-reference.md) - `records_search`, `create-record`, `update-record`, `add-record-to-list`
- **attio-workspace-schema skill** - `companies-attributes.md` for available fields
