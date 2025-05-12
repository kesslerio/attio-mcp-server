# Attio Lists API

The Lists API allows you to manage lists within Attio. Lists provide organized views of records, with optional filtering, sorting, and grouping.

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