/**
 * Tool definitions for Attio MCP - edge-compatible
 *
 * These definitions follow the MCP Tool schema and can be used with any
 * MCP server implementation (stdio, HTTP, Cloudflare Workers, etc.)
 */

// Note: Commented out imports kept for documentation purposes
// import type { ResourceType, ToolResult } from '../types/index.js';

/**
 * MCP Tool definition structure
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  annotations?: {
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
  };
}

/**
 * Standard resource type description for tool schemas.
 * These are valid Attio object slugs that can be queried via the records API.
 * Note: 'notes' and 'workspace_members' are NOT valid object types - they have separate APIs.
 */
const RESOURCE_TYPE_SCHEMA = {
  type: 'string',
  description:
    'Type of Attio object to operate on. Valid types: companies, people, deals, tasks, lists. Custom objects may also work if configured in your Attio workspace.',
  enum: ['companies', 'people', 'deals', 'tasks', 'lists'],
};

/**
 * Standard pagination schema properties
 */
const PAGINATION_SCHEMA = {
  limit: {
    type: 'number',
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 100,
    default: 10,
  },
  offset: {
    type: 'number',
    description: 'Number of results to skip for pagination',
    minimum: 0,
    default: 0,
  },
};

/**
 * Format a tool description with capabilities, boundaries, constraints, and recovery hints
 */
function formatDescription(opts: {
  capability: string;
  boundaries: string;
  constraints: string;
  recoveryHint: string;
}): string {
  return `${opts.capability} | Does not: ${opts.boundaries} | ${opts.constraints} | If errors occur: ${opts.recoveryHint}`;
}

/**
 * Health check tool - no authentication required
 */
export const healthCheckDefinition: ToolDefinition = {
  name: 'aaa-health-check',
  description: formatDescription({
    capability:
      'Run a lightweight health probe that echoes deployment metadata.',
    boundaries: 'query Attio APIs, mutate data, or require credentials.',
    constraints:
      'Accepts optional echo text; returns JSON payload as text for MCP clients.',
    recoveryHint:
      'If unavailable, review server logs or restart the server process.',
  }),
  inputSchema: {
    type: 'object',
    properties: {
      echo: {
        type: 'string',
        description: 'Optional text to echo back in the response',
      },
    },
    additionalProperties: true,
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};

/**
 * Search records tool
 */
export const searchRecordsDefinition: ToolDefinition = {
  name: 'records_search',
  description: formatDescription({
    capability: 'Search across companies, people, deals, tasks, and lists',
    boundaries: 'create or modify records',
    constraints:
      'Returns max 100 results (default: 10). Filter conditions for actor-reference fields (like owner) require actor IDs, not names. Use records_discover_attributes to check field types before filtering.',
    recoveryHint:
      'use records_discover_attributes to find searchable fields and their types',
  }),
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    type: 'object',
    properties: {
      resource_type: RESOURCE_TYPE_SCHEMA,
      query: {
        type: 'string',
        description: 'Search query string',
      },
      filters: {
        type: 'object',
        description: 'Filter conditions for the search',
        properties: {
          filters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                attribute: {
                  type: 'object',
                  properties: { slug: { type: 'string' } },
                  required: ['slug'],
                },
                condition: { type: 'string' },
                value: {},
              },
              required: ['attribute', 'condition'],
            },
          },
          matchAny: {
            type: 'boolean',
            description: 'Use OR logic between filters (default: AND)',
          },
        },
      },
      ...PAGINATION_SCHEMA,
    },
    required: ['resource_type'],
  },
};

/**
 * Get record details tool
 */
export const getRecordDetailsDefinition: ToolDefinition = {
  name: 'records_get_details',
  description: formatDescription({
    capability: 'Fetch a single record with enriched attribute formatting',
    boundaries: 'search or filter result sets; use records_search instead',
    constraints:
      'Requires resource_type and record_id; optional fields filter output',
    recoveryHint: 'Validate record IDs with records_search before retrying',
  }),
  inputSchema: {
    type: 'object',
    properties: {
      resource_type: RESOURCE_TYPE_SCHEMA,
      record_id: {
        type: 'string',
        description: 'Record ID to retrieve',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Fields to include in the response',
      },
    },
    required: ['resource_type', 'record_id'],
  },
  annotations: {
    readOnlyHint: true,
  },
};

/**
 * Create record tool
 */
export const createRecordDefinition: ToolDefinition = {
  name: 'create-record',
  description: formatDescription({
    capability: 'Create new Attio records (companies, people, deals, tasks)',
    boundaries:
      'update existing records, attach files, or bypass required fields',
    constraints:
      'Requires resource_type plus attributes map that matches records_discover_attributes output',
    recoveryHint:
      'If validation fails, call records_discover_attributes to confirm required fields',
  }),
  inputSchema: {
    type: 'object',
    properties: {
      resource_type: RESOURCE_TYPE_SCHEMA,
      record_data: {
        type: 'object',
        description: 'Data to create the record with',
        additionalProperties: true,
      },
      return_details: {
        type: 'boolean',
        description: 'Return full record details after creation',
        default: true,
      },
    },
    required: ['resource_type', 'record_data'],
  },
};

/**
 * Update record tool
 */
