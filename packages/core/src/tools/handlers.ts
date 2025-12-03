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
function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
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
    tasks: 'tasks',
    records: 'records',
    notes: 'notes',
    workspace_members: 'workspace-members',
  };
  return mapping[resourceType] || resourceType;
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
 * Search records handler
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
    const objectSlug = getObjectSlug(resource_type);

    // Build request body
    const body: Record<string, unknown> = {
      limit,
      offset,
    };

    if (query) {
      body.filter = {
        $or: [
          { name: { $contains: query } },
          { full_name: { $contains: query } },
        ],
      };
    }

    if (filters?.filters && filters.filters.length > 0) {
      // Convert our filter format to Attio's format
      const attioFilters = filters.filters.map((f) => ({
        attribute: f.attribute.slug,
        [f.condition]: f.value,
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
    const message = error instanceof Error ? error.message : 'Search failed';
    return errorResult(message);
  }
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
    const message =
      error instanceof Error ? error.message : 'Failed to get record';
    return errorResult(message);
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

    // Transform record_data to Attio's expected format
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record_data)) {
      if (value !== undefined && value !== null) {
        data[key] = value;
      }
    }

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
    const message =
      error instanceof Error ? error.message : 'Failed to create record';
    return errorResult(message);
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

    // Transform record_data to Attio's expected format
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record_data)) {
      if (value !== undefined && value !== null) {
        data[key] = value;
      }
    }

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
    const message =
      error instanceof Error ? error.message : 'Failed to update record';
    return errorResult(message);
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
    const message =
      error instanceof Error ? error.message : 'Failed to delete record';
    return errorResult(message);
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
    const message =
      error instanceof Error ? error.message : 'Failed to discover attributes';
    return errorResult(message);
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
        parent_object: resource_type,
        parent_record_id: record_id,
        title,
        content_plaintext: content,
        format,
      }
    );

    const note = response.data.data;
    const noteId = note.id?.note_id || 'unknown';

    return successResult(
      `Created note "${title}" (ID: ${noteId}) on ${resource_type} ${record_id}`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create note';
    return errorResult(message);
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

    const response = await client.post<AttioApiResponse<AttioNote[]>>(
      '/v2/notes/query',
      {
        filter: {
          parent_object: resource_type,
          parent_record_id: record_id,
        },
        limit,
        offset,
      }
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
    const message =
      error instanceof Error ? error.message : 'Failed to list notes';
    return errorResult(message);
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
