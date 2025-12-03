/**
 * Tool handlers for Attio MCP - edge-compatible implementations
 *
 * These handlers use the HttpClient interface and work in any JavaScript runtime
 * (Node.js, Cloudflare Workers, Deno, browsers with CORS)
 */

import type { HttpClient } from '../api/http-client.js';
import type {
  ResourceType,
  ToolResult,
  AttioRecord,
  AttioApiResponse,
  AttioFilterConfig,
  AttioNote,
} from '../types/index.js';

/**
 * Create a successful tool result
 */
function successResult(text: string): ToolResult {
  return {
    content: [{ type: 'text', text }],
    isError: false,
  };
}

/**
 * Create an error tool result
 */
function errorResult(message: string, details?: unknown): ToolResult {
  let text = `Error: ${message}`;
  if (details) {
    text += `\n\nDetails: ${JSON.stringify(details, null, 2)}`;
  }
  return {
    content: [{ type: 'text', text }],
    isError: true,
  };
}

/**
 * Extract error message from various error shapes
 */
function extractErrorInfo(error: unknown): {
  message: string;
  details?: unknown;
} {
  // HttpError from our client: { status, message, details }
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as {
      message: string;
      details?: unknown;
      status?: number;
    };
    return {
      message: err.status ? `[${err.status}] ${err.message}` : err.message,
      details: err.details,
    };
  }

  // Standard Error
  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unknown error' };
}

/**
 * Extract display name from a record
 */
function extractDisplayName(record: AttioRecord): string {
  const values = record.values;

  // Try common name fields
  for (const field of ['name', 'full_name', 'title', 'company_name']) {
    const fieldValue = values[field];
    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      const first = fieldValue[0];
      if (first?.value && typeof first.value === 'string') {
        return first.value;
      }
      if (first?.full_name && typeof first.full_name === 'string') {
        return first.full_name;
      }
    }
  }

  // Try email as fallback
  const emails = values.email_addresses;
  if (Array.isArray(emails) && emails.length > 0 && emails[0]?.email_address) {
    return String(emails[0].email_address);
  }

  return 'Unnamed';
}

/**
 * Format a list of records for display
 */
function formatRecordList(
  records: AttioRecord[],
  resourceType: string
): string {
  if (!records || records.length === 0) {
    return `No ${resourceType} found`;
  }

  const lines = records.map((record) => {
    const name = extractDisplayName(record);
    const id = record.id?.record_id || 'unknown';
    return `- ${name} (ID: ${id})`;
  });

  return `Found ${records.length} ${resourceType}:\n${lines.join('\n')}`;
}

/**
 * Format a single record for display
 */
function formatRecordDetails(
  record: AttioRecord,
  resourceType: string
): string {
  const name = extractDisplayName(record);
  const id = record.id?.record_id || 'unknown';

  const lines: string[] = [`${resourceType}: ${name}`, `ID: ${id}`];

  // Add key fields
  const values = record.values;
  for (const [key, fieldValue] of Object.entries(values)) {
    if (!Array.isArray(fieldValue) || fieldValue.length === 0) continue;

    const first = fieldValue[0];
    let displayValue: string | undefined;

    if (first?.value !== undefined && first.value !== null) {
      displayValue = String(first.value);
    } else if (first?.email_address) {
      displayValue = String(first.email_address);
    } else if (first?.phone_number) {
      displayValue = String(first.phone_number);
    } else if (first?.full_name) {
      displayValue = String(first.full_name);
    }

    if (displayValue && displayValue !== 'undefined') {
      lines.push(`${key}: ${displayValue}`);
    }
  }

  return lines.join('\n');
}

/**
 * Map resource type to Attio object slug
 */
function getObjectSlug(resourceType: string): string {
  const mapping: Record<string, string> = {
    companies: 'companies',
    people: 'people',
    deals: 'deals',
    users: 'users',
    workspaces: 'workspaces',
  };
  return mapping[resourceType] || resourceType;
}

