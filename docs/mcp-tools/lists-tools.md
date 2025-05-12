# Attio MCP Lists Tools

The Attio MCP server provides several tools for working with lists in Attio:

## Available Tools

### list-lists

Get all lists in the Attio workspace.

#### Parameters

| Parameter   | Type   | Description | Required |
|-------------|--------|-------------|----------|
| limit       | number | Maximum number of lists to return (default: 20) | No |
| objectSlug  | string | Filter lists by object type (e.g., 'people', 'companies') | No |

#### Example Usage

```json
{
  "name": "list-lists",
  "arguments": {
    "limit": 10
  }
}
```

```json
{
  "name": "list-lists",
  "arguments": {
    "objectSlug": "people",
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
      "text": "Lists in Attio workspace:\n\n1. Sales Pipeline\n   ID: list_01abcdef\n   Object: companies\n   Description: Active sales opportunities\n\n2. Leads\n   ID: list_02ghijkl\n   Object: people\n   Description: Potential leads to contact\n\n3. Enterprise Customers\n   ID: list_03mnopqr\n   Object: companies\n   Description: Enterprise-tier customers\n\nShowing 3 of 3 total lists."
    }
  ],
  "isError": false,
  "metadata": {
    "items": [
      {
        "id": "list_01abcdef",
        "name": "Sales Pipeline",
        "description": "Active sales opportunities",
        "object_slug": "companies",
        "workspace_id": "workspace_01abcdef",
        "created_at": "2023-01-15T10:00:00Z",
        "updated_at": "2023-05-20T14:30:00Z"
      },
      {
        "id": "list_02ghijkl",
        "name": "Leads",
        "description": "Potential leads to contact",
        "object_slug": "people",
        "workspace_id": "workspace_01abcdef",
        "created_at": "2023-02-10T09:15:00Z",
        "updated_at": "2023-06-01T11:45:00Z"
      },
      {
        "id": "list_03mnopqr",
        "name": "Enterprise Customers",
        "description": "Enterprise-tier customers",
        "object_slug": "companies",
        "workspace_id": "workspace_01abcdef",
        "created_at": "2023-03-05T13:30:00Z",
        "updated_at": "2023-05-25T16:20:00Z"
      }
    ],
    "pagination": {
      "total": 3,
      "hasMore": false
    }
  }
}
```

### get-list

Get detailed information about a specific list.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| id        | string | List ID | Yes |

#### Example Usage

```json
{
  "name": "get-list",
  "arguments": {
    "id": "list_01abcdef"
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "List Details:\n\nName: Sales Pipeline\nID: list_01abcdef\nObject Type: companies\nDescription: Active sales opportunities\nCreated: 2023-01-15\nLast Updated: 2023-05-20\nEntry Count: 24"
    }
  ],
  "isError": false,
  "metadata": {
    "list": {
      "id": "list_01abcdef",
      "name": "Sales Pipeline",
      "description": "Active sales opportunities",
      "object_slug": "companies",
      "workspace_id": "workspace_01abcdef",
      "created_at": "2023-01-15T10:00:00Z",
      "updated_at": "2023-05-20T14:30:00Z",
      "entry_count": 24,
      "columns": [
        {
          "id": "column_01abcdef",
          "name": "Stage",
          "type": "select"
        },
        {
          "id": "column_02ghijkl",
          "name": "Deal Size",
          "type": "currency"
        },
        {
          "id": "column_03mnopqr",
          "name": "Expected Close Date",
          "type": "date"
        }
      ]
    }
  }
}
```

### get-list-entries

Get entries for a specific list.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| id        | string | List ID | Yes |
| limit     | number | Maximum number of entries to return (default: 20) | No |
| offset    | number | Number of entries to skip (default: 0) | No |

#### Example Usage

