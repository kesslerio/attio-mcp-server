import { AttioWorkspaceMember } from '../../types/attio.js';
import {
  listWorkspaceMembers,
  searchWorkspaceMembers,
  getWorkspaceMember,
} from '../../objects/workspace-members.js';
import { ToolConfig } from '../tool-types.js';

export const workspaceMembersToolConfigs = {
  listWorkspaceMembers: {
    name: 'list-workspace-members',
    handler: listWorkspaceMembers,
    formatResult: (members: AttioWorkspaceMember[]) => {
      if (!members || members.length === 0)
        return 'No workspace members found.';

      return `Found ${members.length} workspace members:\n${members
        .map((member) => {
          const name = [member.first_name, member.last_name]
            .filter(Boolean)
            .join(' ');
          const displayName = name || 'Unknown';
          const email = member.email_address || 'No email';
          const access = member.access_level || 'unknown';
          return `- ${displayName} (${email}) [${access}] - ID: ${member.id.workspace_member_id}`;
        })
        .join('\n')}`;
    },
  } as ToolConfig,

  searchWorkspaceMembers: {
    name: 'search-workspace-members',
    handler: searchWorkspaceMembers,
    formatResult: (members: AttioWorkspaceMember[]) => {
      if (!members || members.length === 0)
        return 'No matching workspace members found.';

      return `Found ${members.length} matching workspace members:\n${members
        .map((member) => {
          const name = [member.first_name, member.last_name]
            .filter(Boolean)
            .join(' ');
          const displayName = name || 'Unknown';
          const email = member.email_address || 'No email';
          const access = member.access_level || 'unknown';
          return `- ${displayName} (${email}) [${access}] - ID: ${member.id.workspace_member_id}`;
        })
        .join('\n')}`;
    },
  } as ToolConfig,

  getWorkspaceMember: {
    name: 'get-workspace-member',
    handler: getWorkspaceMember,
    formatResult: (member: AttioWorkspaceMember) => {
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
    description: 'List all workspace members for task assignment',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search by name or email',
        },
        page: {
          type: 'number',
          description: 'Page number for pagination',
          default: 1,
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page',
          default: 25,
        },
      },
    },
  },
  {
    name: 'search-workspace-members',
    description: 'Search workspace members by name, email, or role',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for name, email, or role',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get-workspace-member',
    description: 'Get details of a specific workspace member',
    inputSchema: {
      type: 'object',
      properties: {
        memberId: {
          type: 'string',
          description: 'The workspace member ID',
        },
      },
      required: ['memberId'],
    },
  },
];
