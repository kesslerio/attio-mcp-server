# MCP Tool Reference

Complete reference for Attio MCP server tools with universal examples.

> Cross-reference your schema skill for workspace-specific attribute slugs, list IDs, and option values

---

## Search Operations

### records_search

Search for records by query string (universal search tool).

**Signature**:

```typescript
{
  resource_type: 'companies' | 'people' | 'deals' | string,
  query: string,
  limit?: number  // Default: 10
}
```

**Examples**:

```typescript
// Search companies
{
  resource_type: 'companies',
  query: 'ShapeScale',
  limit: 20
}

// Search deals
{
  resource_type: 'deals',
  query: 'Q4 Enterprise',
  limit: 10
}

// Search people
{
  resource_type: 'people',
  query: 'john@example.com'
}
```

**Returns**: Array of matching records with `record_id`

---

## Record Operations

### create-record

Create a new record.

**Signature**:

```typescript
{
  resource_type: string,
  data: {
    [attribute_slug]: value  // See schema skill
  }
}
```

**Examples**:

```typescript
// Create company
{
  resource_type: 'companies',
  data: {
    name: 'Acme Inc',
    domains: ['acme.com'],           // Array for multi-select
    industry: ['Technology'],         // Array for select
    employee_count: 250               // Number
  }
}

// Create deal
{
  resource_type: 'deals',
  data: {
    name: 'Q4 Enterprise Deal',
    deal_value: 50000,                // Number
    close_date: '2024-12-31',         // ISO 8601 date
    stage: 'Discovery'                // Status (auto-converts)
  }
}

// Create person
{
  resource_type: 'people',
  data: {
    email_addresses: ['john@example.com'],
    name: 'John Doe',
    job_title: 'VP Sales'
  }
}
```

**Returns**: Created record with `record_id`

**Important**:

- Check schema skill for required fields
- Match data types exactly
- Wrap multi-select in arrays

---

### update-record

Update existing record.

**Signature**:

```typescript
{
  resource_type: string,
  record_id: string,  // Valid UUID
  data: {
    [attribute_slug]: value  // Only changed fields
  }
}
```

**Examples**:

```typescript
// Update company
{
  resource_type: 'companies',
  record_id: '550e8400-e29b-41d4-a716-446655440000',
  data: {
    employee_count: 300,              // Number
    lead_status: 'Qualified'          // Status (auto-converts)
  }
}

// Update deal
{
  resource_type: 'deals',
  record_id: '123e4567-e89b-12d3-a456-426614174000',
  data: {
    deal_value: 75000,                // Updated value
    stage: 'Proposal Sent',           // New stage
    close_probability: 0.75           // Number (decimal)
  }
}

// Update person
{
  resource_type: 'people',
  record_id: '987fcdeb-51a2-43d7-9876-543210fedcba',
  data: {
    job_title: 'SVP Sales',           // Updated title
    linkedin_url: 'https://...'       // New URL
  }
}
```

**Important**:

- Never include read-only fields
- Validate record_id format first (UUID)
- Match data types from schema skill
- Only include changed fields (not entire record)

---

### records_get_details

Retrieve detailed record information.

**Signature**:

```typescript
{
  resource_type: string,
  record_id: string
}
```

**Examples**:

```typescript
// Get company
{
  resource_type: 'companies',
  record_id: '550e8400-e29b-41d4-a716-446655440000'
}

// Get deal
{
  resource_type: 'deals',
  record_id: '123e4567-e89b-12d3-a456-426614174000'
}
```

**Returns**: Full record with all attributes

---

### delete-record

Delete a record.

**Signature**:

```typescript
{
  resource_type: string,
  record_id: string
}
```

**Warning**: Deletion is permanent. Use with caution.

---

## List Operations

### get-lists

Retrieve all lists in workspace.

**Signature**: None

**Returns**: Array of lists with IDs and names

**Use Case**: Discover available lists in workspace

**Example Response**:

```json
[
  { "id": "uuid-1", "name": "Prospecting" },
  { "id": "uuid-2", "name": "Active Deals" },
  { "id": "uuid-3", "name": "Customers" }
]
```

