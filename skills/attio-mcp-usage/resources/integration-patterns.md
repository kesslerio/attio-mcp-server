# Integration Patterns

Real-world workflow examples. Cross-reference your schema skill for workspace-specific details.

> **Important**: Examples use standard Attio attributes where possible. Custom attributes like `employee_count`, `industry`, `lead_score` are **workspace-specific** - verify via your `attio-workspace-schema` skill or `records_discover_attributes` before use.

**Standard Attributes Reference**:
| Object | Standard Attributes |
|--------|---------------------|
| Companies | `name`, `domains`, `description`, `categories`, `team` |
| Deals | `name`, `value`, `stage`, `owner`, `associated_people`, `associated_company` |
| People | `name`, `email_addresses`, `job_title`, `description`, `company` |

---

## Pattern 1: Deal Pipeline Workflow

**Scenario**: Manage deal from opportunity to close (PRIMARY workflow for sales-focused workspaces)

**Object Focus**: DEALS

```
Step 1: Create deal from opportunity
{
  resource_type: 'deals',
  record_data: {
    name: 'Q4 Enterprise Deal - Acme Inc',
    value: 50000,                         // Standard: currency field
    stage: 'In Progress',                 // Standard: use exact option title
    associated_company: ['company_record_id']  // Standard: array for reference
  }
}
// Cross-ref: Check attio-workspace-schema for custom attributes

Step 2: Add to active deals list
{
  listId: 'your-active-deals-list-id',   // From schema skill
  record_id: deal.record_id,
  resource_type: 'deals'
}
// Cross-ref: Get listId from [schema skill]

Step 3: Create discovery task
{
  content: 'Schedule discovery call',
  title: 'Discovery Call',
  linked_records: [{
    target_object: 'deals',
    target_record_id: deal.record_id
  }],
  dueDate: '2024-12-16T10:00:00Z'
}

Step 4: Document opportunity context
{
  resource_type: 'deals',
  record_id: deal.record_id,
  title: 'Opportunity Context',
  content: 'Source: Inbound demo request. Key stakeholders: CTO, VP Eng. Budget confirmed: $50k.'
}

Step 5: Progress through stages
// As deal progresses, update stage
{
  resource_type: 'deals',
  record_id: deal.record_id,
  record_data: {
    stage: 'Won 🎉',                     // Standard: use exact option title
    value: 55000                         // Standard: updated deal value
  }
}
// Cross-ref: Check attio-workspace-schema for custom attributes

Step 6: Move between lists (if using list-based pipeline)
// Remove from "Discovery" list
{
  listId: 'discovery-list-id',
  entryId: discovery_entry.entry_id
}
// Add to "Proposal" list
{
  listId: 'proposal-list-id',
  record_id: deal.record_id
}
```

**Key Points**:

- Deal-centric workflow (not company-centric)
- Status field updates OR list movement (depending on setup)
- Task creation for follow-ups
- Notes for context and audit trail

---

## Pattern 2: List-Based Organization

**Scenario**: Organize records via lists (alternative to status-based pipelines)

**Object Focus**: Works for ANY object type (companies, deals, people, custom)

```
Step 1: Discover available lists
// Get all lists to see organization structure
get-lists
// Returns: ["Prospecting", "Qualified", "Customers", "Active Deals", "Q4 Pipeline"]

Step 2: Add record to multiple lists
// Records can be in multiple lists simultaneously
{
  listId: 'prospecting-list-id',
  record_id: company.record_id
}
{
  listId: 'q4-target-accounts-id',
  record_id: company.record_id
}
// Cross-ref: [schema skill] for list IDs

Step 3: Filter list entries
// Find high-value deals in active pipeline
{
  listId: 'active-deals-id',
  attributeSlug: 'value',                  // Check schema for exact slug
  condition: 'greater_than',
  value: 25000
}

// Find companies in specific industry
{
  listId: 'prospecting-id',
  attributeSlug: 'industry',
  condition: 'equals',
  value: 'Technology'
}

Step 4: Update list entry attributes
// Update priority on list entry (not record)
{
  listId: 'prospecting-id',
  entryId: list_entry.entry_id,
  attributes: {
    priority: 'High',
    follow_up_date: '2024-12-20'
  }
}

Step 5: Batch operations on list
// Get all entries
{
  listId: 'target-accounts-id',
  limit: 100
}
// Process each entry
for (const entry of entries) {
  // Update record or list entry
  // Add notes, create tasks, etc.
}
```

**Key Points**:

- List-heavy users organize by lists, not status fields
- Multiple list memberships for categorization
- List entry attributes ≠ record attributes
- Filtering for segmentation

---

## Pattern 3: Lead Qualification Workflow

**Scenario**: Qualify inbound lead from form submission

**Object Focus**: Companies/People (but pattern works for ANY object)

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

**Cross-References**:

- List IDs → [schema skill]
- Attribute slugs → [companies-attributes.md]
- Status values → Attribute details in schema skill

---

## Pattern 4: Bulk Data Import

**Scenario**: Import records from external source

**Object Focus**: Object-agnostic (companies, deals, people, custom objects)

