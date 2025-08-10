# Attio Objects API

The Objects API allows you to manage the structure and configuration of your data model in Attio. Objects define the schema of your records and can be both standard (built-in) or custom.

## Required Scopes

Most objects operations require the following scopes:
- `object_configuration:read` - For reading object configurations
- `object_configuration:read-write` - For creating, updating, or deleting objects and their attributes

## Endpoints

### List Objects

```
GET /v2/objects
```

Lists all objects in the workspace.

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |
| includeStandard | boolean | Whether to include standard objects (default true) |

#### Response

```json
{
  "data": [
    {
      "id": "object_01abcdefghijklmnopqrstuv",
      "slug": "companies",
      "title": "Companies",
      "title_singular": "Company",
      "is_standard": true,
      "attributes_count": 15,
      "created_at": "2023-01-01T00:00:00.000Z",
      "updated_at": "2023-06-15T12:30:00.000Z"
    },
    {
      "id": "object_01wxyzabcdefghijklmnopq",
      "slug": "projects",
      "title": "Projects",
      "title_singular": "Project",
      "is_standard": false,
      "attributes_count": 8,
      "created_at": "2023-05-12T09:45:00.000Z",
      "updated_at": "2023-06-10T15:20:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 10
  }
}
```

### Create an Object

```
POST /v2/objects
```

Creates a new custom object.

#### Request Body

