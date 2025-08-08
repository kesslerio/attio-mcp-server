# Attio Notes API

The Notes API allows you to create, read, update, and delete notes in Attio. Notes can be attached to records like companies, people, and opportunities, providing a way to track interactions and important information.

## Required Scopes

Most note operations require the following scopes:
- `note:read` - For reading notes
- `note:read-write` - For creating, updating, or deleting notes
- `object_configuration:read` - For accessing object configurations
- `record_permission:read` - For checking record permissions

## Endpoints

### List Notes

```
GET /v2/notes
```

Lists all notes. Results are sorted by creation date, from newest to oldest.

#### Query Parameters

| Parameter        | Type   | Description |
|------------------|--------|-------------|
| page             | number | Page number to retrieve (starting at 1) |
| pageSize         | number | Number of items per page (default 25, max 100) |
| parent_object    | string | Filter notes by parent object type (e.g., "companies", "people") |
| parent_record_id | string | Filter notes by parent record ID |
| after            | string | Return notes created after this timestamp (ISO 8601 format) |
| before           | string | Return notes created before this timestamp (ISO 8601 format) |

#### Response

```json
{
  "data": [
    {
      "id": {
        "note_id": "note_01abcdefghijklmnopqrstuv"
      },
      "title": "Meeting Summary",
      "content": "Met with client to discuss contract renewal. They are interested in upgrading to the premium tier.",
      "format": "plaintext",
      "parent_object": "companies",
      "parent_record_id": "record_01wxyzabcdefghijklmnopq",
      "creator": {
        "id": "workspace-member_01abcdefghijklmnopqrstu",
        "type": "workspace-member",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "created_at": "2023-11-30T15:30:00.000Z",
      "updated_at": "2023-11-30T15:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 42
  }
}
```

### Create a Note

```
POST /v2/notes
```

Creates a new note attached to a specific record.

#### Request Body

```json
{
  "data": {
    "title": "Meeting Summary",
    "content": "Met with client to discuss contract renewal. They are interested in upgrading to the premium tier.",
    "format": "plaintext",
    "parent_object": "companies",
    "parent_record_id": "record_01wxyzabcdefghijklmnopq"
  }
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| title           | string   | The note title | Yes |
| content         | string   | The note content | Yes |
| format          | string   | The format of the note content ("plaintext", "markdown", or "html") | Yes |
| parent_object   | string   | The type of object the note is attached to (e.g., "companies", "people") | Yes |
| parent_record_id| string   | The ID of the record the note is attached to | Yes |

#### Response

Returns the created note with a 201 status code.

```json
{
  "data": {
    "id": {
      "note_id": "note_01abcdefghijklmnopqrstuv"
    },
    "title": "Meeting Summary",
    "content": "Met with client to discuss contract renewal. They are interested in upgrading to the premium tier.",
    "format": "plaintext",
    "parent_object": "companies",
    "parent_record_id": "record_01wxyzabcdefghijklmnopq",
    "creator": {
      "id": "workspace-member_01abcdefghijklmnopqrstu",
      "type": "workspace-member",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "avatar_url": "https://example.com/avatar.jpg"
    },
    "created_at": "2023-11-30T15:30:00.000Z",
    "updated_at": "2023-11-30T15:30:00.000Z"
  }
}
```

### Get a Note

```
GET /v2/notes/{note_id}
```

Retrieves a specific note by ID.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| note_id   | string | The ID of the note to retrieve |

#### Response

Returns the note object.

### Update a Note

```
PATCH /v2/notes/{note_id}
```

Updates a specific note.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| note_id   | string | The ID of the note to update |

#### Request Body

```json
{
  "data": {
    "title": "Updated Meeting Summary",
    "content": "Met with client to discuss contract renewal. They are interested in upgrading to the premium tier with additional users."
  }
}
```

| Field           | Type     | Description |
|-----------------|----------|-------------|
| title           | string   | The updated note title |
| content         | string   | The updated note content |
| format          | string   | The updated format of the note content |

#### Response

Returns the updated note object.

### Delete a Note

```
DELETE /v2/notes/{note_id}
```

Deletes a specific note.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| note_id   | string | The ID of the note to delete |

#### Response

Returns a 204 status code with no content on success.

### Get Notes for a Record

```
GET /v2/{parent_object}/{parent_record_id}/notes
```

Retrieves all notes attached to a specific record.

#### Path Parameters

| Parameter        | Type   | Description |
|------------------|--------|-------------|
| parent_object    | string | The type of object (e.g., "companies", "people") |
| parent_record_id | string | The ID of the record |

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |

#### Response

Returns an array of notes attached to the specified record.

## Note Formats

Attio supports the following note formats:

| Format     | Description |
|------------|-------------|
| plaintext  | Plain text with no formatting |
| markdown   | Text formatted using Markdown syntax |
| html       | Text formatted using HTML |

## Example Usage

### Creating a Note with JavaScript (Node.js)

```javascript
const axios = require('axios');

async function createNote() {
  try {
    const response = await axios.post('https://api.attio.com/v2/notes', {
      data: {
        title: "Client Meeting",
        content: "Discussed renewal terms and potential upsell opportunities. Follow up next week.",
        format: "plaintext",
        parent_object: "companies",
        parent_record_id: "record_01wxyzabcdefghijklmnopq"
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

createNote();
```

### Listing Notes for a Company with cURL

```bash
curl -X GET \
  'https://api.attio.com/v2/notes?parent_object=companies&parent_record_id=record_01wxyzabcdefghijklmnopq&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Creating a Note for a Person with cURL

```bash
curl -X POST \
  https://api.attio.com/v2/notes \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "title": "Phone Call Summary",
      "content": "Discussed potential partnership opportunities and scheduled a follow-up call for next week.",
      "format": "plaintext",
      "parent_object": "people",
      "parent_record_id": "record_01abcdefghijklmnopqrstuv"
    }
  }'
```