```
for each row in import_data:

  Step 1: Validate data
  - Check required fields present
  - Validate data types match schema
  - Confirm attribute slugs exist
  // Cross-ref: [schema skill] for validation

  Step 2: Check for existing record
  {
    resource_type: import_object_type,
    query: row.unique_identifier
  }

  Step 3: Create or update
  if (exists) {
    // Update existing
    {
      resource_type: import_object_type,
      record_id: existing.record_id,
      record_data: changed_fields_only
    }
  } else {
    // Create new
    {
      resource_type: import_object_type,
      record_data: all_required_fields
    }
  }

  Step 4: Handle errors gracefully
  try {
    // Operation
  } catch (error) {
    log_failure(row, error);
    continue;  // Don't stop entire import
  }

  Step 5: Rate limit
  await delay(100);  // 100ms between requests

  Step 6: Track progress
  completed++;
  log_progress(completed, total);
```

**Best Practices**:

- Validate ALL data before starting
- Use find-or-create pattern (avoid duplicates)
- Handle errors without stopping entire import
- Rate limit: 100ms delay between requests
- Log results for troubleshooting

---

## Pattern 5: Deal Stage Automation

**Scenario**: Auto-advance deals based on activity

**Object Focus**: DEALS (primary example)

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

---

## Pattern 6: Data Enrichment Pipeline

**Scenario**: Augment records with external data

**Object Variations**: Companies (firmographic), Deals (financial), People (social)

### Companies (Firmographic Data)

```
Step 1: Get records needing enrichment
{
  listId: 'enrichment-queue-id',
}
// OR filter by enrichment_status attribute

Step 2: Fetch external data
external_data = await fetch_from_api(company.domain);
// Sources: Clearbit, ZoomInfo, etc.

Step 3: Map to Attio schema
// Standard attributes:
standard_data = {
  description: external_data.summary,         // Standard: text field
  categories: [external_data.category]        // Standard: multiselect
};
// Custom attributes (verify via schema skill):
// employee_count, industry, annual_revenue, headquarters, etc.
custom_data = { /* your workspace-specific attributes */ };

Step 4: Update record
{
  resource_type: 'companies',
  record_id: company.record_id,
  record_data: { ...standard_data, ...custom_data }
}

Step 5: Track enrichment (via note)
{
  resource_type: 'companies',
  record_id: company.record_id,
  title: 'Data Enrichment',
  content: `Source: Clearbit\nDate: ${new Date().toISOString()}\nFields updated: description, categories`
}
```

### Deals (Financial Data)

```
Step 1: Fetch deal intelligence
external_data = await fetch_deal_intel(deal.company_domain);

Step 2: Map to Attio
mapped_data = {
  competitive_threat: external_data.competitors,  // Text
  market_segment: [external_data.segment],        // Array
  estimated_close_value: external_data.value      // Number
};

Step 3: Update + document
// Same pattern as companies
```

### People (Social Profiles)

```
Step 1: Fetch social data
linkedin_data = await fetch_linkedin(person.email);

Step 2: Map to Attio
mapped_data = {
  job_title: linkedin_data.title,           // Text
  linkedin_url: linkedin_data.profile_url,  // Text
  seniority_level: [linkedin_data.level]    // Array for select
};

Step 3: Update + document
// Same pattern as companies
```

---

## Pattern 7: Error Handling Template

**Universal error handling for all workflows**

```typescript
async function safeWorkflow(params) {
  const operation = 'update-record'; // or passed as param
  let success = false;

  try {
    // Step 1: Validate inputs
    validateRecordId(params.record_id);
    validateAttributes(params.record_data, schema);

    // Step 2: Execute operation
    const result = await executeOperation(params);

    // Step 3: Verify result
    if (!result.record_id) {
      throw new Error('Operation failed: no record_id returned');
    }

    // Step 4: Log success (use structured logger)
    logger.info('Operation completed', {
      operation,
      record_id: result.record_id,
    });
    success = true;

    return result;
  } catch (error) {
    // Step 5: Handle errors gracefully
    if (error.message.includes('INVALID_UUID')) {
      logger.warn('Validation error', { operation, error: 'Invalid UUID' });
      return { error: 'Invalid UUID format', code: 'VALIDATION_ERROR' };
    } else if (error.message.includes('RATE_LIMIT')) {
      logger.warn('Rate limited, retrying', { operation });
      await delay(1000);
      return safeWorkflow(params); // Retry once
    } else if (error.message.includes('NOT_FOUND')) {
      logger.warn('Record not found', {
        operation,
        record_id: params.record_id,
      });
      return { error: 'Record not found', code: 'NOT_FOUND' };
    } else {
      // Log and escalate unknown errors
      logger.error('Unexpected error', { operation, error: error.message });
      throw error;
    }
  } finally {
    // Step 6: Document operation (optional)
    await createNote({
      resource_type: params.resource_type,
      record_id: params.record_id,
      title: 'Operation Attempted',
      content: `Operation: ${operation}\nStatus: ${success ? 'Success' : 'Failed'}\nTimestamp: ${new Date().toISOString()}`,
    });
  }
}
```

**Note**: Use structured logging (`logger.info/warn/error`) with context objects containing `toolName`, `userId`, `requestId` per CLAUDE.md guidelines. Never use `console.log` in production code.

---

## Cross-References

For workspace-specific implementation:

- **List IDs**: See generated schema skill
- **Attribute slugs**: See `[object]-attributes.md` files
- **Stage/status values**: Check attribute details in schema skill
- **Required fields**: Marked in schema skill specs
