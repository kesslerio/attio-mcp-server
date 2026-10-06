/**
 * Smithery diagnostic tool for debugging config propagation (Issue #891)
 *
 * This tool exposes sanitized runtime information to help debug why
 * config parameters from Smithery UI aren't reaching the server runtime.
 */

import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import { getContextStats } from '@/api/client-context.js';
import {
  diagnosticsDataSchema,
  diagnosticsResultContract,
} from '@/handlers/tools/result-schemas.js';

export interface SmitheryDiagnosticsPayload {
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
  name: 'diagnostics_get',
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
  name: 'diagnostics_get',
  ...diagnosticsResultContract,
  structuredOutput: (payload: unknown): Record<string, unknown> => ({
    data: diagnosticsDataSchema.parse(payload),
  }),
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

    // The adapter owns the envelope; the handler returns the domain payload.
    return diagnostic;
  },
  formatResult: (res: Record<string, unknown>): string => {
    const data = res as unknown as SmitheryDiagnosticsPayload | undefined;
    if (!data?.runtime || !data?.environment || !data?.context) {
      return '⚠️ No diagnostic data available';
    }

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
  },
};