export const updateRecordDefinition: ToolDefinition = {
  name: 'update-record',
  description: formatDescription({
    capability:
      'Update existing Attio record fields across all supported resource types',
    boundaries: 'create new records, delete data, or manage list memberships',
    constraints:
      'Requires record_id and attributes payload; supports partial updates',
    recoveryHint:
      'Call records_get_details first to inspect the latest values before editing',
  }),
  inputSchema: {
    type: 'object',
    properties: {
      resource_type: RESOURCE_TYPE_SCHEMA,
      record_id: {
        type: 'string',
        description: 'Record ID to update',
      },
      record_data: {
        type: 'object',
        description: 'Updated data for the record',
        additionalProperties: true,
      },
      return_details: {
        type: 'boolean',
        description: 'Return full record details after update',
        default: true,
      },
    },
    required: ['resource_type', 'record_id', 'record_data'],
  },
};

/**
 * Delete record tool
 */
export const deleteRecordDefinition: ToolDefinition = {
  name: 'delete-record',
  description: formatDescription({
    capability:
      'Delete an Attio record from its object (company, person, deal, task)',
    boundaries:
      'cascade delete related data or clean up list memberships automatically',
    constraints:
      'Requires record_id and resource_type; operation is irreversible once confirmed',
    recoveryHint:
      'If uncertain, fetch with records_get_details to confirm the target before deletion',
  }),
  inputSchema: {
    type: 'object',
    properties: {
      resource_type: RESOURCE_TYPE_SCHEMA,
      record_id: {
        type: 'string',
        description: 'Record ID to delete',
      },
    },
    required: ['resource_type', 'record_id'],
  },
};

/**
 * Discover attributes tool
 */
export const discoverAttributesDefinition: ToolDefinition = {
  name: 'records_discover_attributes',
  description: formatDescription({
    capability:
      'Discover available attributes (standard/custom) for a resource, including their types',
    boundaries: 'alter schema or create fields',
    constraints:
      'Requires resource_type; optional categories selects subsets. Returns attribute types like text, select, actor-reference, record-reference, etc. Actor-reference fields (e.g., owner) require special filter handling.',
    recoveryHint:
      'Use this tool first to understand attribute types before filtering',
  }),
  inputSchema: {
    type: 'object',
    properties: {
      resource_type: RESOURCE_TYPE_SCHEMA,
      categories: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Attribute categories to filter by (e.g., standard, custom)',
      },
    },
    required: ['resource_type'],
  },
  annotations: {
    readOnlyHint: true,
  },
};

/**
 * Create note tool
 */
export const createNoteDefinition: ToolDefinition = {
  name: 'create-note',
  description: formatDescription({
    capability:
      'Create note for companies, people, or deals with optional markdown formatting',
    boundaries: 'update or delete notes; creates only',
    constraints:
      'Requires resource_type, record_id, title, content. Optional format (plaintext or markdown)',
    recoveryHint: 'If record not found, use records_search first',
  }),
  inputSchema: {
    type: 'object',
    properties: {
      resource_type: {
        type: 'string',
        enum: ['companies', 'people', 'deals'],
        description: 'Target resource type for the note',
      },
      record_id: {
        type: 'string',
        description: 'ID of the record to attach the note to',
      },
      title: {
        type: 'string',
        description: 'Title of the note',
      },
      content: {
        type: 'string',
        description: 'Content of the note',
      },
      format: {
        type: 'string',
        enum: ['plaintext', 'markdown'],
        description: 'Content format (default: plaintext)',
        default: 'plaintext',
      },
    },
    required: ['resource_type', 'record_id', 'title', 'content'],
  },
};

/**
 * List notes tool
 */
export const listNotesDefinition: ToolDefinition = {
  name: 'list-notes',
  description: formatDescription({
    capability: 'Retrieve notes for a record with timestamps',
    boundaries: 'create or modify notes; read-only',
    constraints: 'Requires resource_type, record_id; sorted by creation date',
    recoveryHint: 'If empty, verify record has notes with records_get_details',
  }),
  inputSchema: {
    type: 'object',
    properties: {
      resource_type: {
        type: 'string',
        enum: ['companies', 'people', 'deals'],
        description: 'Type of resource to list notes for',
      },
      record_id: {
        type: 'string',
        description: 'Record ID to list notes for',
      },
      ...PAGINATION_SCHEMA,
    },
    required: ['resource_type', 'record_id'],
  },
  annotations: {
    readOnlyHint: true,
  },
};

/**
 * All core tool definitions
 */
export const coreToolDefinitions: Record<string, ToolDefinition> = {
  'aaa-health-check': healthCheckDefinition,
  records_search: searchRecordsDefinition,
  records_get_details: getRecordDetailsDefinition,
  'create-record': createRecordDefinition,
  'update-record': updateRecordDefinition,
  'delete-record': deleteRecordDefinition,
  records_discover_attributes: discoverAttributesDefinition,
  'create-note': createNoteDefinition,
  'list-notes': listNotesDefinition,
};

/**
 * Get all tool definitions as an array (for MCP ListTools)
 */
export function getToolDefinitions(): ToolDefinition[] {
  return Object.values(coreToolDefinitions);
}

/**
 * Get a specific tool definition by name
 */
export function getToolDefinition(name: string): ToolDefinition | undefined {
  return coreToolDefinitions[name];
}
