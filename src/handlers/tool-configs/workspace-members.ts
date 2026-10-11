import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';
import { AttioWorkspaceMember } from '@/types/attio.js';
import { z } from 'zod';
import {
  listWorkspaceMembers,
  searchWorkspaceMembers,
  getWorkspaceMember,
} from '@/objects/workspace-members.js';
import { ToolConfig } from '@/handlers/tool-types.js';
import {
  workspaceMemberCollectionResultContract,
  workspaceMemberDataSchema,
  workspaceMemberResultContract,
} from '@/handlers/tools/result-schemas.js';
import { boundedPaginationMetadata } from '@/handlers/tools/result-cursor.js';

/** Member responses always publish the native workspace_member_id identifier. */
function normalizeMemberCollection(result: unknown): Record<string, unknown> {
  // Lists expose their whole (already bounded) member directory per request.
  const data = z.array(workspaceMemberDataSchema).parse(result);
  return {
    data,
    count: data.length,
    next_cursor: null,
    pagination: boundedPaginationMetadata(
      (result as { truncated?: boolean }).truncated ?? true
    ),
  };
}

function normalizeMember(result: unknown): Record<string, unknown> {
  if (!result || typeof result !== 'object') {
    // An absent member is a failure, never an empty success (KTD5).
    throw Object.assign(new Error('Workspace member not found'), {
      status: 404,
    });
  }
  return { data: workspaceMemberDataSchema.parse(result) };
}

const formatWorkspaceMemberSummary = (member: AttioWorkspaceMember): string => {
  const name = [member.first_name, member.last_name].filter(Boolean).join(' ');
  const displayName = name || 'Unknown';
  const email = member.email_address || 'No email';
  const access = member.access_level || 'unknown';

  return `- ${displayName} (${email}) [${access}] - ID: ${member.id.workspace_member_id}`;
};

const formatWorkspaceMembersList = (
  members: AttioWorkspaceMember[] | null | undefined,
  descriptor: string,
  emptyMessage: string
): string => {
  if (!members || members.length === 0) return emptyMessage;

  const descriptorText = descriptor
    ? `${descriptor} workspace members`
    : 'workspace members';
  return `Found ${members.length} ${descriptorText}:\n${members
    .map(formatWorkspaceMemberSummary)
    .join('\n')}`;
};

type WorkspaceMemberToolArgs = Record<string, unknown>;

const optionalString = (
  args: WorkspaceMemberToolArgs,
  field: string
): string | undefined => {
  const value = args[field];
  return typeof value === 'string' ? value : undefined;
};

const requiredString = (
  args: WorkspaceMemberToolArgs,
  field: string
): string => {
  const value = optionalString(args, field);
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }
  return trimmed;
};

const optionalNumber = (
  args: WorkspaceMemberToolArgs,
  field: string,
  defaultValue: number
): number => {
  const value = args[field];
  return typeof value === 'number' ? value : defaultValue;
};

export const workspaceMembersToolConfigs = {
  listWorkspaceMembers: {
    name: 'workspace_members_list',
    ...workspaceMemberCollectionResultContract,
    structuredOutput: normalizeMemberCollection,
    handler: async (args: WorkspaceMemberToolArgs = {}) =>
      listWorkspaceMembers(
        optionalString(args, 'search'),
        optionalNumber(args, 'page', 1),
        optionalNumber(args, 'pageSize', 25)
      ),
    formatResult: (members: AttioWorkspaceMember[]) =>
      formatWorkspaceMembersList(members, '', 'No workspace members found.'),
  } as ToolConfig,

  searchWorkspaceMembers: {
    name: 'workspace_members_search',
    ...workspaceMemberCollectionResultContract,
    structuredOutput: normalizeMemberCollection,
    handler: async (args: WorkspaceMemberToolArgs = {}) =>
      searchWorkspaceMembers(requiredString(args, 'query')),
    formatResult: (members: AttioWorkspaceMember[]) =>
      formatWorkspaceMembersList(
        members,
        'matching',
        'No matching workspace members found.'
      ),
  } as ToolConfig,

  getWorkspaceMember: {
    name: 'workspace_members_get',
    ...workspaceMemberResultContract,
    structuredOutput: normalizeMember,
    handler: async (args: WorkspaceMemberToolArgs = {}) =>
      getWorkspaceMember(requiredString(args, 'memberId')),
    formatResult: (member: AttioWorkspaceMember | null | undefined) => {
      if (!member) {
        return 'Workspace member not found.';
      }
      const name = [member.first_name, member.last_name]
        .filter(Boolean)
        .join(' ');
      const displayName = name || 'Unknown';
      const email = member.email_address || 'No email';
      const access = member.access_level || 'unknown';

      return `Workspace Member Details:
- Name: ${displayName}
- Email: ${email}
- Access Level: ${access}
- ID: ${member.id.workspace_member_id}
- Created: ${member.created_at}
- Updated: ${member.updated_at}`;
    },
  } as ToolConfig,
};

export const workspaceMembersToolDefinitions = [
  defineOperationTool({
    name: 'workspace_members_list',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'read',
        resourceTypes: ['workspace_members'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'page', supported: true, cap: 100 },
      },
      guidance: {
        capability:
          'List workspace members for assignment and access planning.',
        boundaries: 'change access levels or invite members.',
        constraints:
          'Optional search and page paging (1-100 per page, default 25).',
        recovery: 'Narrow with workspace_members_search for a named person.',
        alternatives: ['workspace_members_search', 'workspace_members_get'],
      },
    },
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description:
            'Optional case-insensitive match on member name or email.',
          example: 'Taylor',
          minLength: 1,
        },
        page: {
          type: 'integer',
          description: 'Page number (1-indexed).',
          default: 1,
          minimum: 1,
          example: 1,
        },
        pageSize: {
          type: 'integer',
          description: 'Number of results per page (max 100).',
          default: 25,
          minimum: 1,
          maximum: 100,
          example: 50,
        },
      },
      additionalProperties: false,
    },
  }),
  defineOperationTool({
    name: 'workspace_members_search',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'search',
        resourceTypes: ['workspace_members'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'none', supported: false, cap: null },
      },
      guidance: {
        capability: 'Search workspace members by name, email, or role.',
        boundaries: 'modify member profiles or permissions.',
        constraints: 'Requires a query of at least 2 characters.',
        recovery: 'If nothing matches, read the full roster instead.',
        alternatives: ['workspace_members_list'],
      },
    },
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term for member name, email address, or role.',
          minLength: 2,
          example: 'operations lead',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  }),
  defineOperationTool({
    name: 'workspace_members_get',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'read',
        resourceTypes: ['workspace_members'],
        readOnly: true,
        destructive: false,
        idempotent: true,
      },
      guidance: {
        capability: 'Read profile and access details for one member.',
        boundaries: 'update member information or permissions.',
        constraints: 'Requires a memberId taken from list or search results.',
        recovery: 'Confirm the identifier with workspace_members_list.',
        alternatives: ['workspace_members_list'],
      },
    },
    inputSchema: {
      type: 'object',
      properties: {
        memberId: {
          type: 'string',
          description: 'Workspace member ID (UUID).',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      required: ['memberId'],
      additionalProperties: false,
    },
  }),
];
