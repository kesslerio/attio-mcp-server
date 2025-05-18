# Attio API Reference Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Base URL](#api-base-url)
4. [Core Concepts](#core-concepts)
5. [Objects API](#objects-api)
6. [Records API](#records-api)
7. [Lists API](#lists-api)
8. [Attributes API](#attributes-api)
9. [Notes API](#notes-api)
10. [Tasks API](#tasks-api)
11. [Webhooks API](#webhooks-api)
12. [Standard Objects](#standard-objects)
13. [Filtering](#filtering)
14. [Pagination](#pagination)
15. [Error Handling](#error-handling)
16. [Rate Limiting](#rate-limiting)
17. [Value Formats](#value-formats)

## Overview

The Attio API provides programmatic access to your Attio data, allowing you to integrate Attio with other tools and build custom workflows. The API follows RESTful principles and uses JSON for request and response payloads.

## Authentication

The Attio API uses Bearer token authentication. You must include your API token in the Authorization header of every request.

### Authentication Methods

Attio supports two authentication methods:

1. **API Keys (Personal Access Tokens)**
   - Created directly in the Attio settings
   - Used for personal integrations and development
   - Never expire (unless manually revoked)
   
2. **OAuth 2.0 Access Tokens**
   - Obtained through the OAuth 2.0 authorization flow
   - Used for production applications and third-party integrations
   - May have expiration dates

### Request Headers

All API requests must include the following header:

```bash
Authorization: Bearer YOUR_API_TOKEN
```

Example cURL request:
```bash
curl --request GET \
  --url https://api.attio.com/v2/objects \
  --header 'Authorization: Bearer YOUR_API_TOKEN' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json'
```

### Required Scopes

Different endpoints require different permission scopes:

- `record_permission:read` - Read access to records
- `record_permission:read-write` - Read/write access to records  
- `object_configuration:read` - Read object configurations
- `object_configuration:read-write` - Read/write object configurations
- `list_entry:read` - Read list entries
- `list_entry:read-write` - Read/write list entries
- `webhook:read` - Read webhook configurations
- `webhook:read-write` - Create/modify webhooks
- `note:read` - Read notes
- `note:read-write` - Create/modify notes
- `task:read` - Read tasks
- `task:read-write` - Create/modify tasks

### OAuth 2.0 Flow

For production applications, use OAuth 2.0:

1. **Authorization Request**
   ```
   GET https://app.attio.com/authorize?
     response_type=code&
     client_id=YOUR_CLIENT_ID&
     redirect_uri=YOUR_REDIRECT_URI&
     state=RANDOM_STATE_VALUE
   ```

2. **Token Exchange**
   ```
   POST https://app.attio.com/oauth/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=authorization_code&
   code=AUTHORIZATION_CODE&
   redirect_uri=YOUR_REDIRECT_URI&
   client_id=YOUR_CLIENT_ID&
   client_secret=YOUR_CLIENT_SECRET
   ```

3. **Using the Access Token**
   ```bash
   curl --request GET \
     --url https://api.attio.com/v2/objects \
     --header 'Authorization: Bearer ACCESS_TOKEN'
   ```

### Security Best Practices

1. **Never expose your API tokens** in client-side code or public repositories
2. **Use environment variables** to store tokens securely
3. **Rotate tokens regularly** for production applications
4. **Use OAuth 2.0** for third-party integrations
5. **Implement proper error handling** for authentication failures
6. **Store OAuth tokens encrypted** if persisting them

## API Base URL

All API endpoints are relative to:
```
https://api.attio.com/v2
```

## Core Concepts

### Objects and Lists
- **Objects**: The core data structures in Attio (e.g., Companies, People, Deals)
- **Lists**: Collections of records from a specific object type
- **Records**: Individual items within an object
- **Attributes**: Properties or fields on records

### IDs and Slugs
- Attio uses both IDs and slugs to identify resources
- IDs are unique identifiers (e.g., `97052eb9-e65e-443f-a297-f2d9a4a7f795`)
- Slugs are human-readable identifiers (e.g., `companies`, `people`)

### Actors
- Represents the user or system performing an action
- Used for audit trails and permissions

## Objects API

### List Objects
```http
GET /v2/objects
```

Lists all system-defined and user-defined objects in your workspace.

**Required Scopes**: `object_configuration:read`

**Response:**
```json
{
  "data": [
    {
      "id": {
        "workspace_id": "14beef7a-99f7-4534-a87e-70b564330a4c",
        "object_id": "97052eb9-e65e-443f-a297-f2d9a4a7f795"
      },
      "api_slug": "people",
      "singular_noun": "Person",
      "plural_noun": "People",
      "created_at": "2022-11-21T13:22:49.061281000Z"
    }
  ]
}
```

### Create an Object
```http
POST /v2/objects
```

Creates a new custom object.

**Required Scopes**: `object_configuration:read-write`

**Request Body:**
```json
{
  "singular_noun": "Property",
  "plural_noun": "Properties",
  "api_slug": "properties"
}
```

### Get an Object
```http
GET /v2/objects/{object}
```

Gets a specific object by ID or slug.

**Required Scopes**: `object_configuration:read`

### Update an Object
```http
PUT /v2/objects/{object}
```

Updates an existing object.

**Required Scopes**: `object_configuration:read-write`

## Records API

### List Records (Query)
```http
POST /v2/objects/{object}/records/query
```

Lists records with filtering and sorting options.

**Required Scopes**: `record_permission:read`, `object_configuration:read`

**Request Body:**
```json
{
  "filter": {
    "name": "Ada Lovelace"
  },
  "sorts": [
    {
      "direction": "asc",
      "attribute": "name",
      "field": "last_name"
    }
  ],
  "limit": 500,
  "offset": 0
}
```

**Response:**
```json
{
  "data": [
    {
      "id": {
        "record_id": "rec_123"
      },
      "values": {
        "name": {
          "first_name": "Ada",
          "last_name": "Lovelace"
        },
        "email_addresses": [
          {
            "email_address": "ada@example.com",
            "primary": true
          }
        ]
      },
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z"
    }
  ],
  "meta": {
    "total_count": 100,
    "limit": 500,
    "offset": 0
  }
}
```

### Assert a Record
```http
PUT /v2/objects/{object}/records
```

Creates or updates a record based on matching criteria.

**Required Scopes**: `record_permission:read-write`, `object_configuration:read`

**Request Body:**
```json
{
  "data": {
    "matching_attribute": "domain",
    "values": {
      "domain": "acme.com",
      "name": "Acme Corporation",
      "industry": "Software"
    }
  }
}
```

### Create a Record
```http
POST /v2/objects/{object}/records
```

Creates a new record. Throws error on conflicts with unique attributes.

**Required Scopes**: `record_permission:read-write`, `object_configuration:read`

**Request Body:**
```json
{
  "data": {
    "values": {
      "name": "John Doe",
      "email_addresses": [
        {
          "email_address": "john@example.com"
        }
      ],
      "company": {
        "record_id": "rec_company_123"
      }
    }
  }
}
```

### Get a Record
```http
GET /v2/objects/{object}/records/{record_id}
```

Gets a specific record by ID.

**Required Scopes**: `record_permission:read`, `object_configuration:read`

### Update a Record
```http
PATCH /v2/objects/{object}/records/{record_id}
```

Updates an existing record.

**Required Scopes**: `record_permission:read-write`, `object_configuration:read`

**Request Body:**
```json
{
  "data": {
    "values": {
      "industry": "Technology",
      "employee_count": 500
    }
  }
}
```

### Delete a Record
```http
DELETE /v2/objects/{object}/records/{record_id}
```

Deletes a specific record.

**Required Scopes**: `record_permission:read-write`, `object_configuration:read`

## Lists API

### List Lists
```http
GET /v2/lists
```

Lists all lists in your workspace.

**Response:**
```json
{
  "data": [
    {
      "id": {
        "list_id": "list_123"
      },
      "name": "Key Accounts",
      "api_slug": "key-accounts",
      "object_id": {
        "object_id": "companies"
      },
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Create a List
```http
POST /v2/lists
```

Creates a new list.

**Request Body:**
```json
{
  "data": {
    "name": "Enterprise Customers",
    "api_slug": "enterprise-customers",
    "object_id": {
      "object_id": "companies"
    }
  }
}
```

### Get a List
```http
GET /v2/lists/{list_id}
```

Gets a specific list by ID.

### List Entries
```http
GET /v2/lists/{list_id}/entries
```

Lists all entries in a specific list.

**Query Parameters:**
- `limit`: Number of entries to return
- `offset`: Number of entries to skip

### Create an Entry
```http
POST /v2/lists/{list_id}/entries
```

Adds a record to a list.

**Request Body:**
```json
{
  "data": {
    "record_id": {
      "record_id": "rec_123"
    }
  }
}
```

### Assert an Entry
```http
PUT /v2/lists/{list_id}/entries
```

Adds a record to a list, creating the record if it doesn't exist.

**Request Body:**
```json
{
  "data": {
    "matching_attribute": "domain",
    "values": {
      "domain": "newcompany.com",
      "name": "New Company Inc"
    }
  }
}
```

## Attributes API

### List Attributes
```http
GET /v2/objects/{object}/attributes
```

Lists all attributes for a specific object.

**Required Scopes**: `object_configuration:read`

**Response:**
```json
{
  "data": [
    {
      "id": {
        "attribute_id": "attr_123"
      },
      "name": "Industry",
      "api_slug": "industry",
      "type": "text",
      "is_required": false,
      "is_unique": false,
      "is_multiselect": false
    }
  ]
}
```

### Create an Attribute
```http
POST /v2/objects/{object}/attributes
```

Creates a new attribute.

**Required Scopes**: `object_configuration:read-write`

**Request Body:**
```json
{
  "data": {
    "name": "Industry",
    "api_slug": "industry",
    "type": "text",
    "is_required": false,
    "is_unique": false
  }
}
```

### Get an Attribute
```http
GET /v2/attributes/{attribute_id}
```

Gets a specific attribute.

**Required Scopes**: `object_configuration:read`

## Notes API

### List Notes
```http
GET /v2/notes
```

Lists all notes.

**Query Parameters:**
- `parent_object`: Filter by parent object (e.g., `companies`)
- `parent_record_id`: Filter by parent record ID

### Create a Note
```http
POST /v2/notes
```

Creates a new note.

**Request Body:**
```json
{
  "data": {
    "parent_object": "companies",
    "parent_record_id": {
      "record_id": "rec_123"
    },
    "title": "Meeting Notes",
    "content": "Discussed Q4 strategy..."
  }
}
```

## Tasks API

### List Tasks
```http
GET /v2/tasks
```

Lists all tasks.

**Query Parameters:**
- `assignee_id`: Filter by assignee
- `status`: Filter by status (`open`, `completed`)
- `due_at`: Filter by due date

### Create a Task
```http
POST /v2/tasks
```

Creates a new task.

**Request Body:**
```json
{
  "data": {
    "content": "Follow up with customer",
    "due_at": "2024-01-15T09:00:00Z",
    "assignee_id": {
      "user_id": "usr_123"
    },
    "parent_object": "companies",
    "parent_record_id": {
      "record_id": "rec_123"
    }
  }
}
```

## Webhooks API

### List Webhooks
```http
GET /v2/webhooks
```

Lists all webhooks.

### Create a Webhook
```http
POST /v2/webhooks
```

Creates a new webhook.

**Request Body:**
```json
{
  "data": {
    "url": "https://example.com/webhook",
    "events": ["record.created", "record.updated"],
    "object": "companies",
    "secret": "your-webhook-secret"
  }
}
```

## Standard Objects

Attio provides several standard objects:

### Companies
- API slug: `companies`
- Standard attributes: 
  - `name`: Company name
  - `domain`: Primary domain
  - `domains`: All associated domains
  - `description`: Company description
  - `employee_count`: Number of employees
  - `industry`: Industry classification

### People
- API slug: `people`
- Standard attributes:
  - `name`: Full name object with `first_name`, `last_name`
  - `email_addresses`: Array of email objects
  - `phone_numbers`: Array of phone number objects
  - `company`: Reference to company record
  - `job_title`: Current job title

### Deals
- API slug: `deals`
- Standard attributes:
  - `name`: Deal name
  - `value`: Deal value object with `amount` and `currency`
  - `stage`: Current deal stage
  - `close_date`: Expected close date
  - `probability`: Win probability percentage

### Users
- API slug: `users`
- Represents workspace users

### Workspaces
- API slug: `workspaces`
- Represents Attio workspaces

## Filtering

The API supports powerful filtering capabilities:

### Basic Filtering
```json
{
  "filter": {
    "domain": "example.com"
  }
}
```

### Complex Filtering
```json
{
  "filter": {
    "$and": [
      {
        "domain": {
          "$eq": "example.com"
        }
      },
      {
        "created_at": {
          "$gte": "2024-01-01"
        }
      }
    ]
  }
}
```

### Filter Operators
- `$eq`: Equals
- `$ne`: Not equals
- `$contains`: Contains substring
- `$starts_with`: Starts with
- `$ends_with`: Ends with
- `$gt`: Greater than
- `$gte`: Greater than or equal
- `$lt`: Less than
- `$lte`: Less than or equal
- `$in`: In array
- `$nin`: Not in array
- `$exists`: Field exists
- `$not_exists`: Field doesn't exist

### Relationship Filtering
```json
{
  "filter": {
    "company.industry": "Software",
    "company.employee_count": {
      "$gte": 100
    }
  }
}
```

## Pagination

Use limit and offset for pagination:

```http
GET /v2/objects/companies/records?limit=50&offset=100
```

The response includes metadata:
```json
{
  "meta": {
    "total_count": 500,
    "limit": 50,
    "offset": 100
  }
}
```

## Error Handling

The API returns standard HTTP status codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication failed
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Error Response Format:
```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid field value",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:
- Rate limits are applied per API key
- Current limits: 10 requests per second, 600 requests per minute
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

When rate limited, you'll receive a `429 Too Many Requests` response.

## Value Formats

Different attribute types require specific value formats:

### Text
```json
{
  "industry": "Software"
}
```

### Number
```json
{
  "employee_count": 150
}
```

### Currency
```json
{
  "deal_value": {
    "amount": 50000,
    "currency": "USD"
  }
}
```

### Date/Time
```json
{
  "founded_date": "2020-01-15",
  "last_contact": "2024-01-15T14:30:00Z"
}
```

### Email
```json
{
  "email_addresses": [
    {
      "email_address": "john@example.com",
      "primary": true
    }
  ]
}
```

### Phone Number
```json
{
  "phone_numbers": [
    {
      "phone_number": "+14155552671",
      "country_code": "US",
      "type": "mobile"
    }
  ]
}
```

### Reference (Relationship)
```json
{
  "company": {
    "record_id": "rec_123"
  }
}
```

### Multi-select
```json
{
  "tags": ["enterprise", "high-priority", "renewal"]
}
```

## Best Practices

1. **Use batch operations** when possible to reduce API calls
2. **Implement exponential backoff** for rate limit handling
3. **Cache responses** when appropriate
4. **Use webhooks** for real-time updates instead of polling
5. **Include idempotency keys** for write operations
6. **Use field selection** to minimize response payload size
7. **Handle pagination properly** for large datasets
8. **Validate data before sending** to avoid validation errors
9. **Use appropriate scopes** for security
10. **Monitor rate limit headers** to avoid hitting limits

## API SDKs

Official SDKs are available for:
- JavaScript/TypeScript
- Python  
- Ruby
- Go

## Additional Resources

- [Attio Developer Documentation](https://docs.attio.com)
- [API Authentication Guide](https://docs.attio.com/docs/authentication)
- [Rate Limiting Guide](https://docs.attio.com/docs/rate-limiting)
- [Pagination Guide](https://docs.attio.com/docs/pagination)
- [Filter Reference](https://docs.attio.com/docs/filtering-and-sorting)
- [Webhook Guide](https://docs.attio.com/docs/webhooks)
- [API Changelog](https://docs.attio.com/changelog)
- [Support](https://support.attio.com)