# Resource Types Reference

> **Context:** Complete specification of all Attio resource types with field definitions and constraints  
> **Audience:** Test planners and executors for accurate data construction and validation  
> **Usage:** Reference during test data creation and record validation

## Resource Types Overview

| Resource Type | Description | Primary Use Cases | Key Identifying Fields |
|---------------|-------------|-------------------|----------------------|
| **companies** | Business organizations and entities | CRM, lead tracking, business analysis | `name`, `domains` |
| **people** | Individual contacts and persons | Contact management, relationship tracking | `name`, `email_addresses` |
| **lists** | CRM lists, pipelines, and collections | Organization, workflow management | `name`, `type` |
| **tasks** | Action items and to-dos | Task management, follow-ups | `title`, `status` |
| **deals** | Sales opportunities and transactions | Sales pipeline, revenue tracking | `name`, `value`, `stage` |
| **records** | Generic records and custom objects | Flexible data storage | Varies by record type |

## Detailed Resource Specifications

### companies

**Description:** Business organizations including companies, agencies, nonprofits, and other business entities.

**Key Fields:**
- `name` (string, required): Company name
- `domains` (array of strings): Website domains associated with company
- `description` (string): Company description or notes
- `industry` (string): Business industry classification
- `employee_count` (integer): Number of employees
- `founded_at` (date): Company founding date
- `website` (string): Primary website URL
- `phone` (string): Primary phone number
- `address` (object): Physical address information

**Example Record Data:**
```json
{
  "name": "Acme Corporation",
  "domains": ["acme.com", "acmecorp.com"],
  "description": "Leading provider of innovative solutions",
  "industry": "Technology",
  "employee_count": 150,
  "website": "https://acme.com"
}
```

**Validation Rules:**
- `name` is required and must be unique
- `domains` should be valid domain names
- `employee_count` must be positive integer
- `website` must be valid URL format

---

### people

**Description:** Individual contacts including customers, prospects, employees, and other persons.

**Key Fields:**
- `name` (string, required): Full name of person
- `email_addresses` (array of objects): Email addresses with types
- `job_title` (string): Current job title or position
- `company` (relationship): Associated company record
- `phone_numbers` (array of objects): Phone numbers with types
- `address` (object): Personal address information
- `linkedin_url` (string): LinkedIn profile URL
- `created_at` (datetime): Record creation timestamp
- `updated_at` (datetime): Last modification timestamp

**Example Record Data:**
```json
{
  "name": "John Smith",
  "email_addresses": [
    {"email_address": "john.smith@acme.com", "email_type": "work"}
  ],
  "job_title": "Senior Manager",
  "phone_numbers": [
    {"phone_number": "+1-555-123-4567", "phone_type": "work"}
  ]
}
```

**Email Address Object Structure:**
```json
{
  "email_address": "user@domain.com",
  "email_type": "work" | "personal" | "other"
}
```

**Validation Rules:**
- `name` is required
- `email_addresses` must contain valid email formats
- `phone_numbers` should follow international format
- `linkedin_url` must be valid LinkedIn URL

---

### lists

**Description:** Collections and lists for organizing records, pipelines, and workflows.

**Key Fields:**
- `name` (string, required): List name
- `type` (string): List type or category
- `description` (string): List purpose or notes
- `entry_count` (integer, read-only): Number of entries in list
- `created_at` (datetime): List creation timestamp
- `is_public` (boolean): Whether list is publicly accessible
- `owner` (relationship): User who owns the list

**Example Record Data:**
```json
{
  "name": "Q3 Sales Prospects",
  "type": "sales_pipeline",
  "description": "High-value prospects for Q3 2024",
  "is_public": false
}
```

**Common List Types:**
- `"sales_pipeline"`: Sales opportunity tracking
- `"marketing_campaign"`: Marketing list management  
- `"event_attendees"`: Event and meeting lists
- `"custom"`: Custom-defined list types

**Validation Rules:**
- `name` is required and should be descriptive
- `type` should be from predefined categories or "custom"
- `entry_count` is system-managed, cannot be set directly

---

### tasks

**Description:** Action items, to-dos, and follow-up tasks for workflow management.

**Key Fields:**
- `title` (string, required): Task title or summary
- `description` (string): Detailed task description
- `status` (string, required): Current task status
- `priority` (string): Task priority level
- `due_date` (date): Target completion date
- `assignee` (relationship): Person assigned to task
- `related_records` (array): Associated records (companies, people, etc.)
- `created_at` (datetime): Task creation timestamp
- `completed_at` (datetime): Task completion timestamp

**Example Record Data:**
```json
{
  "title": "Follow up on proposal",
  "description": "Call client to discuss proposal feedback and next steps",
  "status": "open",
  "priority": "high", 
  "due_date": "2024-08-25"
}
```

