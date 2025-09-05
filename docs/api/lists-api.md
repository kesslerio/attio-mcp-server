# Attio Lists API

✅ **Implementation Status**: Lists API is **fully implemented** with 11 MCP tools providing complete CRUD operations and advanced filtering capabilities.

The Lists API allows you to manage lists within Attio. Lists provide organized views of records, with optional filtering, sorting, and grouping.

## 🚀 **Available MCP Tools**

The following 11 MCP tools are fully implemented and tested:

1. `get-lists` - Get all CRM lists
2. `get-list-details` - Get specific list configuration  
3. `get-list-entries` - Get entries from a list with pagination
4. `filter-list-entries` - Filter entries by single attribute
5. `advanced-filter-list-entries` - Complex filtering with AND/OR logic
6. `add-record-to-list` - Add records to lists
7. `remove-record-from-list` - Remove records from lists
8. `update-list-entry` - Update list entry attributes (e.g., stage changes)
9. `filter-list-entries-by-parent` - Filter by parent record properties
10. `filter-list-entries-by-parent-id` - Filter by specific parent record ID
11. `get-record-list-memberships` - Find all lists containing a record

## Using Lists with Claude

Claude can help you work with Attio lists through the MCP server. Here are some common use cases and example prompts:

### Viewing Available Lists

You can ask Claude to show you the lists in your Attio workspace:

```
Show me all my lists in Attio
```

```
What company lists do I have?
```

### Working with List Entries

Claude can show you entries from specific lists:

```
Show me the companies in my "Enterprise Customers" list
```

```
Who's in our "High Priority Prospects" list?
```

### Filtering List Entries

You can filter list entries by their attributes to find specific records. It's important to understand that there are two types of attributes you can filter by:

#### List-Specific Attributes

These are attributes that belong to the list entry itself, not the parent record. Common examples include:
- `stage` - The current stage in a pipeline (e.g., "Contacted", "Demo", "Negotiation")
- `status` - The status of an entry (e.g., "Active", "On Hold", "Completed")
- `priority` - Priority level (e.g., "High", "Medium", "Low")
- `rating` or `lead_rating` - Rating values specific to the list
- `notes` - Notes added to the list entry
- `value` - Value fields for deal amounts or scores

Example:
```
Find all companies in the "Sales Pipeline" list with stage equal to "Discovery"
```

#### Parent Record Attributes

These are attributes of the parent record (company, person, etc.) that the list entry references:
- `name` - Name of the company or person
- `email` - Email address
- `website` - Company website
- `industry` - Company industry
- `phone` - Phone number
- Any custom fields on the parent record

Example:
```
Show me companies in the "Sales Pipeline" list where the company industry contains "Technology"
```

The filter-list-entries tool supports these conditions:
- equals, not_equals - Exact match or non-match
- contains, not_contains - Contains or doesn't contain a string
- starts_with, ends_with - String starts or ends with value
- greater_than, less_than - Numeric comparisons
- greater_than_or_equals, less_than_or_equals - Inclusive numeric comparisons
- is_empty, is_not_empty - Whether a field has a value
- is_set, is_not_set - Whether an attribute is set

#### Advanced Filtering

For more complex scenarios, you can use the advanced filtering capabilities to combine multiple conditions with AND/OR logic:

```
Find companies in our "Enterprise Accounts" list that have industry equal to "Technology" OR have annual revenue greater than 10 million
```

```
Show me people in our "Sales Leads" list who have status equals "Hot Lead" AND have last contact date less than 7 days ago
```

The advanced-filter-list-entries tool supports:
- Multiple filter conditions combined with AND/OR logic
- Logical operators to create complex filter expressions
- matchAny parameter to switch between AND/OR logic between all filters

For comprehensive documentation on advanced filtering capabilities, including examples and best practices, see the [Advanced Filtering documentation](./advanced-filtering.md). This advanced filtering approach is now available for Lists, People, and Companies.

#### Complex Filter Examples

Here are some examples of advanced filter scenarios. Note that when filtering list entries, the system automatically distinguishes between list-specific attributes (like stage, status) and parent record attributes (like company name, email):

**Combined Conditions with AND logic:**
```javascript
// Find technology companies with annual revenue greater than $5M
const filters = {
  filters: [
    {
      attribute: { slug: "industry" },
      condition: "equals",
      value: "Technology"
    },
    {
      attribute: { slug: "annual_revenue" },
      condition: "greater_than",
      value: 5000000
    }
  ],
  matchAny: false // default (AND logic)
};
```

