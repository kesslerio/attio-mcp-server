# Integration Patterns

Real-world workflow examples. Cross-reference your schema skill for workspace-specific details.

---

## Pattern 1: Deal Pipeline Workflow

**Scenario**: Manage deal from opportunity to close (PRIMARY workflow for sales-focused workspaces)

**Object Focus**: DEALS

```
Step 1: Create deal from opportunity
{
  resource_type: 'deals',
  data: {
    name: 'Q4 Enterprise Deal - Acme Inc',
    deal_value: 50000,                    // Your deal_value attribute
    stage: 'Discovery',                   // Your deal stages
    close_date: '2024-12-31',             // ISO 8601 date
    company: ['company_record_id']        // Array for reference field
  }
}
// Cross-ref: [deals-attributes.md] for YOUR attribute slugs

Step 2: Add to active deals list
{
  list_id: 'your-active-deals-list-id',  // From schema skill
  record_id: deal.record_id,
  resource_type: 'deals'
}
// Cross-ref: Get list_id from [schema skill]

Step 3: Create discovery task
{
  content: 'Schedule discovery call',
  title: 'Discovery Call',
  linked_records: [{
    target_object: 'deals',
    target_record_id: deal.record_id
  }],
  due_at: '2024-12-16T10:00:00Z'
}

Step 4: Document opportunity context
{
  parent_object: 'deals',
  parent_record_id: deal.record_id,
  title: 'Opportunity Context',
  content: 'Source: Inbound demo request. Key stakeholders: CTO, VP Eng. Budget confirmed: $50k.'
}

Step 5: Progress through stages
// As deal progresses, update stage
{
  resource_type: 'deals',
  record_id: deal.record_id,
  data: {
    stage: 'Proposal Sent',              // Next stage
    close_probability: 0.65              // Update probability
  }
}
// Cross-ref: Valid stages in [deals-attributes.md]

Step 6: Move between lists (if using list-based pipeline)
// Remove from "Discovery" list
{
  list_id: 'discovery-list-id',
  entry_id: discovery_entry.entry_id
}
// Add to "Proposal" list
{
  list_id: 'proposal-list-id',
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
lists_get_all
// Returns: ["Prospecting", "Qualified", "Customers", "Active Deals", "Q4 Pipeline"]

Step 2: Add record to multiple lists
// Records can be in multiple lists simultaneously
{
  list_id: 'prospecting-list-id',
  record_id: company.record_id
}
{
  list_id: 'q4-target-accounts-id',
  record_id: company.record_id
}
// Cross-ref: [schema skill] for list IDs

Step 3: Filter list entries
// Find high-value deals in active pipeline
{
  list_id: 'active-deals-id',
  attribute: 'deal_value',
  filter_type: 'greater_than',
  value: 25000
}

// Find companies in specific industry
{
  list_id: 'prospecting-id',
  attribute: 'industry',
  filter_type: 'equals',
  value: 'Technology'
}

Step 4: Update list entry attributes
// Update priority on list entry (not record)
{
  list_id: 'prospecting-id',
  entry_id: list_entry.entry_id,
  attributes: {
    priority: 'High',
    follow_up_date: '2024-12-20'
  }
}

Step 5: Batch operations on list
// Get all entries
{
  list_id: 'target-accounts-id',
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
  data: {
    name: form.company_name,
    domains: [form.domain],               // Array for multi-select
    source: 'Inbound Form',               // Your source attribute
    lead_status: 'Unqualified'            // Initial status
    // Cross-ref: [companies-attributes.md] for YOUR slugs
  }
}

Step 3: Update with qualification data
{
  resource_type: 'companies',
  record_id: company.record_id,
  data: {
    employee_count: form.employee_count,  // Number
    industry: [form.industry],            // Array for select
    lead_score: calculated_score,         // Your scoring logic
    lead_status: 'Qualified'              // Update status
    // Cross-ref: [companies-attributes.md] for YOUR attributes
  }
}

Step 4: Add to pipeline list
{
  list_id: 'prospecting-list-id',         // From schema skill
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
  due_at: calculate_due_date()            // Next business day
}

Step 6: Document qualification
{
  parent_object: 'companies',
  parent_record_id: company.record_id,
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
      data: changed_fields_only
    }
  } else {
    // Create new
    {
      resource_type: import_object_type,
      data: all_required_fields
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
  list_id: 'discovery-stage-list-id',     // Or filter by stage attribute
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
  const hasRequiredData = deal.company && deal.deal_value;

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
  data: {
    stage: 'Proposal Sent',              // Next stage
    close_probability: 0.60              // Update probability
  }
}
// Cross-ref: Valid stages in [deals-attributes.md]

Step 4: Move to new list (if list-based)
// Remove from Discovery list
{
  list_id: 'discovery-list-id',
  entry_id: deal.discovery_entry_id
}
// Add to Proposal list
{
  list_id: 'proposal-list-id',
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
  due_at: calculate_due(3)  // 3 days from now
}

Step 6: Notify team
{
  parent_object: 'deals',
  parent_record_id: deal.record_id,
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
  list_id: 'enrichment-queue-id',
}
// OR filter by enrichment_status attribute

Step 2: Fetch external data
external_data = await fetch_from_api(company.domain);
// Sources: Clearbit, ZoomInfo, etc.

Step 3: Map to Attio schema
mapped_data = {
  employee_count: external_data.employees,    // Number
  industry: [external_data.industry],         // Array for select
  annual_revenue: external_data.revenue,      // Number
  headquarters: external_data.location        // Text
};
// Cross-ref: [companies-attributes.md] for YOUR slugs

Step 4: Update record
{
  resource_type: 'companies',
  record_id: company.record_id,
  data: mapped_data
}

Step 5: Track enrichment
{
  parent_object: 'companies',
  parent_record_id: company.record_id,
  title: 'Data Enrichment',
  content: `Source: Clearbit\nDate: ${new Date().toISOString()}\nFields updated: ${Object.keys(mapped_data).join(', ')}`
}

Step 6: Mark as enriched
{
  resource_type: 'companies',
  record_id: company.record_id,
  data: {
    enrichment_status: 'Completed',
    enrichment_date: new Date().toISOString()
  }
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
  try {
    // Step 1: Validate inputs
    validateRecordId(params.record_id);
    validateAttributes(params.data, schema);

    // Step 2: Execute operation
    const result = await executeOperation(params);

    // Step 3: Verify result
    if (!result.record_id) {
      throw new Error('Operation failed: no record_id returned');
    }

    // Step 4: Log success
    console.log(`Success: ${operation} completed`);

    return result;
  } catch (error) {
    // Step 5: Handle errors gracefully
    if (error.message.includes('INVALID_UUID')) {
      // Handle validation errors
      return { error: 'Invalid UUID format', code: 'VALIDATION_ERROR' };
    } else if (error.message.includes('RATE_LIMIT')) {
      // Retry with backoff
      await delay(1000);
      return safeWorkflow(params); // Retry once
    } else if (error.message.includes('NOT_FOUND')) {
      // Handle not found
      return { error: 'Record not found', code: 'NOT_FOUND' };
    } else {
      // Log and escalate unknown errors
      console.error('Unexpected error:', error);
      throw error;
    }
  } finally {
    // Step 6: Document operation (optional)
    await createNote({
      parent_object: params.resource_type,
      parent_record_id: params.record_id,
      title: 'Operation Attempted',
      content: `Operation: ${operation}\nStatus: ${success ? 'Success' : 'Failed'}\nTimestamp: ${new Date().toISOString()}`,
    });
  }
}
```

---

## Cross-References

For workspace-specific implementation:

- **List IDs**: See generated schema skill
- **Attribute slugs**: See `[object]-attributes.md` files
- **Stage/status values**: Check attribute details in schema skill
- **Required fields**: Marked in schema skill specs