**Status Values:**
- `"open"`: Task not started
- `"in_progress"`: Task in progress
- `"completed"`: Task finished
- `"cancelled"`: Task cancelled

**Priority Values:**
- `"low"`: Low priority
- `"medium"`: Medium priority
- `"high"`: High priority
- `"urgent"`: Urgent priority

**Validation Rules:**
- `title` is required and should be descriptive
- `status` must be one of the predefined values
- `due_date` should be future date for new tasks
- `priority` should be from predefined levels

---

### deals

**Description:** Sales opportunities, transactions, and revenue-generating activities.

**Key Fields:**
- `name` (string, required): Deal name or title
- `value` (number): Deal value in primary currency
- `stage` (string, required): Current deal stage
- `probability` (number): Win probability percentage (0-100)
- `close_date` (date): Expected or actual close date
- `company` (relationship): Associated company
- `contact` (relationship): Primary contact person
- `description` (string): Deal notes or description
- `created_at` (datetime): Deal creation timestamp
- `owner` (relationship): Deal owner/salesperson

**Example Record Data:**
```json
{
  "name": "Acme Corp - Enterprise License",
  "value": 75000,
  "stage": "proposal",
  "probability": 60,
  "close_date": "2024-09-30",
  "description": "Enterprise software license renewal"
}
```

**Common Deal Stages:**
- `"lead"`: Initial lead or inquiry
- `"qualification"`: Qualifying opportunity
- `"proposal"`: Proposal submitted
- `"negotiation"`: Price/terms negotiation
- `"closed_won"`: Deal won
- `"closed_lost"`: Deal lost

**Validation Rules:**
- `name` is required and should be descriptive
- `value` should be positive number
- `stage` must be from predefined stages
- `probability` should be 0-100 if provided
- `close_date` should be realistic future date

---

### records

**Description:** Generic records for flexible data storage and custom object types.

**Key Fields:**
- Variable based on record type and configuration
- Usually includes `name` or `title` field
- May include custom fields specific to use case
- Standard fields: `created_at`, `updated_at`, `id`

**Example Record Data:**
```json
{
  "name": "Custom Record Example",
  "custom_field_1": "Custom value",
  "custom_field_2": 42,
  "record_type": "custom_object"
}
```

**Usage Notes:**
- Field structure varies based on configuration
- Use `get-attributes` to discover available fields
- Validation rules depend on custom configuration

## Field Types & Formats

### String Fields
- **Format:** Plain text strings
- **Validation:** Length limits, character restrictions
- **Example:** `"John Smith"`, `"Technology Company"`

### Numeric Fields
- **Integer:** Whole numbers (`42`, `1500`)
- **Decimal:** Floating point (`75000.50`, `3.14159`)
- **Validation:** Range limits, positive/negative restrictions

### Date/DateTime Fields
- **Date Only:** `"2024-08-20"`
- **DateTime (ISO 8601):** `"2024-08-20T14:30:00Z"`
- **Validation:** Valid date format, logical date ranges

### Array Fields
- **String Arrays:** `["value1", "value2", "value3"]`
- **Object Arrays:** `[{"field": "value"}, {"field": "value2"}]`
- **Validation:** Element count limits, element format validation

### Object Fields
- **Nested Structure:** `{"street": "123 Main St", "city": "City", "state": "ST"}`
- **Validation:** Required sub-fields, format constraints

### Relationship Fields
- **Record References:** Links to other records by ID
- **Format:** Usually record ID or relationship object
- **Validation:** Referenced record must exist

## Common Field Patterns

### Email Addresses
```json
{
  "email_addresses": [
    {
      "email_address": "user@domain.com",
      "email_type": "work"
    }
  ]
}
```

### Phone Numbers
```json
{
  "phone_numbers": [
    {
      "phone_number": "+1-555-123-4567", 
      "phone_type": "work"
    }
  ]
}
```

### Addresses
```json
{
  "address": {
    "street": "123 Main Street",
    "city": "Anytown", 
    "state": "CA",
    "postal_code": "90210",
    "country": "United States"
  }
}
```

## Testing Considerations

### Required Fields
- Always include required fields in test data
- Test validation with missing required fields
- Verify error messages for incomplete data

### Field Constraints  
- Test field length limits
- Validate format requirements (emails, URLs, dates)
- Test numeric range validations

### Relationship Integrity
- Ensure related records exist before creating relationships
- Test orphaned record handling
- Verify cascading delete behavior

### Data Consistency
- Use realistic test data that matches field purposes
- Maintain referential integrity across related records
- Follow naming conventions for easy identification

---

**Related Documentation:**
- [Reference: Tool Reference Guide](./tool-reference.md)
- [Reference: Test Data Setup](./test-data-setup.md)
- [Back: Reference Directory](./index.md)
- [Test Cases: Data Creation Examples](../04-test-cases/)