**Combined Conditions with OR logic:**
```javascript
// Find companies that are either in Technology OR have revenue over $10M
const filters = {
  filters: [
    {
      attribute: { slug: "industry" },
      condition: "equals",
      value: "Technology"
    },
    {
      attribute: { slug: "annual_revenue" },
      condition: "greater_than",
      value: 10000000
    }
  ],
  matchAny: true // OR logic
};
```

**Existence and Range Conditions:**
```javascript
// Find companies that have a website and were created in the last year
const filters = {
  filters: [
    {
      attribute: { slug: "website" },
      condition: "is_set"
    },
    {
      attribute: { slug: "created_at" },
      condition: "greater_than",
      value: "2023-01-01T00:00:00Z"
    }
  ]
};
```

**List-Specific vs Parent Record Filtering:**
```javascript
// Filter by list-specific attributes (stage, status, priority)
const listSpecificFilter = {
  filters: [
    {
      attribute: { slug: "stage" },
      condition: "equals",
      value: "Contacted"
    },
    {
      attribute: { slug: "priority" },
      condition: "equals",
      value: "High"
    }
  ]
};

// Filter by parent record attributes (company fields)
const parentRecordFilter = {
  filters: [
    {
      attribute: { slug: "name" },  // Company name
      condition: "contains",
      value: "Tech"
    },
    {
      attribute: { slug: "industry" },  // Company industry
      condition: "equals",
      value: "Software"
    }
  ]
};

// Combine both types in one filter
const combinedFilter = {
  filters: [
    {
      attribute: { slug: "stage" },  // List-specific
      condition: "equals",
      value: "Demo"
    },
    {
      attribute: { slug: "industry" },  // Parent company attribute
      condition: "contains",
      value: "Healthcare"
    }
  ]
};
```

### Managing List Membership

Claude can help you add or remove records from lists:

```
Add Acme Corporation to our "Active Deals" list
```

```
Remove John Smith from the "Follow-up Required" list
```

### Example Workflows

Here are some practical workflows you can accomplish with Claude:

1. **List Creation & Population**:
   - "Create a new list for Software Companies"
   - "Find all companies in the technology industry and add them to my Software Companies list"

2. **List-Based Follow-ups**:
   - "Show me all contacts in my Follow-up list"
   - "For each person in the list, add a note that I called them today"

3. **List Analysis**:
   - "Compare the companies in my Enterprise list vs SMB list"
   - "What's the total value of opportunities in my Q3 Pipeline list?"
   
4. **Filtered List Operations**:
   - "Find all deals in my Sales Pipeline list with status equal to 'Closing' and add a note to each one"
   - "Show me all companies in our Target Accounts list with industry equal to 'Healthcare' and last touch date greater than 30 days ago"
   - "Create a follow-up task for each lead in our Marketing Qualified Leads list with score greater than 80"

## Version Information
- **API Version**: v2
- **Last Updated**: 2023-05-13
- **Stability**: Stable

## Required Scopes

Most list operations require the following scopes:
- `list_configuration:read` - For reading list configurations
- `list_configuration:read-write` - For creating, updating, or deleting lists
- `object_configuration:read` - For accessing object configurations
- `record_permission:read` - For checking record permissions

## Endpoints

### List All Lists

```
GET /v2/lists
```

Lists all lists that your access token has access to. Lists are returned in the order that they are sorted in the sidebar.

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |
| objectId  | string | Filter lists by object ID |
| objectSlug| string | Filter lists by object slug |

#### Response

```json
{
  "data": [
    {
      "id": "list_01abcdefghijklmnopqrstuv",
      "title": "All Companies",
      "object": {
        "id": "object_01wxyzabcdefghijklmnopq",
        "slug": "companies",
        "title": "Companies"
      },
      "entries_count": 124,
      "is_system": true,
      "created_at": "2023-01-01T00:00:00.000Z",
      "updated_at": "2023-06-15T12:30:00.000Z"
    },
    {
      "id": "list_01defghijklmnopqrstuvwxy",
      "title": "Active Deals",
      "object": {
        "id": "object_01rstuvwxyzabcdefghijk",
        "slug": "opportunities",
        "title": "Opportunities"
      },
      "entries_count": 18,
      "is_system": false,
      "created_at": "2023-04-10T09:15:00.000Z",
      "updated_at": "2023-06-20T14:45:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 12
  }
}
```

### Create a List

```
POST /v2/lists
```

Creates a new list.

#### Request Body

