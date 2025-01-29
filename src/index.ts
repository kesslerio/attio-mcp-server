#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Configure Axios instance with Attio API credentials from environment
const api = axios.create({
  baseURL: "https://api.attio.com/v2",
  headers: {
    "Authorization": `Bearer ${process.env.ATTIO_API_KEY}`,
    "Content-Type": "application/json",
  },
});

const server = new Server(
  {
    name: "attio-mcp-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

// Helper function to create detailed error responses
function createErrorResult(error: Error, url: string, method: string, responseData: any) {
  return {
    content: [
      {
        type: "text",
        text: `ERROR: ${error.message}\n\n` +
          `=== Request Details ===\n` +
          `- Method: ${method}\n` +
          `- URL: ${url}\n\n` +
          `=== Response Details ===\n` +
          `- Status: ${responseData.status}\n` +
          `- Headers: ${JSON.stringify(responseData.headers || {}, null, 2)}\n` +
          `- Data: ${JSON.stringify(responseData.data || {}, null, 2)}\n`
      },
    ],
    isError: true,
    error: {
      code: responseData.status || 500,
      message: error.message,
      details: responseData.data?.error || "Unknown error occurred"
    }
  };
}

// Example: List Resources Handler (List Companies)
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
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

// Example: Read Resource Handler (Get Company Details)
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
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

// Example: List Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search-companies",
        description: "Search for companies by name",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Company name or keyword to search for",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "read-company-details",
        description: "Read details of a company",
        inputSchema: {
          type: "object",
          properties: {
            uri: {
              type: "string",
              description: "URI of the company to read",
            },
          },
          required: ["uri"],
        },
      },
      {
        name: "read-company-notes",
        description: "Read notes for a company",
        inputSchema: {
          type: "object",
          properties: {
            uri: {
              type: "string",
              description: "URI of the company to read notes for",
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
        name: "create-company-note",
        description: "Add a new note to a company",
        inputSchema: {
          type: "object",
          properties: {
            companyId: {
              type: "string",
              description: "ID of the company to add the note to",
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
          required: ["companyId", "noteTitle", "noteText"],
        },
      },
    ],
  };
});

// Example: Call Tool Handler with enhanced error handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  try {

    if (toolName === "search-companies") {
      const query = request.params.arguments?.query as string;
      const path = "/objects/companies/records/query";
      try {
        const response = await api.post(path, {
          filter: {
            name: { "$contains": query },
          }
        });
        const results = response.data.data || [];

        const companies = results.map((company: any) => {
          const companyName = company.values?.name?.[0]?.value || "Unknown Company";
          const companyId = company.id?.record_id || "Record ID not found";
          return `${companyName}: attio://companies/${companyId}`;
        })
          .join("\n");
        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} companies:\n${companies}`,
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

    if (toolName === "read-company-details") {
      const uri = request.params.arguments?.uri as string;
      const companyId = uri.replace("attio://companies/", "");
      const path = `/objects/companies/records/${companyId}`;
      try {
        const response = await api.get(path);
        return {
          content: [
            {
              type: "text",
              text: `Company details for ${companyId}:\n${JSON.stringify(response.data, null, 2)}`,
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

    if (toolName == 'read-company-notes') {
      const uri = request.params.arguments?.uri as string;
      const limit = request.params.arguments?.limit as number || 10;
      const offset = request.params.arguments?.offset as number || 0;
      const companyId = uri.replace("attio://companies/", "");
      const path = `/notes?limit=${limit}&offset=${offset}&parent_object=companies&parent_record_id=${companyId}`;

      try {
        const response = await api.get(path);
        const notes = response.data.data || [];

        return {
          content: [
            {
              type: "text",
              text: `Found ${notes.length} notes for company ${companyId}:\n${notes.map((note: any) => JSON.stringify(note)).join("----------\n")}`,
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

    if (toolName === "create-company-note") {
      const companyId = request.params.arguments?.companyId as string;
      const noteTitle = request.params.arguments?.noteTitle as string;
      const noteText = request.params.arguments?.noteText as string;
      const url = `notes`;

      try {
        const response = await api.post(url, {
          data: {
            format: "plaintext",
            parent_object: "companies",
            parent_record_id: companyId,
            title: `[AI] ${noteTitle}`,
            content: noteText
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `Note added to company ${companyId}: attio://notes/${response.data?.id?.note_id}`,
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

    throw new Error("Tool not found");
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool '${toolName}': ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
});

// Main function
async function main() {
  try {
    if (!process.env.ATTIO_API_KEY) {
      throw new Error("ATTIO_API_KEY environment variable not found");
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
