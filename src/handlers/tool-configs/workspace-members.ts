import { AttioWorkspaceMember } from '../../types/attio.js';
import {
  listWorkspaceMembers,
  searchWorkspaceMembers,
  getWorkspaceMember,
} from '../../objects/workspace-members.js';
import { ToolConfig } from '../tool-types.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';

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

export const workspaceMembersToolConfigs = {
  listWorkspaceMembers: {
    name: 'list-workspace-members',
    handler: listWorkspaceMembers,
    formatResult: (members: AttioWorkspaceMember[]) =>
      formatWorkspaceMembersList(members, '', 'No workspace members found.'),
  } as ToolConfig,

  searchWorkspaceMembers: {
    name: 'search-workspace-members',
    handler: searchWorkspaceMembers,
    formatResult: (members: AttioWorkspaceMember[]) =>
      formatWorkspaceMembersList(
        members,
        'matching',
        'No matching workspace members found.'
      ),
  } as ToolConfig,

  getWorkspaceMember: {
    name: 'get-workspace-member',
    handler: getWorkspaceMember,
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
  {
    name: 'list-workspace-members',
    description: formatToolDescription({
      capability:
        'List workspace members to plan assignments and access checks.',
      boundaries: 'change access levels or invite new members; read-only.',
      constraints:
        'Supports optional search, pagination (1-100 per page, default 25).',
      recoveryHint: 'Use search-workspace-members for targeted lookups.',
    }),
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
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  {
    name: 'search-workspace-members',
    description: formatToolDescription({
      capability: 'Search workspace members by name, email, or access role.',
      boundaries: 'modify member profiles or permissions; lookup only.',
      constraints: 'Requires query string (minimum 2 characters).',
      recoveryHint:
        'If no results, list-workspace-members provides the full roster.',
    }),
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
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  {
    name: 'get-workspace-member',
    description: formatToolDescription({
      capability:
        'Retrieve profile and access details for one workspace member.',
      boundaries: 'update member information or change permissions.',
      constraints:
        'Requires workspace_member_id from list/search results; read-only.',
      recoveryHint:
        'Use list-workspace-members to confirm the memberId before retrying.',
    }),
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
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
];
