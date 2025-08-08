# Attio People API

The People API allows you to manage person records in Attio. Person records represent individual contacts and can be linked to companies, opportunities, and other objects.

## Required Scopes

Most people operations require the following scopes:
- `record:read` - For reading people records
- `record:read-write` - For creating, updating, or deleting people records
- `object_configuration:read` - For accessing object configurations
- `record_permission:read` - For checking record permissions

## Endpoints

### List People

```
GET /v2/objects/people/records
```

Lists all people records.

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |
| query     | string | Search query to filter people by name, email, etc. |
| attributes| array  | List of attribute slugs to include in the response |
| sort      | string | Attribute slug to sort by |
| direction | string | Sort direction (asc or desc) |

#### Response

```json
{
  "data": [
    {
      "id": "record_01abcdefghijklmnopqrstuv",
      "title": "Jane Smith",
      "object_id": "object_01wxyzabcdefghijklmnopq",
      "object_slug": "people",
      "attributes": {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1 (555) 123-4567",
        "job_title": "CEO",
        "company": {
          "record_id": "record_01defghijklmnopqrstuvwxy"
        },
        "linkedin_url": "https://linkedin.com/in/janesmith",
        "last_contacted": "2023-06-15T00:00:00.000Z"
      },
      "created_at": "2023-02-15T10:30:00.000Z",
      "updated_at": "2023-06-10T14:20:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 78
  }
}
```

### Search People

```
POST /v2/objects/people/records/query
```

Searches for people records with advanced filtering options.

#### Request Body

```json
{
  "filter": {
    "name": { "$contains": "Smith" },
    "company.name": { "$contains": "Acme" }
  },
  "limit": 20,
  "sorts": [
    { "attribute": "last_interaction", "field": "interacted_at", "direction": "desc" }
  ]
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| filter          | object   | Filter criteria for the search | No |
| limit           | number   | Maximum number of results to return (default 25, max 100) | No |
| offset          | number   | Number of records to skip (for pagination) | No |
| sorts           | array    | Sorting criteria for the results | No |

#### Response

Returns an array of people records matching the filter criteria.

### Create a Person

```
POST /v2/objects/people/records
```

Creates a new person record.

#### Request Body

```json
{
  "attributes": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1 (555) 987-6543",
    "job_title": "CTO",
    "company": {
      "record_id": "record_01defghijklmnopqrstuvwxy"
    },
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "tags": ["prospect", "technical"]
  }
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| attributes      | object   | The person attributes as key-value pairs | Yes |

#### Response

Returns the created person record with a 201 status code.

### Get a Person

```
GET /v2/objects/people/records/{record_id}
```

Retrieves a specific person record.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| record_id | string | The ID of the person record to retrieve |

#### Query Parameters

| Parameter  | Type   | Description |
|------------|--------|-------------|
| attributes | array  | List of attribute slugs to include in the response |

#### Response

Returns the person record object.

### Update a Person

```
PATCH /v2/objects/people/records/{record_id}
```

Updates a specific person record.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| record_id | string | The ID of the person record to update |

#### Request Body

```json
{
  "attributes": {
    "job_title": "VP of Engineering",
    "phone": "+1 (555) 123-8765",
    "tags": ["customer", "technical"]
  }
}
```

| Field           | Type     | Description |
|-----------------|----------|-------------|
| attributes      | object   | The person attributes to update as key-value pairs |

#### Response

Returns the updated person record.

### Delete a Person

```
DELETE /v2/objects/people/records/{record_id}
```

Deletes a specific person record.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| record_id | string | The ID of the person record to delete |

#### Response

Returns a 204 status code with no content on success.

### Batch Create People

```
POST /v2/objects/people/records/batch
```

Creates multiple person records in a single request.

#### Request Body

```json
{
  "records": [
    {
      "attributes": {
        "name": "Alice Johnson",
        "email": "alice@example.com",
        "job_title": "Marketing Director"
      }
    },
    {
      "attributes": {
        "name": "Bob Williams",
        "email": "bob@example.com",
        "job_title": "Sales Manager"
      }
    }
  ]
}
```

| Field                | Type     | Description | Required |
|----------------------|----------|-------------|----------|
| records              | array    | Array of person record objects to create | Yes |
| records[].attributes | object   | The person attributes as key-value pairs | Yes for each record |

#### Response

Returns an array of created person records with a 201 status code.

### Batch Update People

```
PATCH /v2/objects/people/records/batch
```

Updates multiple person records in a single request.

#### Request Body

```json
{
  "records": [
    {
      "id": "record_01abcdefghijklmnopqrstuv",
      "attributes": {
        "job_title": "Technical Director",
        "tags": ["customer"]
      }
    },
    {
      "id": "record_01defghijklmnopqrstuvwxy",
      "attributes": {
        "job_title": "Account Executive",
        "tags": ["prospect"]
      }
    }
  ]
}
```

| Field             | Type     | Description | Required |
|-------------------|----------|-------------|----------|
| records           | array    | Array of person record objects to update | Yes |
| records[].id      | string   | The ID of the person record to update | Yes for each record |
| records[].attributes | object | The attributes to update | Yes for each record |

#### Response

Returns an array of updated person records.

## Person Attributes

The People object in Attio typically includes the following standard attributes:

| Attribute       | Type       | Description |
|-----------------|------------|-------------|
| name            | text       | The person's full name |
| email           | email      | The person's email address |
| phone           | phone      | The person's phone number |
| job_title       | text       | The person's job title |
| company         | link       | Link to a company record |
| linkedin_url    | url        | The person's LinkedIn profile URL |
| twitter_url     | url        | The person's Twitter profile URL |
| tags            | multi_select | Tags associated with the person |
| last_contacted  | date       | Date when the person was last contacted |
| notes           | text       | Additional notes about the person |

Custom attributes may also be available depending on your workspace configuration.

## Related Endpoints

### Get Person's Company

```
GET /v2/objects/people/records/{record_id}/company
```

Retrieves the company associated with a specific person.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| record_id | string | The ID of the person record |

#### Response

Returns the company record linked to the person.

### Get Person's Activities

```
GET /v2/objects/people/records/{record_id}/activities
```

Retrieves a list of activities (interactions, tasks, notes) associated with a specific person.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| record_id | string | The ID of the person record |

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |
| type      | string | Filter by activity type (e.g., "note", "task", "email") |

#### Response

Returns a list of activities associated with the person.

## Example Usage

### Creating a Person with JavaScript (Node.js)

```javascript
const axios = require('axios');

async function createPerson() {
  try {
    const response = await axios.post('https://api.attio.com/v2/objects/people/records', {
      attributes: {
        name: "David Johnson",
        email: "david@example.com",
        phone: "+1 (555) 456-7890",
        job_title: "Product Manager",
        company: {
          record_id: "record_01defghijklmnopqrstuvwxy"
        },
        tags: ["prospect", "product"]
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

createPerson();
```

### Searching for People with cURL

```bash
curl -X POST \
  https://api.attio.com/v2/objects/people/records/query \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "filter": {
      "job_title": { "$contains": "Director" }
    },
    "limit": 10
  }'
```