---

### get-list-details

Get detailed information for a specific list.

**Signature**:

```typescript
{
  list_id: string; // UUID or slug
}
```

**Returns**: List configuration, attributes, entry count

---

### get-list-entries

Retrieve entries from a list.

**Signature**:

```typescript
{
  list_id: string,
  limit?: number,    // Default: 20
  offset?: number    // Default: 0 (for pagination)
}
```

**Examples**:

```typescript
// Get first 20 entries
{
  list_id: '88709359-01f6-478b-ba66-c07347891b6f',
  limit: 20
}

// Pagination (get next 20)
{
  list_id: '88709359-01f6-478b-ba66-c07347891b6f',
  limit: 20,
  offset: 20
}
```

**Returns**: Array of list entries with embedded record data

---

### add-record-to-list

Add record to a list.

**Signature**:

```typescript
{
  list_id: string,      // Get from schema skill or get-lists
  record_id: string,    // UUID of record to add
  resource_type?: string  // Optional: 'companies', 'deals', etc.
}
```

**Examples**:

```typescript
// Add company to prospecting list
{
  list_id: '88709359-01f6-478b-ba66-c07347891b6f',
  record_id: '550e8400-e29b-41d4-a716-446655440000',
  resource_type: 'companies'
}

// Add deal to active pipeline
{
  list_id: 'deal-pipeline-uuid',
  record_id: '123e4567-e89b-12d3-a456-426614174000',
  resource_type: 'deals'
}
```

**Returns**: List entry with `entry_id`

**Important**: Cross-ref schema skill for list IDs

---

### remove-record-from-list

Remove record from list.

**Signature**:

```typescript
{
  list_id: string,
  entry_id: string  // UUID of list ENTRY (not record_id!)
}
```

**Important**: Use `entry_id` from list entry, NOT `record_id`

---

### update-list-entry

Update attributes on a list entry.

**Signature**:

```typescript
{
  list_id: string,
  entry_id: string,  // List entry ID
  attributes: {
    [attribute_slug]: value  // List entry attributes
  }
}
```

**Example**:

```typescript
{
  list_id: '88709359-01f6-478b-ba66-c07347891b6f',
  entry_id: 'entry-uuid',
  attributes: {
    priority: 'High',
    notes: 'Follow up next week'
  }
}
```

**Important**: List entry attributes ≠ record attributes. Check schema skill.

---

### filter-list-entries

Filter list entries by attribute value.

**Signature**:

```typescript
{
  list_id: string,
  attribute: string,      // Attribute to filter by
  filter_type: string,    // 'equals', 'contains', 'greater_than', etc.
  value: unknown,         // Value to filter by (type depends on attribute)
  limit?: number,
  offset?: number
}
```

**Examples**:

```typescript
// Filter deals by value > 10000
{
  list_id: 'active-deals-uuid',
  attribute: 'deal_value',
  filter_type: 'greater_than',
  value: 10000
}

// Filter companies by industry
{
  list_id: 'prospecting-uuid',
  attribute: 'industry',
  filter_type: 'equals',
  value: 'Technology'
}
```

---

### advanced-filter-list-entries

Complex filtering with multiple conditions.

**Signature**:

```typescript
{
  list_id: string,
  filter: {
    conditions: [
      {
        attribute: string,
        filter_type: string,
        value: unknown
      }
    ],
    logic: 'AND' | 'OR'  // How to combine conditions
  },
  limit?: number,
  offset?: number
}
```

**Example**:

```typescript
// Deals > $10k AND stage = "Proposal"
{
  list_id: 'active-deals-uuid',
  filter: {
    conditions: [
      { attribute: 'deal_value', filter_type: 'greater_than', value: 10000 },
      { attribute: 'stage', filter_type: 'equals', value: 'Proposal Sent' }
    ],
    logic: 'AND'
  }
}
```

---

## Note Operations

### create-note

Create note linked to record.

**Signature**:

```typescript
{
  resource_type: string,   // 'companies', 'deals', 'people', etc.
  record_id: string,       // UUID of parent record
  title: string,           // Note title
  content: string          // Note content (supports markdown)
}
```

**Examples**:

```typescript
// Note on company
{
  resource_type: 'companies',
  record_id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Demo Call Notes',
  content: 'Discussed integration requirements. Key decision maker: CTO.'
}

// Note on deal
{
  resource_type: 'deals',
  record_id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Negotiation Update',
  content: 'Price agreed at $75k. Legal review in progress.'
}
```

**Returns**: Created note with `note_id`

**Important**: Validate `record_id` is valid UUID before calling

---

### list-notes

Retrieve notes for a record.

**Signature**:

```typescript
{
  resource_type: string,   // 'companies', 'deals', 'people', etc.
  record_id: string        // UUID of the record
}
```

**Returns**: Array of notes with content and metadata

---

## Task Operations

### create-task

Create task linked to record(s).

**Signature**:

```typescript
{
  content: string,        // Required: task description
  title?: string,         // Optional: task title
  linked_records?: [{
    target_object: string,
    target_record_id: string
  }],
  assignees?: string[],   // Array of person record IDs
  due_at?: string         // ISO 8601 datetime
}
```

**Examples**:

```typescript
// Simple task
{
  content: 'Follow up on demo',
  title: 'Demo Follow-up',
  due_at: '2024-12-20T10:00:00Z'
}

// Task linked to company
{
  content: 'Send proposal',
  title: 'Proposal Delivery',
  linked_records: [{
    target_object: 'companies',
    target_record_id: '550e8400-e29b-41d4-a716-446655440000'
  }],
  due_at: '2024-12-18T17:00:00Z'
}

// Task linked to deal with assignee
{
  content: 'Review contract',
  title: 'Contract Review',
  linked_records: [{
    target_object: 'deals',
    target_record_id: '123e4567-e89b-12d3-a456-426614174000'
  }],
  assignees: ['person-uuid-1', 'person-uuid-2'],
  due_at: '2024-12-19T12:00:00Z'
}
```

**Returns**: Created task with `task_id`

**Important**:

- `content` is required
- `assignees` is array of person record UUIDs
- `due_at` must be ISO 8601 format

---

### update-task

Update existing task.

**Signature**:

```typescript
{
  task_id: string,
  data: {
    content?: string,
    title?: string,
    is_completed?: boolean,
    due_at?: string,
    assignees?: string[]
  }
}
```

**Example**:

```typescript
// Mark task as completed
{
  task_id: 'task-uuid',
  data: {
    is_completed: true
  }
}

// Update due date
{
  task_id: 'task-uuid',
  data: {
    due_at: '2024-12-25T10:00:00Z'
  }
}
```

---

### list-tasks

List all tasks.

**Signature**: None (or optional filters)

**Returns**: Array of tasks

---

## Discovery Operations

### records_discover_attributes

Discover attributes for an object.

**Signature**:

```typescript
{
  resource_type: string; // 'companies', 'deals', etc.
}
```

**Returns**: Detailed attribute specifications

**Use Case**: Runtime discovery (schema skill provides this pre-fetched)

---

## Important Notes

### UUID Validation

Always validate UUIDs before using:

```typescript
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

### Read-Only Fields

Never include in update operations:

- `record_id`
- `created_at`
- `created_by`
- `object_id`

### Multi-Select Arrays

Always wrap in arrays:

- `domains: ["example.com"]`
- `industry: ["Technology"]`
- `assignees: ["uuid"]`

### Data Types

Match exactly from schema:

- Numbers: `85` (not `"85"`)
- Booleans: `true` (not `"true"`)
- Dates: `"2024-12-14"` (ISO 8601)

---

## Cross-References

For YOUR workspace-specific values:

- **Attribute slugs**: See `[object]-attributes.md` in schema skill
- **List IDs**: See generated schema skill
- **Select options**: Check attribute details in schema skill
- **Required fields**: Marked in schema skill attribute specs
