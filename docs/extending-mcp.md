# Extending Attio MCP Server

This guide describes how to extend the Attio MCP server to handle additional object types like People and Lists, beyond the currently implemented Companies functionality.

## Current Architecture

The current Attio MCP server has the following capabilities:
- Reading company records
- Reading company notes
- Writing company notes

## Implementing People Object Support

To add support for People objects, we'll need to create several new tools and resource handlers. Here's how to implement it:

### 1. Update ListResourcesRequestSchema Handler

Add People objects to the resources that can be listed:

```typescript
// Example: List Resources Handler (Updated to include People)
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  // If resource type specified in request is 'people'
  if (request.params?.type === 'people') {
    const path = "/objects/people/records/query";
    try {
      const response = await api.post(path, {
        limit: 20,
        sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
      });
      const people = response.data.data || [];

      return {
        resources: people.map((person: any) => ({
          uri: `attio://people/${person.id?.record_id}`,
          name: person.values?.name?.[0]?.value || "Unknown Person",
          mimeType: "application/json",
        })),
        description: `Found ${people.length} people that you have interacted with most recently`,
      };
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error("Unknown error"),
        path,
        "POST",
        (error as any).response?.data || {}
      );
    }
  }
  
  // Default handling for companies (existing code)
  const path = "/objects/companies/records/query";
  try {
    const response = await api.post(path, {
      limit: 20,
      sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
    });
    const companies = response.data.data || [];

    return {
      resources: companies.map((company: any) => ({
        uri: `attio://companies/${company.id?.record_id}`,
        name: company.values?.name?.[0]?.value || "Unknown Company",
        mimeType: "application/json",
      })),
      description: `Found ${companies.length} companies that you have interacted with most recently`,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      path,
      "POST",
      (error as any).response?.data || {}
    );
  }
});
```

### 2. Update ReadResourceRequestSchema Handler

Extend the read resource handler to work with People:

```typescript
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  // Handle people resources
  if (request.params.uri.startsWith("attio://people/")) {
    const personId = request.params.uri.replace("attio://people/", "");
    try {
      const path = `/objects/people/records/${personId}`;
      const response = await api.get(path);

      return {
        contents: [
          {
            uri: request.params.uri,
            text: JSON.stringify(response.data, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error("Unknown error"),
        `/objects/people/${personId}`,
        "GET",
        (error as any).response?.data || {}
      );
    }
  }
  
  // Handle company resources (existing code)
  const companyId = request.params.uri.replace("attio://companies/", "");
  try {
    const path = `/objects/companies/records/${companyId}`;
    const response = await api.get(path);

    return {
      contents: [
        {
          uri: request.params.uri,
          text: JSON.stringify(response.data, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      `/objects/companies/${companyId}`,
      "GET",
      (error as any).response?.data || {}
    );
  }
});
```

### 3. Add People-related Tools

Add new tools for working with People objects:

```typescript
// Add to the tools array in ListToolsRequestSchema
{
  name: "search-people",
  description: "Search for people by name",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Person name or keyword to search for",
      },
    },
    required: ["query"],
  },
},
{
  name: "read-person-details",
  description: "Read details of a person",
  inputSchema: {
    type: "object",
    properties: {
      uri: {
        type: "string",
        description: "URI of the person to read",
      },
    },
    required: ["uri"],
  },
},
{
  name: "read-person-notes",
  description: "Read notes for a person",
  inputSchema: {
    type: "object",
    properties: {
      uri: {
        type: "string",
        description: "URI of the person to read notes for",
      },
      limit: {
        type: "number",
        description: "Maximum number of notes to fetch (optional, default 10)",
      },
      offset: {
        type: "number",
        description: "Number of notes to skip (optional, default 0)",
      },
    },
    required: ["uri"],
  },
},
{
  name: "create-person-note",
  description: "Add a new note to a person",
  inputSchema: {
    type: "object",
    properties: {
      personId: {
        type: "string",
        description: "ID of the person to add the note to",
      },
      noteTitle: {
        type: "string",
        description: "Title of the note",
      },
      noteText: {
        type: "string",
        description: "Text content of the note",
      },
    },
    required: ["personId", "noteTitle", "noteText"],
  },
},
```

### 4. Implement Tool Handlers for People

Add the tool implementations to the CallToolRequestSchema handler:

```typescript
// Inside CallToolRequestSchema handler

if (toolName === "search-people") {
  const query = request.params.arguments?.query as string;
  const path = "/objects/people/records/query";
  try {
    const response = await api.post(path, {
      filter: {
        name: { "$contains": query },
      }
    });
    const results = response.data.data || [];

    const people = results.map((person: any) => {
      const personName = person.values?.name?.[0]?.value || "Unknown Person";
      const personId = person.id?.record_id || "Record ID not found";
      return `${personName}: attio://people/${personId}`;
    })
      .join("\n");
    return {
      content: [
        {
          type: "text",
          text: `Found ${results.length} people:\n${people}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      path,
      "GET",
      (error as any).response?.data || {}
    );
  }
}

if (toolName === "read-person-details") {
  const uri = request.params.arguments?.uri as string;
  const personId = uri.replace("attio://people/", "");
  const path = `/objects/people/records/${personId}`;
  try {
    const response = await api.get(path);
    return {
      content: [
        {
          type: "text",
          text: `Person details for ${personId}:\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      path,
      "GET",
      (error as any).response?.data || {}
    );
  }
}

if (toolName == 'read-person-notes') {
  const uri = request.params.arguments?.uri as string;
  const limit = request.params.arguments?.limit as number || 10;
  const offset = request.params.arguments?.offset as number || 0;
  const personId = uri.replace("attio://people/", "");
  const path = `/notes?limit=${limit}&offset=${offset}&parent_object=people&parent_record_id=${personId}`;

  try {
    const response = await api.get(path);
    const notes = response.data.data || [];

    return {
      content: [
        {
          type: "text",
          text: `Found ${notes.length} notes for person ${personId}:\n${notes.map((note: any) => JSON.stringify(note)).join("----------\n")}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      path,
      "GET",
      (error as any).response?.data || {}
    );
  }
}

if (toolName === "create-person-note") {
  const personId = request.params.arguments?.personId as string;
  const noteTitle = request.params.arguments?.noteTitle as string;
  const noteText = request.params.arguments?.noteText as string;
  const url = `notes`;

  try {
    const response = await api.post(url, {
      data: {
        format: "plaintext",
        parent_object: "people",
        parent_record_id: personId,
        title: `[AI] ${noteTitle}`,
        content: noteText
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Note added to person ${personId}: attio://notes/${response.data?.id?.note_id}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      url,
      "POST",
      (error as any).response?.data || {}
    );
  }
}
```

## Implementing List Management

To add list management capabilities, we'll need to create tools for working with Attio lists:

### 1. Add List-related Tools

Add new tools for working with Lists:

```typescript
// Add to the tools array in ListToolsRequestSchema
{
  name: "list-lists",
  description: "List all lists in the workspace",
  inputSchema: {
    type: "object",
    properties: {
      objectSlug: {
        type: "string",
        description: "Optional. Filter lists by object type (e.g., 'companies', 'people')",
      },
      limit: {
        type: "number",
        description: "Maximum number of lists to fetch (optional, default 20)",
      },
    },
    required: [],
  },
},
{
  name: "get-list-entries",
  description: "Get entries from a specific list",
  inputSchema: {
    type: "object",
    properties: {
      listId: {
        type: "string",
        description: "ID of the list to get entries from",
      },
      limit: {
        type: "number",
        description: "Maximum number of entries to fetch (optional, default 20)",
      },
      offset: {
        type: "number",
        description: "Number of entries to skip (optional, default 0)",
      },
    },
    required: ["listId"],
  },
},
{
  name: "add-record-to-list",
  description: "Add a record to a list",
  inputSchema: {
    type: "object",
    properties: {
      listId: {
        type: "string",
        description: "ID of the list to add the record to",
      },
      recordId: {
        type: "string",
        description: "ID of the record to add to the list",
      },
    },
    required: ["listId", "recordId"],
  },
},
{
  name: "remove-record-from-list",
  description: "Remove a record from a list",
  inputSchema: {
    type: "object",
    properties: {
      listId: {
        type: "string",
        description: "ID of the list",
      },
      entryId: {
        type: "string",
        description: "ID of the list entry to remove",
      },
    },
    required: ["listId", "entryId"],
  },
},
```

### 2. Implement List Tool Handlers

Add the tool implementations to the CallToolRequestSchema handler:

```typescript
// Inside CallToolRequestSchema handler

if (toolName === "list-lists") {
  const objectSlug = request.params.arguments?.objectSlug as string;
  const limit = request.params.arguments?.limit as number || 20;
  let path = `/lists?limit=${limit}`;
  
  if (objectSlug) {
    path += `&objectSlug=${objectSlug}`;
  }
  
  try {
    const response = await api.get(path);
    const lists = response.data.data || [];

    const listsText = lists.map((list: any) => {
      const listTitle = list.title || "Untitled List";
      const listId = list.id || "ID not found";
      const objectType = list.object?.slug || "unknown";
      const entriesCount = list.entries_count || 0;
      return `${listTitle} (${objectType}, ${entriesCount} entries): attio://lists/${listId}`;
    }).join("\n");
    
    return {
      content: [
        {
          type: "text",
          text: `Found ${lists.length} lists:\n${listsText}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      path,
      "GET",
      (error as any).response?.data || {}
    );
  }
}

if (toolName === "get-list-entries") {
  const listId = request.params.arguments?.listId as string;
  const limit = request.params.arguments?.limit as number || 20;
  const offset = request.params.arguments?.offset as number || 0;
  const path = `/lists/${listId}/entries?limit=${limit}&offset=${offset}`;
  
  try {
    const response = await api.get(path);
    const entries = response.data.data || [];

    const entriesText = entries.map((entry: any) => {
      const recordTitle = entry.record?.title || "Untitled Record";
      const recordId = entry.record?.id || "ID not found";
      const objectType = entry.record?.object_slug || "unknown";
      return `${recordTitle} (${objectType}): attio://${objectType}/${recordId} (Entry ID: ${entry.id})`;
    }).join("\n");
    
    return {
      content: [
        {
          type: "text",
          text: `Found ${entries.length} entries in list ${listId}:\n${entriesText}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      path,
      "GET",
      (error as any).response?.data || {}
    );
  }
}

if (toolName === "add-record-to-list") {
  const listId = request.params.arguments?.listId as string;
  const recordId = request.params.arguments?.recordId as string;
  const path = `/lists/${listId}/entries`;
  
  try {
    const response = await api.post(path, {
      record_id: recordId
    });
    
    return {
      content: [
        {
          type: "text",
          text: `Record ${recordId} added to list ${listId}. Entry ID: ${response.data.id}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      path,
      "POST",
      (error as any).response?.data || {}
    );
  }
}

if (toolName === "remove-record-from-list") {
  const listId = request.params.arguments?.listId as string;
  const entryId = request.params.arguments?.entryId as string;
  const path = `/lists/${listId}/entries/${entryId}`;
  
  try {
    await api.delete(path);
    
    return {
      content: [
        {
          type: "text",
          text: `Entry ${entryId} removed from list ${listId}.`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      path,
      "DELETE",
      (error as any).response?.data || {}
    );
  }
}
```

## Refactoring Considerations

As you expand the MCP server, consider these refactoring steps to keep the code maintainable:

1. **Create Helper Functions for Common Operations**: 
   - Extract repeated API call patterns into helper functions
   - Create separate functions for different object types (companies, people, lists)

2. **Modularize the Code**:
   - Split the code into separate files based on functionality
   - Create separate modules for each object type (companies.ts, people.ts, lists.ts)
   - Use a common utilities module for shared functions

3. **Error Handling and Validation**:
   - Enhance error handling with more specific error types
   - Add input validation for all tool parameters

## Testing Your Implementation

After implementing the new features:

1. Build your server:
   ```sh
   npm run build
   ```

2. Test with the MCP Inspector:
   ```sh
   dotenv npx @modelcontextprotocol/inspector node ./dist/index.js
   ```

3. Update your Claude Desktop configuration to use the updated server.

4. Test each new tool with Claude to ensure it works correctly.

## Next Steps

After implementing People and Lists support, consider adding these features:

1. **Record Creation and Updating**: Add tools to create and update records
2. **Advanced Filtering**: Implement more sophisticated search and filter options
3. **Bulk Operations**: Add support for batch operations on records
4. **Activity Tracking**: Implement tools to log activities and interactions
5. **Custom Fields**: Add support for working with custom fields and attributes