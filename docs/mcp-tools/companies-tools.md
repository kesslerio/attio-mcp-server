# Attio MCP Companies Tools

The Attio MCP server provides several tools for working with company records in Attio:

## Available Tools

### search-companies

Search for companies by name.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| query     | string | Search term to match against company names | Yes |
| limit     | number | Maximum number of results to return (default: 20) | No |

#### Example Usage

```json
{
  "name": "search-companies",
  "arguments": {
    "query": "acme"
  }
}
```

```json
{
  "name": "search-companies",
  "arguments": {
    "query": "tech",
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
      "text": "Found 2 companies matching 'acme':\n\n1. Acme Inc.\n   ID: company_01abcdef\n   Website: https://acme.com\n   Industry: Technology\n   Size: 100-500 employees\n\n2. Acme Global Solutions\n   ID: company_02ghijkl\n   Website: https://acmeglobal.com\n   Industry: Consulting\n   Size: 50-100 employees\n\nShowing 2 of 2 total items."
    }
  ],
  "isError": false,
  "metadata": {
    "items": [
      {
        "id": {
          "record_id": "company_01abcdef"
        },
        "values": {
          "name": [{ "value": "Acme Inc." }],
          "website": [{ "value": "https://acme.com" }],
          "industry": [{ "value": "Technology" }],
          "size": [{ "value": "100-500 employees" }]
        }
      },
      {
        "id": {
          "record_id": "company_02ghijkl"
        },
        "values": {
          "name": [{ "value": "Acme Global Solutions" }],
          "website": [{ "value": "https://acmeglobal.com" }],
          "industry": [{ "value": "Consulting" }],
          "size": [{ "value": "50-100 employees" }]
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

### get-company

Get detailed information about a specific company by ID.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| id        | string | Company record ID | Yes |

#### Example Usage

```json
{
  "name": "get-company",
  "arguments": {
    "id": "company_01abcdef"
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Company Details:\n\nName: Acme Inc.\nWebsite: https://acme.com\nIndustry: Technology\nSize: 100-500 employees\nAddress: 123 Main St, San Francisco, CA 94105\nDescription: Leading provider of innovative software solutions\nYear Founded: 2010\n\nID: company_01abcdef"
    }
  ],
  "isError": false,
  "metadata": {
    "record": {
      "id": {
        "record_id": "company_01abcdef"
      },
      "values": {
        "name": [{ "value": "Acme Inc." }],
        "website": [{ "value": "https://acme.com" }],
        "industry": [{ "value": "Technology" }],
        "size": [{ "value": "100-500 employees" }],
        "address": [{ "value": "123 Main St, San Francisco, CA 94105" }],
        "description": [{ "value": "Leading provider of innovative software solutions" }],
        "year_founded": [{ "value": 2010 }]
      }
    }
  }
}
```

### get-company-notes

Get notes associated with a specific company.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| id        | string | Company record ID | Yes |
| limit     | number | Maximum number of notes to return (default: 10) | No |
| offset    | number | Number of notes to skip (default: 0) | No |

#### Example Usage

```json
{
  "name": "get-company-notes",
  "arguments": {
    "id": "company_01abcdef",
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
      "text": "Notes for Acme Inc.:\n\n1. Partnership Discussion (2023-04-20)\n   Initial meeting with leadership team about strategic partnership.\n\n2. Technical Integration (2023-05-05)\n   Discussed API integration options and timeline.\n\n3. Contract Review (2023-05-25)\n   Legal teams reviewing partnership agreement draft.\n\nShowing 3 of 3 total notes."
    }
  ],
  "isError": false,
  "metadata": {
    "items": [
      {
        "id": { "note_id": "note_01abcdef" },
        "title": "Partnership Discussion",
        "content": "Initial meeting with leadership team about strategic partnership.",
        "created_at": "2023-04-20T13:00:00Z",
        "created_by": { "user_id": "user_01abcdef", "name": "Account Executive" }
      },
      {
        "id": { "note_id": "note_02ghijkl" },
        "title": "Technical Integration",
        "content": "Discussed API integration options and timeline.",
        "created_at": "2023-05-05T15:30:00Z",
        "created_by": { "user_id": "user_02ghijkl", "name": "Solutions Architect" }
      },
      {
        "id": { "note_id": "note_03mnopqr" },
        "title": "Contract Review",
        "content": "Legal teams reviewing partnership agreement draft.",
        "created_at": "2023-05-25T11:15:00Z",
        "created_by": { "user_id": "user_03mnopqr", "name": "Legal Counsel" }
      }
    ],
    "pagination": {
      "total": 3,
      "hasMore": false
    }
  }
}
```

### create-company-note

Create a new note for a specific company.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| id        | string | Company record ID | Yes |
| title     | string | Note title | Yes |
| content   | string | Note content | Yes |

#### Example Usage

```json
{
  "name": "create-company-note",
  "arguments": {
    "id": "company_01abcdef",
    "title": "Quarterly Business Review",
    "content": "Met with Acme Inc. leadership for Q2 review. They reported 30% growth YoY and are planning to expand their engineering team. They're interested in our enterprise plan for the expanded team."
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Note created successfully for Acme Inc.:\n\nTitle: Quarterly Business Review\nContent: Met with Acme Inc. leadership for Q2 review. They reported 30% growth YoY and are planning to expand their engineering team. They're interested in our enterprise plan for the expanded team.\n\nNote ID: note_04stuvwx"
    }
  ],
  "isError": false,
  "metadata": {
    "note": {
      "id": { "note_id": "note_04stuvwx" },
      "title": "[AI] Quarterly Business Review",
      "content": "Met with Acme Inc. leadership for Q2 review. They reported 30% growth YoY and are planning to expand their engineering team. They're interested in our enterprise plan for the expanded team.",
      "created_at": "2023-06-15T14:00:00Z",
      "created_by": { "user_id": "user_01abcdef", "name": "API User" }
    }
  }
}
```

## Implementation Details

### Search Implementation

The `search-companies` tool searches for companies by name using Attio's filter API:

```typescript
// For companies, search by name only
filter = {
  name: { "$contains": query }
};
```

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