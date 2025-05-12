# Attio MCP Prompts API

The Attio MCP Server implements the Model Context Protocol (MCP) Prompts API, allowing Claude Desktop to discover and use predefined prompt templates. This document explains how the prompts functionality works and how to extend it.

## MCP Prompts Overview

MCP Prompts allows clients like Claude Desktop to:

1. Discover available prompt templates (`prompts/list` endpoint)
2. Get details of specific prompts (`prompts/get` endpoint)
3. Execute prompts with parameters

## Available Prompt Categories

The Attio MCP Server provides prompt templates in the following categories:

- **People**: Templates for working with person records
- **Companies**: Templates for working with company records
- **Lists**: Templates for managing lists and their entries
- **Notes**: Templates for creating and managing notes

## Prompt Template Structure

Each prompt template includes:

- **id**: Unique identifier for the prompt
- **title**: Human-readable name of the prompt
- **description**: Detailed explanation of what the prompt does
- **category**: The category this prompt belongs to
- **parameters**: Array of parameter definitions
  - name: Parameter name
  - type: Data type (string, number, boolean, array, object)
  - description: Explanation of the parameter
  - required: Whether this parameter is required
  - default: Optional default value
  - enum: Optional array of allowed values
- **template**: Handlebars template string that generates the final prompt text

## Usage with Claude Desktop

Claude Desktop will automatically detect the available prompts when connecting to the Attio MCP Server. Users can select prompt templates from the Claude Desktop interface, which will present a form for entering the required parameters before generating the prompt.

## Extending with New Prompts

To add new prompt templates:

1. Identify the appropriate category file in `src/prompts/templates/` or create a new one
2. Add your prompt definition following the `PromptTemplate` interface
3. If creating a new category:
   - Create a new file in `src/prompts/templates/`
   - Export an array of prompts
   - Import and include your prompts in `src/prompts/templates/index.ts`

### Example: Adding a New Prompt

```typescript
// In src/prompts/templates/people.ts
export const peoplePrompts: PromptTemplate[] = [
  // Existing prompts...
  {
    id: 'find-person-by-phone',
    title: 'Find a person by phone number',
    description: 'Search for a person in Attio using their phone number',
    category: 'people',
    parameters: [
      {
        name: 'phone',
        type: 'string',
        description: 'Phone number to search for',
        required: true
      }
    ],
    template: 'Find a person with the phone number {{phone}}.'
  }
];
```

## Testing Prompts

You can test the MCP prompts functionality using the test script:

```bash
node test/prompts-test.js
```

This will:
1. Start the MCP server
2. Send a `prompts/list` request to get all available prompts
3. Send a `prompts/get` request for a specific prompt
4. Display the responses

## Implementation Details

- Prompts are registered with the MCP server in `src/prompts/handlers.ts`
- Handlebars is used for templating
- Templates are cached for performance
- Error handling follows the same pattern as the rest of the API

## Notes for Developers

- Remember to add template caching for any new conditional helpers
- All template strings must be valid Handlebars syntax
- Always provide clear descriptions and parameter documentation
- Keep prompts focused on specific use cases