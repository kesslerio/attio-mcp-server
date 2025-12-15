# Universal Workflow Patterns

Core patterns for common operations. Cross-reference your schema skill for workspace-specific attribute slugs and list IDs.

---

## Find or Create Pattern

**Use Case**: Ensure record exists before updating (works for ANY object type: companies, deals, people, custom objects)

```
Step 1: records_search
  → Query: identifier (name, domain, email, deal title, etc.)
  → Example: { resource_type: 'companies', query: 'Acme Inc' }
  → Example: { resource_type: 'deals', query: 'Q4 Enterprise Deal' }

Step 2: Evaluate results
  → If found: Use record_id from results
  → If not found: Proceed to Step 3

Step 3: create-record (if needed)
  → Provide required attributes
  → Cross-ref: Check [schema skill] for required fields
  → Example (company): { name: 'Acme Inc', domains: ['acme.com'] }
  → Example (deal): { name: 'Q4 Deal', value: 50000 }

Step 4: Verify
  → Confirm record_id returned
```

**Error Prevention**:

- Always search before creating (avoid duplicates)
- Handle "not found" gracefully
- Validate record_id before subsequent operations

---

## Batch Update Pattern

**Use Case**: Update multiple records efficiently (works for companies, deals, people, ANY object type)

```
Step 1: Collect record IDs
  → From search results or list entries
  → Validate all are UUIDs

Step 2: Prepare update payloads
  → Validate attribute slugs (schema skill)
  → Ensure correct data types
  → Wrap multi-select values in arrays

Step 3: Update sequentially or in batches
  → Handle rate limits (100ms delay between requests)
  → Log successes and failures
  → Track progress for large batches

Step 4: Verify persistence
  → Re-fetch updated records
  → Confirm changes applied
```

**Error Prevention**:

- Validate ALL record IDs before starting
- Use consistent attribute slugs
- Don't update read-only fields
- Implement retry logic for failures

---

## Pipeline Movement Pattern

**Use Case**: Move records through stages (deals pipeline, onboarding, ANY status-based workflow)

**Primary Example: Deals Pipeline**

```
Step 1: add-record-to-list
  → Cross-ref: Get list_id from [schema skill]
  → Example: Add deal to "Active Opportunities" list

Step 2: Update stage/status
  → Use status field (auto-converts titles)
  → Cross-ref: Valid statuses in [schema skill]
  → Example (deals): { stage: 'Proposal Sent' }
  → Example (companies): { lead_status: 'Qualified' }

Step 3: Add context
  → Create note with reasoning
  → Link to record_id
  → Document why stage changed

Step 4: Assign follow-up
  → Create task with due date
  → Link to record_id
  → Assign to team member
```

**Applicable To**:

- Deals: "Discovery" → "Proposal" → "Negotiation" → "Closed Won"
- Companies: "Lead" → "Qualified" → "Customer"
- People: "Prospect" → "Active" → "Customer"
- Custom workflows: ANY status-based progression

---

## Data Enrichment Pattern

**Use Case**: Augment records with external data (companies, deals, people, custom objects)

**Examples by Object Type**:

**Companies (firmographic data)**:

```
Step 1: Fetch external data
  → Company info from Clearbit, ZoomInfo, etc.

Step 2: Map to Attio attributes
  → Cross-ref: [companies-attributes.md] for attribute slugs
  → Match data types exactly
  → employee_count: 250 (number)
  → industry: ["Technology"] (array for select)

Step 3: Update record
  → Use update-record tool
  → Include only changed fields

Step 4: Track source
  → Add note documenting data source
  → Include timestamp and provider
```

**Deals (financial data)**:

```
Step 1: Fetch external data
  → Deal intelligence, competitive data

Step 2: Map to Attio attributes
  → Cross-ref: [deals-attributes.md] for attribute slugs
  → value: 50000 (number)
  → Custom attributes (verify via schema skill)

Step 3: Update record
  → Only changed fields

Step 4: Track source
  → Document enrichment provider
```

**People (social profiles)**:

```
Step 1: Fetch external data
  → LinkedIn, Twitter, email validation

Step 2: Map to Attio attributes
  → Cross-ref: [people-attributes.md] for attribute slugs
  → job_title: "VP Sales" (text)
  → linkedin_url: "https://..." (text)

Step 3: Update record
  → Only changed fields

Step 4: Track source
  → Document social profile sources
```

---

## List-Based Workflow Pattern

**Use Case**: Organize records via lists (alternative to status-based pipelines)

```
Step 1: Get available lists
  → Use get-lists to see all lists
  → Cross-ref: [schema skill] for list IDs

Step 2: Add record to target list(s)
  → add-record-to-list
  → Can be in multiple lists simultaneously
  → Example: Deal in both "Q4 Pipeline" and "Enterprise Deals"

Step 3: Filter list entries
  → Use filter-list-entries for attribute-based filtering
  → Example: Filter by value > 10000
  → Example: Filter by created_date in last 7 days

Step 4: Update list entry attributes
  → Use update-list-entry (not update-record)
  → List-specific fields vs record fields
  → Example: Update priority on list entry

Step 5: Move between lists (if needed)
  → Remove from current list
  → Add to new list
```

**List-Heavy Users**:

- Organize by lists, not status fields
- Multiple list memberships for categorization
- List entry filtering for segmentation
- Batch operations on list entries

---

## Cross-References

For workspace-specific details, see your `attio-workspace-schema` skill:

- Attribute slugs: `[object]-attributes.md`
- Select/status options: Check attribute details
- List IDs: See generated schema
- Required fields: Marked in attribute specs
