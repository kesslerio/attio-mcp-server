# MCP Prompts API

The MCP Prompts API provides a way to define and execute pre-defined templates for common Attio operations. This allows for more guided interactions with the Attio API, making it easier for users to perform common tasks without needing to know the specifics of the API.

## Endpoints

### List Prompts

```
GET /prompts/list
```

Lists all available prompts or filters by category.

**Parameters:**
- `category` (optional): Filter prompts by category (e.g., "people", "companies", "lists", "notes")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "create-person",
      "title": "Create a new person",
      "description": "Create a new person record in Attio with the provided details",
      "category": "people",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Full name of the person",
          "required": true
        },
        ...
      ],
      "template": "Create a new person named {{name}}..."
    },
    ...
  ]
}
```

### List Prompt Categories

```
GET /prompts/categories
```

Lists all available prompt categories.

**Response:**
```json
{
  "success": true,
  "data": ["people", "companies", "lists", "notes", "general"]
}
```

### Get Prompt Details

```
GET /prompts/:id
```

Gets details for a specific prompt.

**Parameters:**
- `id`: ID of the prompt to get details for

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "create-person",
    "title": "Create a new person",
    "description": "Create a new person record in Attio with the provided details",
    "category": "people",
    "parameters": [
      {
        "name": "name",
        "type": "string",
        "description": "Full name of the person",
        "required": true
      },
      ...
    ],
    "template": "Create a new person named {{name}}..."
  }
}
```

### Execute Prompt

```
POST /prompts/:id/execute
```

Executes a prompt with provided parameters.

**Parameters:**
- `id`: ID of the prompt to execute

**Request Body:**
```json
{
  "parameters": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1 555-123-4567"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prompt": "create-person",
    "result": "Create a new person named John Doe with email john.doe@example.com and phone number +1 555-123-4567."
  }
}
```

## Available Prompt Categories

The MCP Prompts API includes templates for the following categories:

### People

Prompts for working with people records in Attio:
- Create a new person
- Find a person by email
- Update person details
- Add a note to a person

### Companies

Prompts for working with company records in Attio:
- Create a new company
- Find a company by name
- Update company details
- Add a note to a company

### Lists

Prompts for working with lists in Attio:
- Create a new list
- Add a record to a list
- Remove a record from a list
- Check if a record is in a list
- Get entries in a list

### Notes

Prompts for working with notes in Attio:
- Create a new note
- Get notes for a record
- Update a note
- Delete a note

## Using Prompts in Claude

The MCP Prompts feature is designed to be used with Claude and other AI assistants. Here's an example of how to use it:

```
Claude, I want to create a new person in Attio. Can you help me?
```

Claude can then use the `prompts/list` endpoint to find the appropriate prompt template, and then guide the user through providing the necessary parameters:

```
I can help you create a new person in Attio. I'll need some information:

What's the person's name? (required)
```

After collecting the necessary parameters, Claude can use the `prompts/execute` endpoint to execute the prompt and perform the operation.

## Benefits of Using Prompts

1. **Guided Interactions**: Prompts provide a structured way to interact with the Attio API, making it easier for users to perform common tasks.
2. **Standardized Operations**: Prompts ensure that common operations are performed in a consistent way.
3. **Reduced Errors**: By validating parameters before execution, prompts help prevent errors.
4. **Improved Documentation**: Prompts serve as self-documenting API examples.
5. **Faster Integration**: New users can get started quickly with template prompts.

## Extending Prompts

To add new prompt templates, you can extend the templates in the following files:
- `src/prompts/templates/people.ts`
- `src/prompts/templates/companies.ts`
- `src/prompts/templates/lists.ts`
- `src/prompts/templates/notes.ts`

Each template should include:
- A unique ID
- A title and description
- A category
- A list of parameters with types, descriptions, and whether they are required
- A template string using Handlebars syntax
