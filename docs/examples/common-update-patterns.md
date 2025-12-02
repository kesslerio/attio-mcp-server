# Common Update Patterns

This guide provides examples of frequently used update patterns for the Attio MCP Server.

**⚠️ Important**: All examples use generic placeholder data. Replace with your actual data.

## Person Updates

### Update Basic Contact Information

Update a person's name, email, and job title:

```json
{
  "resource_type": "people",
  "record_id": "person-uuid-here",
  "values": {
    "name": "Jane Doe",
    "email_addresses": ["jane.doe@example.com"],
    "job_title": "VP of Engineering"
  }
}
```

### Update Phone Numbers (Correct Format)

**✅ Correct format** - Use `original_phone_number` as the key:

```json
{
  "resource_type": "people",
  "record_id": "person-uuid-here",
  "values": {
    "phone_numbers": [{ "original_phone_number": "+1-555-0100" }]
  }
}
```

### Update Multiple Phone Numbers

For people with multiple phone numbers:

```json
{
  "resource_type": "people",
  "record_id": "person-uuid-here",
  "values": {
    "phone_numbers": [
      { "original_phone_number": "+1-555-0100" },
      { "original_phone_number": "+44-20-5555-0100" },
      { "original_phone_number": "+1-555-0199" }
    ]
  }
}
```

### Update Person with Full Contact Details

Comprehensive contact information update:

```json
{
  "resource_type": "people",
  "record_id": "person-uuid-here",
  "values": {
    "name": "John Smith",
    "job_title": "Director of Sales",
    "company": "Acme Corp",
    "email_addresses": ["john.smith@example.com", "jsmith@example.org"],
    "phone_numbers": [{ "original_phone_number": "+1-555-0150" }],
    "primary_location": {
      "city": "San Francisco",
      "state": "California",
      "country": "United States"
    }
  }
}
```

### Update Social Media Links

Update LinkedIn and Twitter profiles:

```json
{
  "resource_type": "people",
  "record_id": "person-uuid-here",
  "values": {
    "linkedin": "https://linkedin.com/in/janeexample",
    "twitter": "@janeexample"
  }
}
```

## Company Updates

### Update Company Basic Information

Update company name and industry:

```json
{
  "resource_type": "companies",
  "record_id": "company-uuid-here",
  "values": {
    "name": "Acme Corporation",
    "industry": "Technology"
  }
}
```

### Update Company Contact Details

Update company address and website:

```json
{
  "resource_type": "companies",
  "record_id": "company-uuid-here",
  "values": {
    "name": "Example Industries LLC",
    "domains": ["example.com", "example.org"],
    "city": "New York",
    "state": "New York",
    "country": "United States",
    "postal_code": "10001",
    "street_address": "123 Main Street"
  }
}
```

### Update Company Phone Number (Custom Field)

**Note**: Unlike people, companies don't have a standard `phone_numbers` attribute in Attio. Phone numbers for companies are stored in **custom attributes** that vary by workspace.

#### Setup Workflow

