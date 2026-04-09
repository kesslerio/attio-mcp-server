/**
 * Smithery diagnostic tool for debugging config propagation (Issue #891)
 *
 * This tool exposes sanitized runtime information to help debug why
 * config parameters from Smithery UI aren't reaching the server runtime.
 */

import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import { getContextStats } from '@/api/client-context.js';

interface SmitheryDiagnosticsPayload {
  timestamp: string;
  runtime: {
    platform: string;
    nodeVersion: string;
    startCommand: string;
  };
  environment: {
    hasAttioWorkspaceId: boolean;
    mcpLogLevel: string;
    mcpServerMode: string;
    attioMcpToolMode: string;
    nodeEnv: string;
  };
  context: {
    hasContext: boolean;
    hasWeakMapStorage: boolean;
    hasFallbackStorage: boolean;
  };
}

/**
 * Tool definition for Smithery diagnostics
 */
export const smitheryDiagnosticsToolDefinition = {
  name: 'smithery_debug_config',
  description: formatToolDescription({
    capability:
      'Retrieve non-sensitive diagnostic information about Smithery runtime configuration propagation.',
    boundaries:
      'expose credentials or auth state, write data, or modify configuration.',
    constraints:
      'Returns runtime, workspace, and context-storage diagnostics only. Read-only operation.',
    recoveryHint:
      'Use this tool to compare runtime mode, workspace configuration, and context storage state across deployments.',
  }),
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};

/**
 * Handler for Smithery diagnostics tool
 */
export const smitheryDiagnosticsConfig = {
  name: 'smithery_debug_config',
  handler: async () => {
    const contextStats = getContextStats();
    const diagnostic: SmitheryDiagnosticsPayload = {
      timestamp: new Date().toISOString(),
      runtime: {
        platform: 'smithery-typescript',
        nodeVersion: process.version,
        startCommand: 'http',
      },
      environment: {
        hasAttioWorkspaceId: Boolean(process.env.ATTIO_WORKSPACE_ID),
        mcpLogLevel: process.env.MCP_LOG_LEVEL || 'not set',
        mcpServerMode: process.env.MCP_SERVER_MODE || 'not set',
        attioMcpToolMode: process.env.ATTIO_MCP_TOOL_MODE || 'not set',
        nodeEnv: process.env.NODE_ENV || 'not set',
      },
      context: {
        hasContext: contextStats.hasContext,
        hasWeakMapStorage: contextStats.hasWeakMapStorage,
        hasFallbackStorage: contextStats.hasFallbackStorage,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnostic, null, 2),
        },
      ],
      isError: false,
    };
  },
  formatResult: (res: Record<string, unknown>): string => {
    const content = res?.content as Array<Record<string, unknown>> | undefined;
    const textContent = content?.[0]?.text as string | undefined;

    if (!textContent) {
      return '⚠️ No diagnostic data available';
    }

    try {
      const data = JSON.parse(textContent) as SmitheryDiagnosticsPayload;
      const contextState = data.context.hasWeakMapStorage
        ? 'weakmap'
        : data.context.hasFallbackStorage
          ? 'fallback'
          : 'missing';
      const workspaceState = data.environment.hasAttioWorkspaceId
        ? 'configured'
        : 'missing';
      const parts: string[] = [
        'Smithery Diagnostics',
        `Runtime: ${data.runtime.platform}`,
        `Node: ${data.runtime.nodeVersion}`,
        `Context: ${contextState}`,
        `Workspace: ${workspaceState}`,
      ];

      return parts.join(' | ');
    } catch {
      return '⚠️ Failed to parse diagnostic data';
    }
  },
};
