# Attio Records API

The Records API allows you to create, read, update, and delete records in Attio. Records are instances of objects with specific attribute values.

## Required Scopes

Most record operations require the following scopes:
- `record:read` - For reading records
- `record:read-write` - For creating, updating, or deleting records
- `object_configuration:read` - For accessing object configurations
- `record_permission:read` - For checking record permissions

## Endpoints

### List Records

```
GET /v2/objects/{object_id}/records
```

or

```
GET /v2/objects/{object_slug}/records
```

Lists records for a specific object.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |
| query     | string | Search query to filter records |
| attributes| array  | List of attribute slugs to include in the response |
| sort      | string | Attribute slug to sort by |
| direction | string | Sort direction (asc or desc) |

#### Response

```json
{
  "data": [
    {
      "id": "record_01abcdefghijklmnopqrstuv",
      "title": "Acme Inc.",
      "object_id": "object_01wxyzabcdefghijklmnopq",
      "object_slug": "companies",
      "attributes": {
        "name": "Acme Inc.",
        "industry": "Technology",
        "annual_revenue": 5000000,
        "website": "https://acme.example.com",
        "founded_date": "2005-06-15T00:00:00.000Z",
        "employees_count": 250,
        "hq_location": {
          "street": "123 Main St",
          "city": "San Francisco",
          "state": "CA",
          "postal_code": "94105",
          "country": "USA"
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

### Create a Record

```
POST /v2/objects/{object_id}/records
```

or

```
POST /v2/objects/{object_slug}/records
```

Creates a new record for a specific object.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |

#### Request Body

```json
{
  "attributes": {
    "name": "New Company Inc.",
    "industry": "Healthcare",
    "annual_revenue": 2500000,
    "website": "https://newcompany.example.com",
    "founded_date": "2020-01-10T00:00:00.000Z",
    "employees_count": 75,
    "hq_location": {
      "street": "456 Market St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "USA"
    }
  }
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| attributes      | object   | The record attributes as key-value pairs | Yes |

#### Response

Returns the created record with a 201 status code.

### Get a Record

```
GET /v2/objects/{object_id}/records/{record_id}
```

or

```
GET /v2/objects/{object_slug}/records/{record_id}
```

Retrieves a specific record.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |
| record_id    | string | The ID of the record to retrieve |

#### Query Parameters

| Parameter  | Type   | Description |
|------------|--------|-------------|
| attributes | array  | List of attribute slugs to include in the response |

#### Response

Returns the record object.

### Update a Record

```
PATCH /v2/objects/{object_id}/records/{record_id}
```

or

```
PATCH /v2/objects/{object_slug}/records/{record_id}
```

Updates a specific record.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |
| record_id    | string | The ID of the record to update |

#### Request Body

```json
{
  "attributes": {
    "name": "Updated Company Name",
    "annual_revenue": 3000000,
    "employees_count": 100
  }
}
```

| Field           | Type     | Description |
|-----------------|----------|-------------|
| attributes      | object   | The record attributes to update as key-value pairs |

#### Response

Returns the updated record.

### Delete a Record

```
DELETE /v2/objects/{object_id}/records/{record_id}
```

or

```
DELETE /v2/objects/{object_slug}/records/{record_id}
```

Deletes a specific record.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |
| record_id    | string | The ID of the record to delete |

#### Response

Returns a 204 status code with no content on success.

### Batch Create Records

```
POST /v2/objects/{object_id}/records/batch
```

or

```
POST /v2/objects/{object_slug}/records/batch
```

Creates multiple records in a single request.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |

#### Request Body

```json
{
  "records": [
    {
      "attributes": {
        "name": "Company A",
        "industry": "Finance",
        "annual_revenue": 1500000
      }
    },
    {
      "attributes": {
        "name": "Company B",
        "industry": "Retail",
        "annual_revenue": 750000
      }
    }
  ]
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| records         | array    | Array of record objects to create | Yes |
| records[].attributes | object | The record attributes as key-value pairs | Yes for each record |

#### Response

Returns an array of created records with a 201 status code.

### Batch Update Records

```
PATCH /v2/objects/{object_id}/records/batch
```

or

```
PATCH /v2/objects/{object_slug}/records/batch
```

Updates multiple records in a single request.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |

#### Request Body

```json
{
  "records": [
    {
      "id": "record_01abcdefghijklmnopqrstuv",
      "attributes": {
        "industry": "Technology Services",
        "status": "active"
      }
    },
    {
      "id": "record_01defghijklmnopqrstuvwxy",
      "attributes": {
        "status": "inactive"
      }
    }
  ]
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| records         | array    | Array of record objects to update | Yes |
| records[].id    | string   | The ID of the record to update | Yes for each record |
| records[].attributes | object | The record attributes to update | Yes for each record |

#### Response

Returns an array of updated records.

## Record Attributes

When creating or updating records, you must provide attributes according to the object's schema. Here are examples of how to format different attribute types:

### Text, Number, Boolean Attributes

```json
{
  "attributes": {
    "name": "Acme Inc.",
    "employees_count": 250,
    "is_active": true
  }
}
```

### Date Attributes

Date attributes should be formatted in ISO 8601 format:

```json
{
  "attributes": {
    "founded_date": "2005-06-15T00:00:00.000Z"
  }
}
```

### Select and Multi-Select Attributes

Select attributes should use the option value:

```json
{
  "attributes": {
    "industry": "technology",
    "tags": ["enterprise", "saas", "b2b"]
  }
}
```

### Currency Attributes

Currency attributes include the amount and currency code:

```json
{
  "attributes": {
    "annual_revenue": {
      "amount": 5000000,
      "currency": "USD"
    }
  }
}
```

Or the simplified format:

```json
{
  "attributes": {
    "annual_revenue": 5000000
  }
}
```

### Address Attributes

Address attributes are structured objects:

```json
{
  "attributes": {
    "hq_location": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94105",
      "country": "USA"
    }
  }
}
```

### Link Attributes

Link attributes reference other records:

```json
{
  "attributes": {
    "primary_contact": {
      "record_id": "record_01abcdefghijklmnopqrstuv"
    }
  }
}
```

## Example Usage

### Creating a Record with JavaScript (Node.js)

```javascript
const axios = require('axios');

async function createCompanyRecord() {
  try {
    const response = await axios.post('https://api.attio.com/v2/objects/companies/records', {
      attributes: {
        name: "Example Corp",
        industry: "Software",
        annual_revenue: 3500000,
        website: "https://example.corp",
        founded_date: new Date("2018-03-15").toISOString(),
        employees_count: 120,
        status: "active"
      }
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

createCompanyRecord();
```

### Searching Records with cURL

```bash
curl -X GET \
  'https://api.attio.com/v2/objects/companies/records?query=technology&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```