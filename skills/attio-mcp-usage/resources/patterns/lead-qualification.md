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

```
Step 1: Search for existing record
{
  resource_type: 'companies',
  query: form.company_name
}

Step 2: Create record if not found
{
  resource_type: 'companies',
  record_data: {
    name: form.company_name,
    domains: [form.domain],               // Standard: unique, can have multiple per company
    description: 'Inbound lead from form' // Standard: text field
    // Custom attributes (verify via schema skill): source, lead_status, etc.
  }
}

Step 3: Update with qualification data
{
  resource_type: 'companies',
  record_id: company.record_id,
  record_data: {
    description: 'Qualified lead - meets criteria',
    categories: [form.category]           // Standard: array for multi-select
    // Custom attributes (verify via schema skill): employee_count, industry, lead_score
  }
}

Step 4: Add to pipeline list
{
  listId: 'prospecting-list-id',          // From schema skill
  record_id: company.record_id
}

Step 5: Create qualification task
{
  content: 'Schedule qualification call',
  linked_records: [{
    target_object: 'companies',
    target_record_id: company.record_id
  }],
  assignees: ['sales_rep_person_id'],     // Assign to rep
  dueDate: calculate_due_date()           // Next business day
}

Step 6: Document qualification
{
  resource_type: 'companies',
  record_id: company.record_id,
  title: 'Lead Qualification',
  content: `Source: ${form.source}\nScore: ${calculated_score}\nReason: ${qualification_reason}`
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