/**
 * Special field types that require specific value structures
 */
const SPECIAL_FIELD_FORMATS: Record<string, string> = {
  domains: 'domain',
  email_addresses: 'email_address',
  phone_numbers: 'original_phone_number',
};

/**
 * Transform user-provided record data into Attio's expected format
 *
 * Attio requires:
 * 1. All values wrapped in a `values` object
 * 2. Each field value as an array: [{value: "..."}] or [{domain: "..."}] etc.
 */
function transformRecordData(
  recordData: Record<string, unknown>
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(recordData)) {
    if (value === undefined || value === null) continue;

    // If value is already in Attio array format [{...}], pass through
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object'
    ) {
      values[key] = value;
      continue;
    }

    // Check if this is a special field type
    const specialKey = SPECIAL_FIELD_FORMATS[key];
    if (specialKey) {
      // Handle array of simple values (e.g., multiple domains)
      if (Array.isArray(value)) {
        values[key] = value.map((v) => ({ [specialKey]: String(v) }));
      } else {
        values[key] = [{ [specialKey]: String(value) }];
      }
      continue;
    }

    // Standard field: wrap in [{value: ...}]
    if (Array.isArray(value)) {
      // Array of simple values
      values[key] = value.map((v) => ({ value: v }));
    } else {
      values[key] = [{ value }];
    }
  }

  return { values };
}

/**
 * Health check handler - no API calls required
 */
export async function handleHealthCheck(params: {
  echo?: string;
}): Promise<ToolResult> {
  const payload = {
    ok: true,
    name: 'attio-mcp-core',
    version: '0.1.0',
    echo: params.echo,
    timestamp: new Date().toISOString(),
    runtime:
      typeof (globalThis as Record<string, unknown>).Deno !== 'undefined'
        ? 'deno'
        : typeof (globalThis as Record<string, unknown>).Bun !== 'undefined'
          ? 'bun'
          : typeof (globalThis as Record<string, unknown>).caches !==
              'undefined'
            ? 'cloudflare-workers'
            : 'node',
  };

  return successResult(JSON.stringify(payload, null, 2));
}

/**
 * Build search filter based on resource type
 * Different objects have different name field structures
 */
function buildSearchFilter(
  resourceType: string,
  query: string
): Record<string, unknown> {
  // For people, 'name' is a personal-name type with 'full_name' sub-property
  if (resourceType === 'people') {
    return {
      $or: [
        { name: { full_name: { $contains: query } } },
        { email_addresses: { email_address: { $contains: query } } },
      ],
    };
  }

  // For companies and other objects, 'name' is a plain text field
  // Use shorthand filter which does contains match
  return {
    name: { $contains: query },
  };
}

/**
 * Search records handler
 * Routes to appropriate API based on resource type:
 * - tasks: /v2/tasks (GET with query params)
 * - workspace_members: /v2/workspace_members (GET)
 * - objects: /v2/objects/{slug}/records/query (POST)
 */
export async function handleSearchRecords(
  client: HttpClient,
  params: {
    resource_type: ResourceType;
    query?: string;
    filters?: AttioFilterConfig;
    limit?: number;
    offset?: number;
  }
): Promise<ToolResult> {
  try {
    const { resource_type, query, filters, limit = 10, offset = 0 } = params;

    // Special routing for tasks - uses /v2/tasks endpoint
    if (resource_type === 'tasks') {
      return await handleSearchTasks(client, { query, limit, offset });
    }

    // Special routing for workspace_members - uses /v2/workspace_members endpoint
    if (resource_type === 'workspace_members') {
      return await handleListWorkspaceMembers(client);
    }

    const objectSlug = getObjectSlug(resource_type);

    // Build request body for objects API
    const body: Record<string, unknown> = {
      limit,
      offset,
    };

    if (query) {
      body.filter = buildSearchFilter(resource_type, query);
    }

    if (filters?.filters && filters.filters.length > 0) {
      // Convert our filter format to Attio's format
      const attioFilters = filters.filters.map((f) => ({
        [f.attribute.slug]: { [f.condition]: f.value },
      }));

      if (filters.matchAny) {
        body.filter = { $or: attioFilters };
      } else {
        body.filter = { $and: attioFilters };
      }
    }

    const response = await client.post<AttioApiResponse<AttioRecord[]>>(
      `/v2/objects/${objectSlug}/records/query`,
      body
    );

    return successResult(formatRecordList(response.data.data, resource_type));
  } catch (error) {
    const { message, details } = extractErrorInfo(error);
    return errorResult(message || 'Search failed', details);
  }
}