1. **Create the attribute in Attio** (one-time setup):
   - Go to your Attio workspace → Companies → Settings → Attributes
   - Click "Add attribute" → Select "Phone number" type
   - Name it (e.g., "Company Phone", "Main Phone", "Office Phone")
   - See [Attio Help: Create and manage attributes](https://attio.com/help/reference/managing-your-data/attributes/create-manage-attributes)

2. **Find your attribute's API slug**:

   ```json
   {
     "tool": "records_discover_attributes",
     "resource_type": "companies"
   }
   ```

   Look for your phone field (e.g., `company_phone`, `main_phone`)

3. **Use it via MCP** - no additional mapping needed!

#### Example Usage

```json
{
  "resource_type": "companies",
  "record_id": "company-uuid-here",
  "values": {
    "company_phone": "+1-800-555-0100"
  }
}
```

**Common custom phone field names:**

- `company_phone`
- `phone`
- `main_phone`
- `office_phone`

#### Automatic Normalization

The phone normalizer **automatically** validates and normalizes any field containing "phone" in the name to E.164 format. No configuration or mapping required - just use the field's `api_slug` and the MCP server handles the rest.

### Update Company Size and Revenue

Update headcount and revenue information:

```json
{
  "resource_type": "companies",
  "record_id": "company-uuid-here",
  "values": {
    "employee_count": 250,
    "annual_revenue": 5000000,
    "founded_year": 2015
  }
}
```

## Deal Updates

### Update Deal Stage

**⚠️ Use "stage", not "status"** for deal stages:

```json
{
  "resource_type": "deals",
  "record_id": "deal-uuid-here",
  "values": {
    "stage": "Demo Scheduled"
  }
}
```

### Update Deal Value

Update the monetary value of a deal:

```json
{
  "resource_type": "deals",
  "record_id": "deal-uuid-here",
  "values": {
    "value": 50000
  }
}
```

Note: Currency is set automatically based on workspace settings. Just provide the numeric value.

### Update Deal with Multiple Fields

Update stage, value, and name together:

```json
{
  "resource_type": "deals",
  "record_id": "deal-uuid-here",
  "values": {
    "name": "Acme Corp - Enterprise Plan",
    "stage": "Proposal Sent",
    "value": 75000
  }
}
```

### Link Deal to Company

Associate a deal with a company:

```json
{
  "resource_type": "deals",
  "record_id": "deal-uuid-here",
  "values": {
    "associated_company": "company-uuid-here"
  }
}
```

**⚠️ Use "associated_company", not "company" or "company_id"**

### Link Deal to People

Associate contacts/people with a deal:

```json
{
  "resource_type": "deals",
  "record_id": "deal-uuid-here",
  "values": {
    "associated_people": ["person-uuid-1", "person-uuid-2"]
  }
}
```

## Task Updates

### Update Task Status

Change task completion status:

```json
{
  "resource_type": "tasks",
  "record_id": "task-uuid-here",
  "values": {
    "status": "completed"
  }
}
```

Valid statuses: `open`, `completed`, `cancelled`

### Update Task Due Date

Change when a task is due:

```json
{
  "resource_type": "tasks",
  "record_id": "task-uuid-here",
  "values": {
    "due_date": "2025-09-01"
  }
}
```

Use ISO date format (YYYY-MM-DD).

### Reassign Task

Change task assignee:

```json
{
  "resource_type": "tasks",
  "record_id": "task-uuid-here",
  "values": {
    "assignee_id": "workspace-member-uuid-here"
  }
}
```

**⚠️ Note**: Task content cannot be updated after creation. It is immutable in the Attio API.

## Common Mistakes & Solutions

### Phone Number Format

Both formats now work - the normalizer auto-transforms `phone_number` to `original_phone_number`:

**✅ Preferred (Attio native format):**

```json
{
  "phone_numbers": [{ "original_phone_number": "+1-555-0100" }]
}
```

**✅ Also works (auto-transformed):**

```json
{
  "phone_numbers": [{ "phone_number": "+1-555-0100" }]
}
```

Both formats are validated against E.164 standard and normalized automatically.

---

### ❌ Wrong Deal Company Field

```json
{
  "company_id": "uuid"
}
```

or

```json
{
  "company": "uuid"
}
```

### ✅ Correct Deal Company Field

```json
{
  "associated_company": "uuid"
}
```

---

### ❌ Wrong Deal Status Field

```json
{
  "status": "Demo"
}
```

### ✅ Correct Deal Stage Field

```json
{
  "stage": "Demo"
}
```

---

### ❌ Wrong Task Content Field

```json
{
  "title": "Follow up with client"
}
```

or

```json
{
  "description": "Follow up with client"
}
```

### ✅ Correct Task Content Field (Create Only)

```json
{
  "content": "Follow up with client"
}
```

**Note**: Content can only be set during task creation, not updates.

## Phone Number Format Reference

### Supported Formats

The system auto-normalizes most phone formats to E.164 standard:

```json
// All of these will be normalized to "+15550100"
{"original_phone_number": "+1-555-0100"}
{"original_phone_number": "(555) 010-0100"}
{"original_phone_number": "555.010.0100"}
{"original_phone_number": "+1 555 010 0100"}
```

### Recommended Format

**Best**: E.164 format with country code

```json
{ "original_phone_number": "+15550100" }
```

**Also good**: Formatted E.164

```json
{ "original_phone_number": "+1-555-0100" }
```

### International Numbers

Always include the country code:

```json
{
  "phone_numbers": [
    { "original_phone_number": "+44-20-5555-0100" }, // UK
    { "original_phone_number": "+81-3-5555-0100" }, // Japan
    { "original_phone_number": "+61-2-5555-0100" } // Australia
  ]
}
```

## Tips for Success

1. **Always use UUID format** for record IDs (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
2. **Check field names** using the `discover-attributes` tool before updating
3. **Use the correct key names** - many fields have specific naming conventions
4. **Include country codes** for phone numbers
5. **Use ISO date format** (YYYY-MM-DD) for date fields
6. **Review field verification warnings** to understand how Attio transforms your data

## Related Documentation

- [Field Verification Configuration](../configuration/field-verification.md) - Understanding persistence warnings
- [Error Handling Guide](../error-handling.md) - Troubleshooting validation errors
- [API Reference](../api-reference.md) - Complete field reference

---

**Issue**: #798 - UX improvements for error messages and person attributes
