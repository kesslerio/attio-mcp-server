# ⚠️ DEPRECATED: Attio MCP People Tools

> **🚨 IMPORTANT NOTICE**: These individual people tools have been **deprecated** and consolidated into universal tools.
> 
> **📖 New Universal Tools**: Use [Universal Tools](../universal-tools/README.md) instead for better performance and consistency.
>
> **🔄 Migration**: See the [Migration Guide](../universal-tools/migration-guide.md) for complete mappings from these deprecated tools to their universal equivalents.
>
> **✅ Zero Breaking Changes**: All functionality is preserved in the universal tools system.

---

## Legacy People Tools (DEPRECATED)

The following tools have been **replaced by universal tools** that work across all resource types:

## Available Tools

### search-people

Search for people by name, email, or phone number.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| query     | string | Search term to match against name, email, or phone fields | Yes |
| limit     | number | Maximum number of results to return (default: 20) | No |

#### Example Usage

```json
{
  "name": "search-people",
  "arguments": {
    "query": "sarah"
  }
}
```

```json
{
  "name": "search-people",
  "arguments": {
    "query": "john@example.com",
    "limit": 5
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Found 2 people matching 'john@example.com':\n\n1. John Smith (john@example.com)\n   ID: person_01abcdef\n   Job Title: Software Engineer\n   Company: Acme Inc.\n   Phone: +1 (555) 123-4567\n\n2. John Doe (john@example.com)\n   ID: person_02ghijkl\n   Job Title: Product Manager\n   Company: Example Corp\n   Phone: +1 (555) 987-6543\n\nShowing 2 of 2 total items."
    }
  ],
  "isError": false,
  "metadata": {
    "items": [
      {
        "id": {
          "record_id": "person_01abcdef"
        },
        "values": {
          "name": [{ "value": "John Smith" }],
          "email": [{ "value": "john@example.com" }],
          "phone": [{ "value": "+1 (555) 123-4567" }],
          "job_title": [{ "value": "Software Engineer" }],
          "company": [{ 
            "id": { "record_id": "company_01abcdef" },
            "values": { "name": [{ "value": "Acme Inc." }] }
          }]
        }
      },
      {
        "id": {
          "record_id": "person_02ghijkl"
        },
        "values": {
          "name": [{ "value": "John Doe" }],
          "email": [{ "value": "john@example.com" }],
          "phone": [{ "value": "+1 (555) 987-6543" }],
          "job_title": [{ "value": "Product Manager" }],
          "company": [{ 
            "id": { "record_id": "company_02ghijkl" },
            "values": { "name": [{ "value": "Example Corp" }] }
          }]
        }
      }
    ],
    "pagination": {
      "total": 2,
      "hasMore": false
    }
  }
}
```

### get-person

Get detailed information about a specific person by ID.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| id        | string | Person record ID | Yes |

#### Example Usage

```json
{
  "name": "get-person",
  "arguments": {
    "id": "person_01abcdef"
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Person Details:\n\nName: John Smith\nEmail: john@example.com\nPhone: +1 (555) 123-4567\nJob Title: Software Engineer\nCompany: Acme Inc.\nLinkedIn: https://linkedin.com/in/johnsmith\nLast Contacted: 2023-05-15\n\nID: person_01abcdef"
    }
  ],
  "isError": false,
  "metadata": {
    "record": {
      "id": {
        "record_id": "person_01abcdef"
      },
      "values": {
        "name": [{ "value": "John Smith" }],
        "email": [{ "value": "john@example.com" }],
        "phone": [{ "value": "+1 (555) 123-4567" }],
        "job_title": [{ "value": "Software Engineer" }],
        "company": [{ 
          "id": { "record_id": "company_01abcdef" },
          "values": { "name": [{ "value": "Acme Inc." }] }
        }],
        "linkedin_url": [{ "value": "https://linkedin.com/in/johnsmith" }],
        "last_contacted": [{ "value": "2023-05-15" }]
      }
    }
  }
}
```

### get-person-notes

Get notes associated with a specific person.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| id        | string | Person record ID | Yes |
| limit     | number | Maximum number of notes to return (default: 10) | No |
| offset    | number | Number of notes to skip (default: 0) | No |

#### Example Usage

```json
{
  "name": "get-person-notes",
  "arguments": {
    "id": "person_01abcdef",
    "limit": 5
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Notes for John Smith:\n\n1. Initial Call (2023-05-10)\n   Discussed potential partnership opportunities. John showed interest in our premium plan.\n\n2. Follow-up Email (2023-05-15)\n   Sent pricing information and technical specifications as requested.\n\nShowing 2 of 2 total notes."
    }
  ],
  "isError": false,
  "metadata": {
    "items": [
      {
        "id": { "note_id": "note_01abcdef" },
        "title": "Initial Call",
        "content": "Discussed potential partnership opportunities. John showed interest in our premium plan.",
        "created_at": "2023-05-10T14:30:00Z",
        "created_by": { "user_id": "user_01abcdef", "name": "Sales Rep" }
      },
      {
        "id": { "note_id": "note_02ghijkl" },
        "title": "Follow-up Email",
        "content": "Sent pricing information and technical specifications as requested.",
        "created_at": "2023-05-15T10:15:00Z",
        "created_by": { "user_id": "user_01abcdef", "name": "Sales Rep" }
      }
    ],
    "pagination": {
      "total": 2,
      "hasMore": false
    }
  }
}
```

### create-person-note

Create a new note for a specific person.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| id        | string | Person record ID | Yes |
| title     | string | Note title | Yes |
| content   | string | Note content | Yes |

#### Example Usage

```json
{
  "name": "create-person-note",
  "arguments": {
    "id": "person_01abcdef",
    "title": "Product Demo",
    "content": "Showed John the new analytics dashboard. He was impressed with the visualization capabilities and asked about API access."
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Note created successfully for John Smith:\n\nTitle: Product Demo\nContent: Showed John the new analytics dashboard. He was impressed with the visualization capabilities and asked about API access.\n\nNote ID: note_03mnopqr"
    }
  ],
  "isError": false,
  "metadata": {
    "note": {
      "id": { "note_id": "note_03mnopqr" },
      "title": "[AI] Product Demo",
      "content": "Showed John the new analytics dashboard. He was impressed with the visualization capabilities and asked about API access.",
      "created_at": "2023-06-01T09:45:00Z",
      "created_by": { "user_id": "user_01abcdef", "name": "API User" }
    }
  }
}
```

## Implementation Details

### Enhanced Search Capabilities

The `search-people` tool has been enhanced to search across multiple fields:

- **Name**: Matches partial names (first name, last name, or full name)
- **Email**: Matches complete or partial email addresses
- **Phone**: Matches complete or partial phone numbers

This is implemented using Attio's filter API with the `$or` operator:

```typescript
// For people, search by name, email, or phone
filter = {
  "$or": [
    { name: { "$contains": query } },
    { email: { "$contains": query } },
    { phone: { "$contains": query } }
  ]
};
```

This enhancement makes it much easier to find people when you only have partial information, such as:
- An email domain (e.g., "example.com")
- A phone number with just the area code
- A partial name

### Retry Logic

All API calls include automatic retry logic with exponential backoff for handling transient errors:

```typescript
const result = await callWithRetry(
  async () => {
    // API call implementation
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    useExponentialBackoff: true
  }
);
```

This ensures robust operation even during network issues or API rate limiting.

### Response Formatting

All responses follow a standardized format for consistency:

```typescript
{
  content: [{ type: 'text', text: '...' }],
  isError: false,
  metadata: { ... }
}
```

This provides both human-readable text responses and structured metadata that can be used programmatically.