/**
 * Search tasks using dedicated /v2/tasks endpoint
 */
async function handleSearchTasks(
  client: HttpClient,
  params: { query?: string; limit?: number; offset?: number }
): Promise<ToolResult> {
  const { limit = 10, offset = 0 } = params;

  // Tasks API uses GET with query params
  const queryParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await client.get<{
    data: Array<{
      id: { task_id: string };
      content_plaintext?: string;
      deadline_at?: string;
      is_completed?: boolean;
      assignees?: Array<{ referenced_actor_id: string }>;
      created_at?: string;
    }>;
  }>(`/v2/tasks?${queryParams.toString()}`);

  const tasks = response.data.data || [];

  if (tasks.length === 0) {
    return successResult('No tasks found');
  }

  const lines = [`Found ${tasks.length} tasks:`];
  for (const task of tasks) {
    const status = task.is_completed ? '✓' : '○';
    const content = task.content_plaintext || 'No content';
    const deadline = task.deadline_at
      ? ` (due: ${task.deadline_at.split('T')[0]})`
      : '';
    lines.push(`${status} ${content}${deadline} (ID: ${task.id.task_id})`);
  }

  return successResult(lines.join('\n'));
}

/**
 * List workspace members using dedicated /v2/workspace_members endpoint
 */
async function handleListWorkspaceMembers(
  client: HttpClient
): Promise<ToolResult> {
  const response = await client.get<{
    data: Array<{
      id: { workspace_member_id: string };
      first_name?: string;
      last_name?: string;
      email_address?: string;
      access_level?: string;
    }>;
  }>('/v2/workspace_members');

  const members = response.data.data || [];

  if (members.length === 0) {
    return successResult('No workspace members found');
  }

  const lines = [`Found ${members.length} workspace members:`];
  for (const member of members) {
    const name =
      [member.first_name, member.last_name].filter(Boolean).join(' ') ||
      'Unknown';
    const email = member.email_address ? ` (${member.email_address})` : '';
    const role = member.access_level ? ` - ${member.access_level}` : '';
    lines.push(
      `- ${name}${email}${role} (ID: ${member.id.workspace_member_id})`
    );
  }

  return successResult(lines.join('\n'));
}

/**
 * Get record details handler
 */
export async function handleGetRecordDetails(
  client: HttpClient,
  params: {
    resource_type: ResourceType;
    record_id: string;
    fields?: string[];
  }
): Promise<ToolResult> {
  try {
    const { resource_type, record_id } = params;
    const objectSlug = getObjectSlug(resource_type);

    const response = await client.get<AttioApiResponse<AttioRecord>>(
      `/v2/objects/${objectSlug}/records/${record_id}`
    );

    return successResult(
      formatRecordDetails(response.data.data, resource_type)
    );
  } catch (error) {
    const { message, details } = extractErrorInfo(error);
    return errorResult(message || 'Failed to get record', details);
  }
}

/**
 * Create record handler
 */