```json
{
  "name": "get-list-entries",
  "arguments": {
    "id": "list_01abcdef",
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
      "text": "Entries for list 'Sales Pipeline':\n\n1. Acme Inc.\n   Entry ID: entry_01abcdef\n   Record ID: company_01abcdef\n   Stage: Negotiation\n   Deal Size: $75,000\n   Expected Close Date: 2023-07-15\n\n2. TechCorp\n   Entry ID: entry_02ghijkl\n   Record ID: company_03stuvwx\n   Stage: Proposal\n   Deal Size: $120,000\n   Expected Close Date: 2023-08-10\n\n3. GlobalSoft\n   Entry ID: entry_03mnopqr\n   Record ID: company_04yzabcd\n   Stage: Discovery\n   Deal Size: $50,000\n   Expected Close Date: 2023-09-05\n\nShowing 3 of 24 total entries."
    }
  ],
  "isError": false,
  "metadata": {
    "items": [
      {
        "id": "entry_01abcdef",
        "list_id": "list_01abcdef",
        "record_id": "company_01abcdef",
        "created_at": "2023-04-10T11:30:00Z",
        "updated_at": "2023-06-02T14:15:00Z",
        "values": {
          "Stage": "Negotiation",
          "Deal Size": "$75,000",
          "Expected Close Date": "2023-07-15"
        },
        "record": {
          "id": {
            "record_id": "company_01abcdef"
          },
          "values": {
            "name": [{ "value": "Acme Inc." }]
          }
        }
      },
      {
        "id": "entry_02ghijkl",
        "list_id": "list_01abcdef",
        "record_id": "company_03stuvwx",
        "created_at": "2023-04-25T09:45:00Z",
        "updated_at": "2023-05-30T16:30:00Z",
        "values": {
          "Stage": "Proposal",
          "Deal Size": "$120,000",
          "Expected Close Date": "2023-08-10"
        },
        "record": {
          "id": {
            "record_id": "company_03stuvwx"
          },
          "values": {
            "name": [{ "value": "TechCorp" }]
          }
        }
      },
      {
        "id": "entry_03mnopqr",
        "list_id": "list_01abcdef",
        "record_id": "company_04yzabcd",
        "created_at": "2023-05-12T13:20:00Z",
        "updated_at": "2023-05-12T13:20:00Z",
        "values": {
          "Stage": "Discovery",
          "Deal Size": "$50,000",
          "Expected Close Date": "2023-09-05"
        },
        "record": {
          "id": {
            "record_id": "company_04yzabcd"
          },
          "values": {
            "name": [{ "value": "GlobalSoft" }]
          }
        }
      }
    ],
    "pagination": {
      "total": 24,
      "hasMore": true,
      "nextCursor": "cursor_hash_value"
    }
  }
}
```

### add-to-list

Add a record to a list.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| listId    | string | List ID | Yes |
| recordId  | string | Record ID to add to the list | Yes |

#### Example Usage

```json
{
  "name": "add-to-list",
  "arguments": {
    "listId": "list_01abcdef",
    "recordId": "company_05efghij"
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully added Innovatech to list 'Sales Pipeline'.\n\nEntry ID: entry_04stuvwx\nRecord ID: company_05efghij\nList ID: list_01abcdef"
    }
  ],
  "isError": false,
  "metadata": {
    "entry": {
      "id": "entry_04stuvwx",
      "list_id": "list_01abcdef",
      "record_id": "company_05efghij",
      "created_at": "2023-06-15T10:30:00Z",
      "updated_at": "2023-06-15T10:30:00Z",
      "values": {},
      "record": {
        "id": {
          "record_id": "company_05efghij"
        },
        "values": {
          "name": [{ "value": "Innovatech" }]
        }
      }
    }
  }
}
```

### remove-from-list

Remove a record from a list.

#### Parameters

| Parameter | Type   | Description | Required |
|-----------|--------|-------------|----------|
| listId    | string | List ID | Yes |
| entryId   | string | Entry ID to remove | Yes |

#### Example Usage

```json
{
  "name": "remove-from-list",
  "arguments": {
    "listId": "list_01abcdef",
    "entryId": "entry_02ghijkl"
  }
}
```

#### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully removed TechCorp (entry_02ghijkl) from list 'Sales Pipeline'."
    }
  ],
  "isError": false,
  "metadata": {
    "success": true,
    "listId": "list_01abcdef",
    "entryId": "entry_02ghijkl"
  }
}
```

## Implementation Details

### List Operations

The Lists API implements a set of operations for managing lists and list entries in Attio:

- `getAllLists`: Get all lists in the workspace, optionally filtered by object type
- `getListDetails`: Get detailed information about a specific list
- `getListEntries`: Get entries for a specific list, with paging support
- `addRecordToList`: Add a record to a list
- `removeRecordFromList`: Remove a record from a list

### Fallback Endpoints for List Entries

The `getListEntries` function implements a fallback strategy to handle different API versions:

```typescript
// Try the primary endpoint first
try {
  const path = `/lists/${listId}/entries/query`;
  // ...
} catch (primaryError) {
  // Try fallback endpoints
  try {
    const fallbackPath = `/lists-entries/query`;
    // ...
  } catch (fallbackError) {
    // Last resort fallback
    try {
      const lastPath = `/lists-entries?list_id=${listId}`;
      // ...
    } catch (lastError) {
      // Handle error
    }
  }
}
```

This ensures compatibility with different versions of the Attio API.

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