```json
{
  "slug": "projects",
  "title": "Projects",
  "title_singular": "Project",
  "attributes": [
    {
      "slug": "name",
      "title": "Name",
      "data_type": "text",
      "is_title": true,
      "is_required": true
    },
    {
      "slug": "status",
      "title": "Status",
      "data_type": "select",
      "options": [
        {"value": "planning", "label": "Planning"},
        {"value": "in_progress", "label": "In Progress"},
        {"value": "completed", "label": "Completed"},
        {"value": "on_hold", "label": "On Hold"}
      ]
    }
  ]
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| slug            | string   | Unique identifier for the object (URL-friendly) | Yes |
| title           | string   | Display name for the object (plural) | Yes |
| title_singular  | string   | Singular display name for the object | Yes |
| attributes      | array    | Initial attributes for the object | No |

#### Response

Returns the created object with a 201 status code.

### Get an Object

```
GET /v2/objects/{object_id}
```

or

```
GET /v2/objects/{object_slug}
```

Retrieves a specific object by ID or slug.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object to retrieve |
| object_slug  | string | The slug of the object to retrieve |

#### Response

Returns the object configuration.

### Update an Object

```
PATCH /v2/objects/{object_id}
```

or

```
PATCH /v2/objects/{object_slug}
```

Updates a specific object.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object to update |
| object_slug  | string | The slug of the object to update |

#### Request Body

```json
{
  "title": "Updated Title",
  "title_singular": "Updated Singular"
}
```

| Field           | Type     | Description |
|-----------------|----------|-------------|
| title           | string   | Updated display name for the object (plural) |
| title_singular  | string   | Updated singular display name for the object |

#### Response

Returns the updated object.

### Delete an Object

```
DELETE /v2/objects/{object_id}
```

or

```
DELETE /v2/objects/{object_slug}
```

Deletes a custom object. Standard objects cannot be deleted.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object to delete |
| object_slug  | string | The slug of the object to delete |

#### Response

Returns a 204 status code with no content on success.

### List Object Attributes

```
GET /v2/objects/{object_id}/attributes
```

or

```
GET /v2/objects/{object_slug}/attributes
```

Lists all attributes defined on a specific object.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |

#### Response

```json
{
  "data": [
    {
      "id": "attribute_01abcdefghijklmnopqrstuv",
      "slug": "name",
      "title": "Name",
      "data_type": "text",
      "is_title": true,
      "is_required": true,
      "is_unique": true,
      "created_at": "2023-05-12T09:45:00.000Z",
      "updated_at": "2023-05-12T09:45:00.000Z"
    },
    {
      "id": "attribute_01wxyzabcdefghijklmnopq",
      "slug": "status",
      "title": "Status",
      "data_type": "select",
      "options": [
        {"value": "planning", "label": "Planning"},
        {"value": "in_progress", "label": "In Progress"},
        {"value": "completed", "label": "Completed"},
        {"value": "on_hold", "label": "On Hold"}
      ],
      "is_title": false,
      "is_required": false,
      "is_unique": false,
      "created_at": "2023-05-12T09:45:00.000Z",
      "updated_at": "2023-06-10T15:20:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 8
  }
}
```

### Create an Attribute

```
POST /v2/objects/{object_id}/attributes
```

or

```
POST /v2/objects/{object_slug}/attributes
```

Creates a new attribute for a specific object.

#### Path Parameters

| Parameter    | Type   | Description |
|--------------|--------|-------------|
| object_id    | string | The ID of the object |
| object_slug  | string | The slug of the object |

#### Request Body

```json
{
  "slug": "budget",
  "title": "Budget",
  "data_type": "currency",
  "is_required": false,
  "is_unique": false,
  "currency": "USD"
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| slug            | string   | Unique identifier for the attribute (URL-friendly) | Yes |
| title           | string   | Display name for the attribute | Yes |
| data_type       | string   | Type of data for the attribute (text, number, date, select, etc.) | Yes |
| is_required     | boolean  | Whether the attribute is required | No |
| is_unique       | boolean  | Whether the attribute value must be unique | No |
| is_title        | boolean  | Whether the attribute is the title attribute | No |
| default_value   | any      | Default value for the attribute | No |
| options         | array    | Options for select data type | For select data type |

#### Response

Returns the created attribute with a 201 status code.

### Get an Attribute

```
GET /v2/objects/{object_id}/attributes/{attribute_id}
```

or

```
GET /v2/objects/{object_slug}/attributes/{attribute_slug}
```

Retrieves a specific attribute.

#### Path Parameters

| Parameter        | Type   | Description |
|------------------|--------|-------------|
| object_id        | string | The ID of the object |
| object_slug      | string | The slug of the object |
| attribute_id     | string | The ID of the attribute to retrieve |
| attribute_slug   | string | The slug of the attribute to retrieve |

#### Response

Returns the attribute configuration.

### Update an Attribute

```
PATCH /v2/objects/{object_id}/attributes/{attribute_id}
```

or

```
PATCH /v2/objects/{object_slug}/attributes/{attribute_slug}
```

Updates a specific attribute.

#### Path Parameters

| Parameter        | Type   | Description |
|------------------|--------|-------------|
| object_id        | string | The ID of the object |
| object_slug      | string | The slug of the object |
| attribute_id     | string | The ID of the attribute to update |
| attribute_slug   | string | The slug of the attribute to update |

#### Request Body

```json
{
  "title": "Updated Title",
  "is_required": true
}
```

| Field           | Type     | Description |
|-----------------|----------|-------------|
| title           | string   | Updated display name for the attribute |
| is_required     | boolean  | Updated required status |
| is_unique       | boolean  | Updated unique status |
| default_value   | any      | Updated default value |
| options         | array    | Updated options for select data type |

#### Response

Returns the updated attribute.

### Delete an Attribute

```
DELETE /v2/objects/{object_id}/attributes/{attribute_id}
```

or

```
DELETE /v2/objects/{object_slug}/attributes/{attribute_slug}
```

Deletes a specific attribute.

#### Path Parameters

| Parameter        | Type   | Description |
|------------------|--------|-------------|
| object_id        | string | The ID of the object |
| object_slug      | string | The slug of the object |
| attribute_id     | string | The ID of the attribute to delete |
| attribute_slug   | string | The slug of the attribute to delete |

#### Response

Returns a 204 status code with no content on success.

## Standard Objects

Attio provides several standard objects that are pre-configured:

| Object Slug | Description |
|-------------|-------------|
| companies   | Represents companies/organizations |
| people      | Represents individual contacts |
| opportunities | Represents sales opportunities |
| workspaces  | Represents Attio workspaces |
| users       | Represents users in the workspace |

## Attribute Data Types

Attio supports the following attribute data types:

| Data Type | Description |
|-----------|-------------|
| text      | Plain text values |
| number    | Numeric values |
| date      | Date and time values |
| boolean   | True/false values |
| select    | Single-select from predefined options |
| multi_select | Multiple selections from predefined options |
| link      | Links to other records |
| email     | Email addresses |
| phone     | Phone numbers |
| url       | Web URLs |
| currency  | Monetary values with currency |
| percentage | Percentage values |
| rating    | Star ratings (1-5) |

## Example Usage

### Creating a Custom Object with JavaScript (Node.js)

```javascript
const axios = require('axios');

async function createCustomObject() {
  try {
    const response = await axios.post('https://api.attio.com/v2/objects', {
      slug: 'products',
      title: 'Products',
      title_singular: 'Product',
      attributes: [
        {
          slug: 'name',
          title: 'Name',
          data_type: 'text',
          is_title: true,
          is_required: true
        },
        {
          slug: 'price',
          title: 'Price',
          data_type: 'currency',
          currency: 'USD'
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

createCustomObject();
```