export async function handleCreateRecord(
  client: HttpClient,
  params: {
    resource_type: ResourceType;
    record_data: Record<string, unknown>;
    return_details?: boolean;
  }
): Promise<ToolResult> {
  try {
    const { resource_type, record_data, return_details = true } = params;
    const objectSlug = getObjectSlug(resource_type);

    // Transform record_data to Attio's expected format with values wrapper
    const data = transformRecordData(record_data);

    const response = await client.post<AttioApiResponse<AttioRecord>>(
      `/v2/objects/${objectSlug}/records`,
      { data }
    );

    const record = response.data.data;
    const id = record.id?.record_id || 'unknown';

    if (return_details) {
      return successResult(
        `Created ${resource_type} record:\n${formatRecordDetails(record, resource_type)}`
      );
    }

    return successResult(`Created ${resource_type} record with ID: ${id}`);
  } catch (error) {
    const { message, details } = extractErrorInfo(error);
    return errorResult(message || 'Failed to create record', details);
  }
}

/**
 * Update record handler
 */
export async function handleUpdateRecord(
  client: HttpClient,
  params: {
    resource_type: ResourceType;
    record_id: string;
    record_data: Record<string, unknown>;
    return_details?: boolean;
  }
): Promise<ToolResult> {
  try {
    const {
      resource_type,
      record_id,
      record_data,
      return_details = true,
    } = params;
    const objectSlug = getObjectSlug(resource_type);

    // Transform record_data to Attio's expected format with values wrapper
    const data = transformRecordData(record_data);

    const response = await client.patch<AttioApiResponse<AttioRecord>>(
      `/v2/objects/${objectSlug}/records/${record_id}`,
      { data }
    );

    const record = response.data.data;

    if (return_details) {
      return successResult(
        `Updated ${resource_type} record:\n${formatRecordDetails(record, resource_type)}`
      );
    }

    return successResult(
      `Updated ${resource_type} record with ID: ${record_id}`
    );
  } catch (error) {
    const { message, details } = extractErrorInfo(error);
    return errorResult(message || 'Failed to update record', details);
  }
}

/**
 * Delete record handler
 */
export async function handleDeleteRecord(
  client: HttpClient,
  params: {
    resource_type: ResourceType;
    record_id: string;
  }
): Promise<ToolResult> {
  try {
    const { resource_type, record_id } = params;
    const objectSlug = getObjectSlug(resource_type);

    await client.delete(`/v2/objects/${objectSlug}/records/${record_id}`);

    return successResult(
      `Deleted ${resource_type} record with ID: ${record_id}`
    );
  } catch (error) {
    const { message, details } = extractErrorInfo(error);
    return errorResult(message || 'Failed to delete record', details);
  }
}

/**
 * Discover attributes handler
 */