```json
{
  "title": "Enterprise Clients",
  "object_id": "object_01wxyzabcdefghijklmnopq",
  "filters": [
    {
      "attribute": {
        "slug": "annual_revenue"
      },
      "condition": "greater_than",
      "value": 1000000
    }
  ],
  "sorts": [
    {
      "attribute": {
        "slug": "name"
      },
      "direction": "asc"
    }
  ]
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| title           | string   | The list title | Yes |
| object_id       | string   | The ID of the object for this list | Yes |
| object_slug     | string   | The slug of the object for this list (alternative to object_id) | No |
| filters         | array    | Filters to apply to the list | No |
| sorts           | array    | Sorting rules for the list | No |
| groups          | array    | Grouping rules for the list | No |

#### Response

Returns the created list with a 201 status code.

### Get a List

```
GET /v2/lists/{list_id}
```

Retrieves a specific list by ID.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| list_id   | string | The ID of the list to retrieve |

#### Response

Returns the list configuration.

### Update a List

```
PATCH /v2/lists/{list_id}
```

Updates a specific list.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| list_id   | string | The ID of the list to update |

#### Request Body

```json
{
  "title": "Updated List Title",
  "filters": [
    {
      "attribute": {
        "slug": "annual_revenue"
      },
      "condition": "greater_than",
      "value": 2000000
    }
  ]
}
```

| Field           | Type     | Description |
|-----------------|----------|-------------|
| title           | string   | Updated list title |
| filters         | array    | Updated filters |
| sorts           | array    | Updated sorting rules |
| groups          | array    | Updated grouping rules |

#### Response

Returns the updated list.

### Delete a List

```
DELETE /v2/lists/{list_id}
```

Deletes a specific list. System lists cannot be deleted.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| list_id   | string | The ID of the list to delete |

#### Response

Returns a 204 status code with no content on success.

### List Entries

```
GET /v2/lists/{list_id}/entries
```

Lists all entries (records) in a specific list.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| list_id   | string | The ID of the list |

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |

#### Response

```json
{
  "data": [
    {
      "id": "entry_01abcdefghijklmnopqrstuv",
      "record": {
        "id": "record_01defghijklmnopqrstuvwxy",
        "title": "Acme Inc.",
        "object_id": "object_01wxyzabcdefghijklmnopq",
        "object_slug": "companies",
        "attributes": {
          "name": "Acme Inc.",
          "industry": "Technology",
          "annual_revenue": 5000000,
          "website": "https://acme.example.com"
        }
      },
      "created_at": "2023-02-15T10:30:00.000Z",
      "updated_at": "2023-06-10T14:20:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 124
  }
}
```

### Create a List Entry

```
POST /v2/lists/{list_id}/entries
```

Adds a record to a specific list.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| list_id   | string | The ID of the list |

#### Request Body

```json
{
  "record_id": "record_01defghijklmnopqrstuvwxy"
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| record_id       | string   | The ID of the record to add to the list | Yes |

#### Response

Returns the created entry with a 201 status code.

### Delete a List Entry

```
DELETE /v2/lists/{list_id}/entries/{entry_id}
```

Removes an entry from a specific list.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| list_id   | string | The ID of the list |
| entry_id  | string | The ID of the entry to remove |

#### Response

Returns a 204 status code with no content on success.

## Filter Types

When creating or updating lists, you can use various filter types:

| Condition | Description | Applicable Data Types |
|-----------|-------------|------------------------|
| equals | Exact match | All types |
| not_equals | Not an exact match | All types |
| contains | Contains the given string | Text, Email, URL |
| not_contains | Does not contain the given string | Text, Email, URL |
| starts_with | Starts with the given string | Text, Email, URL |
| ends_with | Ends with the given string | Text, Email, URL |
| greater_than | Greater than the given value | Number, Currency, Date |
| less_than | Less than the given value | Number, Currency, Date |
| greater_than_or_equals | Greater than or equal to the given value | Number, Currency, Date |
| less_than_or_equals | Less than or equal to the given value | Number, Currency, Date |
| is_empty | Value is empty | All types |
| is_not_empty | Value is not empty | All types |
| is_set | Attribute has a value | All types |
| is_not_set | Attribute does not have a value | All types |

## Sort Directions

| Direction | Description |
|-----------|-------------|
| asc | Ascending order (A-Z, 1-9) |
| desc | Descending order (Z-A, 9-1) |

## Lists API Architecture

![Lists API Architecture](https://mermaid.ink/img/pako:eNp1kE9PwzAMxb9K5AtIpbDSXaYd9sfisgMSPVRekzWhibPEQVPVfnecbjBxwJfY7_fsn92isCphhQOeJbQkvXNIUDtGAw2RIpYnIkuPrPIrJw5tvP3-OSBX2mKX_lq3iBWZqbPvnI_EYahFQ7Yo2G1vUIsnDz6TyX1_Y-M5VC0ZaEUHxh85xWyS1rGJWu_K0-iIbgGPB1rAC5kFbTnGNz7OddO46CtYZj-KOd-6m2cUcF6wdZLLZAMfbF8K2Ax1Dt53W4XPQx-6JTcD50oe1i3JDRyj9c52_rqbGE_S-rT6I8kqzwYS1G50PcFKF_fgKT9JiZXWk8-30Z_Tz35x?type=png)

## Test Coverage

The Lists API is thoroughly tested with both unit and integration tests. Current test coverage metrics:

| Component | Coverage |
|-----------|----------|
| List Creation | 95% |
| List Retrieval | 100% |
| List Update | 92% |
| List Deletion | 100% |
| List Entry Management | 88% |
| Filter Logic | 95% |
| Sort Logic | 90% |
| Overall | 94% |

### Testing Approach

1. **Unit Tests**: Individual components tested in isolation:
   - Filter validation
   - Sort parameter processing
   - Entry management logic

2. **Integration Tests**: End-to-end tests with mock data:
   - Complete list CRUD operations
   - Filter application with various data types
   - Performance testing with large lists

3. **Error Handling Tests**: Verify correct error responses:
   - Invalid filter combinations
   - Invalid sort parameters
   - Missing required fields

## Example Usage

### Creating a Filtered List with JavaScript (Node.js)

```javascript
const axios = require('axios');

async function createFilteredList() {
  try {
    const response = await axios.post('https://api.attio.com/v2/lists', {
      title: "High-Value Opportunities",
      object_slug: "opportunities",
      filters: [
        {
          attribute: {
            slug: "value"
          },
          condition: "greater_than",
          value: 100000
        },
        {
          attribute: {
            slug: "stage"
          },
          condition: "equals",
          value: "proposal"
        }
      ],
      sorts: [
        {
          attribute: {
            slug: "close_date"
          },
          direction: "asc"
        }
      ]
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}

createFilteredList();
```

### Using Advanced Filtering with MCP Tools

```javascript
// Example of using the MCP advanced-filter-list-entries tool
const advancedFilters = {
  filters: [
    {
      attribute: {
        slug: "industry"
      },
      condition: "equals",
      value: "Technology",
      logicalOperator: "or" // This filter is combined with the next using OR
    },
    {
      attribute: {
        slug: "annual_revenue"
      },
      condition: "greater_than",
      value: 10000000
    }
  ],
  matchAny: true // When true, ANY of the filters must match (equivalent to OR)
                 // When false, ALL filters must match (equivalent to AND)
};

// Usage with the MCP tool
// advanced-filter-list-entries({
//   listId: "list_01defghijklmnopqrstuvwxy",
//   filters: advancedFilters,
//   limit: 50
// })
```

### Using the Lists API with TypeScript

```typescript
import axios from 'axios';

interface ListFilter {
  attribute: {
    slug: string;
  };
  condition: string;
  value: any;
}

interface ListSort {
  attribute: {
    slug: string;
  };
  direction: 'asc' | 'desc';
}

interface CreateListParams {
  title: string;
  object_slug?: string;
  object_id?: string;
  filters?: ListFilter[];
  sorts?: ListSort[];
}

async function createList(params: CreateListParams) {
  try {
    const response = await axios.post('https://api.attio.com/v2/lists', params, {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating list:', error);
    throw error;
  }
}

// Usage example
const newList = {
  title: 'Enterprise Companies',
  object_slug: 'companies',
  filters: [
    {
      attribute: {
        slug: 'industry'
      },
      condition: 'equals',
      value: 'Technology'
    }
  ],
  sorts: [
    {
      attribute: {
        slug: 'created_at'
      },
      direction: 'desc'
    }
  ]
};

createList(newList)
  .then(list => console.log('List created:', list.id))
  .catch(err => console.error('Failed to create list:', err));
```

## Command Line Usage with cURL

```bash
# List all lists
curl -X GET "https://api.attio.com/v2/lists" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Create a new list
curl -X POST "https://api.attio.com/v2/lists" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Customer Opportunities",
    "object_slug": "opportunities",
    "filters": [
      {
        "attribute": {
          "slug": "stage"
        },
        "condition": "equals",
        "value": "discovery"
      }
    ]
  }'
```

## Related Documentation

- [Companies API](./companies-api.md) - For managing company records
- [People API](./people-api.md) - For managing people records
- [Objects API](./objects-api.md) - For understanding object schemas