# Attio Tasks API

The Tasks API allows you to manage tasks within Attio. Tasks can be assigned to users, linked to records, and scheduled with due dates.

## Required Scopes

Most task operations require the following scopes:
- `task:read` - For reading tasks
- `task:read-write` - For creating, updating, or deleting tasks
- `object_configuration:read` - For accessing object configurations
- `record_permission:read` - For checking record permissions
- `user_management:read` - For accessing user information

## Endpoints

### List Tasks

```
GET /v2/tasks
```

Lists all tasks. Results are sorted by creation date, from oldest to newest.

#### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| page      | number | Page number to retrieve (starting at 1) |
| pageSize  | number | Number of items per page (default 25, max 100) |
| assignee  | string | Filter tasks by assignee ID |
| status    | string | Filter tasks by status ("todo", "done", "cancelled") |
| dueDate   | string | Filter tasks by due date in ISO 8601 format |

#### Response

```json
{
  "data": [
    {
      "id": "task_01abcdefghijklmnopqrstuv",
      "content": "Follow up with client about proposal",
      "status": "todo",
      "due_date": "2023-12-15T00:00:00.000Z",
      "assignee": {
        "id": "workspace-member_01abcdefghijklmnopqrstuv",
        "type": "workspace-member",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "linked_records": [
        {
          "id": "record_01abcdefghijklmnopqrstuv",
          "object_id": "object_01abcdefghijklmnopqrstuv",
          "object_slug": "companies",
          "title": "Acme Inc."
        }
      ],
      "created_at": "2023-11-30T15:30:00.000Z",
      "updated_at": "2023-11-30T15:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100
  }
}
```

### Create a Task

```
POST /v2/tasks
```

Creates a new task.

#### Request Body

```json
{
  "content": "Follow up with client about proposal",
  "assignee": {
    "id": "workspace-member_01abcdefghijklmnopqrstuv",
    "type": "workspace-member"
  },
  "due_date": "2023-12-15T00:00:00.000Z",
  "linked_records": [
    {
      "id": "record_01abcdefghijklmnopqrstuv"
    }
  ]
}
```

| Field           | Type     | Description | Required |
|-----------------|----------|-------------|----------|
| content         | string   | The task content/description | Yes |
| assignee        | object   | The user assigned to the task | No |
| assignee.id     | string   | The ID of the assigned user | If assignee is provided |
| assignee.type   | string   | The type of the assignee (workspace-member) | If assignee is provided |
| due_date        | string   | The due date in ISO 8601 format | No |
| linked_records  | array    | List of records to link the task to | No |
| linked_records[].id | string | The ID of the record to link | If linked_records is provided |

#### Response

Returns the created task object with a 201 status code.

### Get a Task

```
GET /v2/tasks/{task_id}
```

Retrieves a specific task by ID.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| task_id   | string | The ID of the task to retrieve |

#### Response

Returns the task object.

### Update a Task

```
PATCH /v2/tasks/{task_id}
```

Updates a specific task.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| task_id   | string | The ID of the task to update |

#### Request Body

```json
{
  "content": "Updated task content",
  "status": "done",
  "due_date": "2023-12-20T00:00:00.000Z"
}
```

| Field           | Type     | Description |
|-----------------|----------|-------------|
| content         | string   | The updated task content |
| status          | string   | The task status ("todo", "done", "cancelled") |
| assignee        | object   | The updated assignee |
| due_date        | string   | The updated due date in ISO 8601 format |
| linked_records  | array    | Updated list of linked records |

#### Response

Returns the updated task object.

### Delete a Task

```
DELETE /v2/tasks/{task_id}
```

Deletes a specific task.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| task_id   | string | The ID of the task to delete |

#### Response

Returns a 204 status code with no content on success.

### Link a Record to a Task

```
POST /v2/tasks/{task_id}/linked-records
```

Links a record to a specific task.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| task_id   | string | The ID of the task |

#### Request Body

```json
{
  "record_id": "record_01abcdefghijklmnopqrstuv"
}
```

#### Response

Returns a 204 status code with no content on success.

### Unlink a Record from a Task

```
DELETE /v2/tasks/{task_id}/linked-records/{record_id}
```

Unlinks a record from a specific task.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| task_id   | string | The ID of the task |
| record_id | string | The ID of the record to unlink |

#### Response

Returns a 204 status code with no content on success.

## Example Usage

### Creating a Task with cURL

```bash
curl -X POST \
  https://api.attio.com/v2/tasks \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "Follow up with client about proposal",
    "assignee": {
      "id": "workspace-member_01abcdefghijklmnopqrstuv",
      "type": "workspace-member"
    },
    "due_date": "2023-12-15T00:00:00.000Z"
  }'
```

### Listing Tasks with JavaScript (Node.js)

```javascript
const axios = require('axios');

async function listTasks() {
  try {
    const response = await axios.get('https://api.attio.com/v2/tasks', {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      params: {
        'page': 1,
        'pageSize': 10,
        'status': 'todo'
      }
    });
    
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}

listTasks();
```