export async function handleDiscoverAttributes(
  client: HttpClient,
  params: {
    resource_type: ResourceType;
    categories?: string[];
  }
): Promise<ToolResult> {
  try {
    const { resource_type, categories } = params;
    const objectSlug = getObjectSlug(resource_type);

    const response = await client.get<
      AttioApiResponse<
        Array<{
          api_slug: string;
          title: string;
          type: string;
          is_required: boolean;
        }>
      >
    >(`/v2/objects/${objectSlug}/attributes`);

    let attributes = response.data.data;

    // Filter by categories if provided
    if (categories && categories.length > 0) {
      // This is a simplified filter - the actual API might have different category handling
      attributes = attributes.filter((attr) =>
        categories.some((cat) =>
          attr.type?.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    if (attributes.length === 0) {
      return successResult(`No attributes found for ${resource_type}`);
    }

    const lines = attributes.map((attr) => {
      const required = attr.is_required ? ' (required)' : '';
      return `- ${attr.api_slug}: ${attr.type}${required} - ${attr.title}`;
    });

    return successResult(
      `Attributes for ${resource_type}:\n${lines.join('\n')}`
    );
  } catch (error) {
    const { message, details } = extractErrorInfo(error);
    return errorResult(message || 'Failed to discover attributes', details);
  }
}

/**
 * Create note handler
 */
export async function handleCreateNote(
  client: HttpClient,
  params: {
    resource_type: 'companies' | 'people' | 'deals';
    record_id: string;
    title: string;
    content: string;
    format?: 'plaintext' | 'markdown';
  }
): Promise<ToolResult> {
  try {
    const {
      resource_type,
      record_id,
      title,
      content,
      format = 'plaintext',
    } = params;

    const response = await client.post<AttioApiResponse<AttioNote>>(
      '/v2/notes',
      {
        data: {
          parent_object: resource_type,
          parent_record_id: record_id,
          title,
          format,
          content, // API expects 'content', not 'content_plaintext'
        },
      }
    );

    const note = response.data.data;
    const noteId = note.id?.note_id || 'unknown';

    return successResult(
      `Created note "${title}" (ID: ${noteId}) on ${resource_type} ${record_id}`
    );
  } catch (error) {
    const { message, details } = extractErrorInfo(error);
    return errorResult(message || 'Failed to create note', details);
  }
}

/**
 * List notes handler
 */
export async function handleListNotes(
  client: HttpClient,
  params: {
    resource_type: 'companies' | 'people' | 'deals';
    record_id: string;
    limit?: number;
    offset?: number;
  }
): Promise<ToolResult> {
  try {
    const { resource_type, record_id, limit = 10, offset = 0 } = params;

    // Notes API uses GET with query params, not POST
    const queryParams = new URLSearchParams({
      parent_object: resource_type,
      parent_record_id: record_id,
      limit: String(limit),
      offset: String(offset),
    });

    const response = await client.get<AttioApiResponse<AttioNote[]>>(
      `/v2/notes?${queryParams.toString()}`
    );

    const notes = response.data.data;

    if (!notes || notes.length === 0) {
      return successResult(`No notes found for ${resource_type} ${record_id}`);
    }

    const lines = notes.map((note) => {
      const noteId = note.id?.note_id || 'unknown';
      const title = note.title || 'Untitled';
      const preview = (note.content_plaintext || '').slice(0, 100);
      return `- ${title} (ID: ${noteId})\n  ${preview}${preview.length >= 100 ? '...' : ''}`;
    });

    return successResult(
      `Notes for ${resource_type} ${record_id}:\n${lines.join('\n')}`
    );
  } catch (error) {
    const { message, details } = extractErrorInfo(error);
    return errorResult(message || 'Failed to list notes', details);
  }
}

/**
 * Handler map for tool dispatch
 */
export type ToolHandler = (
  client: HttpClient,
  params: Record<string, unknown>
) => Promise<ToolResult>;

/**
 * Get handler for a tool by name
 */
export function getToolHandler(
  toolName: string
):
  | ((
      client: HttpClient,
      params: Record<string, unknown>
    ) => Promise<ToolResult>)
  | undefined {
  const handlers: Record<
    string,
    (client: HttpClient, params: Record<string, unknown>) => Promise<ToolResult>
  > = {
    'aaa-health-check': async (_client, params) =>
      handleHealthCheck(params as { echo?: string }),
    records_search: async (client, params) =>
      handleSearchRecords(
        client,
        params as Parameters<typeof handleSearchRecords>[1]
      ),
    records_get_details: async (client, params) =>
      handleGetRecordDetails(
        client,
        params as Parameters<typeof handleGetRecordDetails>[1]
      ),
    'create-record': async (client, params) =>
      handleCreateRecord(
        client,
        params as Parameters<typeof handleCreateRecord>[1]
      ),
    'update-record': async (client, params) =>
      handleUpdateRecord(
        client,
        params as Parameters<typeof handleUpdateRecord>[1]
      ),
    'delete-record': async (client, params) =>
      handleDeleteRecord(
        client,
        params as Parameters<typeof handleDeleteRecord>[1]
      ),
    records_discover_attributes: async (client, params) =>
      handleDiscoverAttributes(
        client,
        params as Parameters<typeof handleDiscoverAttributes>[1]
      ),
    'create-note': async (client, params) =>
      handleCreateNote(
        client,
        params as Parameters<typeof handleCreateNote>[1]
      ),
    'list-notes': async (client, params) =>
      handleListNotes(client, params as Parameters<typeof handleListNotes>[1]),
  };

  return handlers[toolName];
}
