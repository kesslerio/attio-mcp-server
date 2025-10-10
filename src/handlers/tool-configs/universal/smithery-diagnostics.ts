/**
 * Smithery diagnostic tool for debugging config propagation (Issue #891)
 *
 * This tool exposes sanitized runtime information to help debug why
 * config parameters from Smithery UI aren't reaching the server runtime.
 */

import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import { getContextStats } from '@/api/client-context.js';

/**
 * Tool definition for Smithery diagnostics
 */
export const smitheryDiagnosticsToolDefinition = {
  name: 'smithery-debug-config',
  description: formatToolDescription({
    capability:
      'Retrieve sanitized diagnostic information about Smithery server configuration and runtime environment.',
    boundaries: 'expose API key values, write data, or modify configuration.',
    constraints:
      'Returns boolean flags and counts only, no sensitive data. Read-only operation.',
    recoveryHint:
      'Use this tool to debug authentication issues in Smithery hosted deployments. Compare local vs hosted results.',
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
  name: 'smithery-debug-config',
  handler: async () => {
    // Gather diagnostic info
    const contextStats = getContextStats();
    const envDiag = {
      hasAttioApiKey: Boolean(process.env.ATTIO_API_KEY),
      attioApiKeyLength: process.env.ATTIO_API_KEY?.length || 0,
      hasAttioWorkspaceId: Boolean(process.env.ATTIO_WORKSPACE_ID),
      mcpLogLevel: process.env.MCP_LOG_LEVEL || 'not set',
      mcpServerMode: process.env.MCP_SERVER_MODE || 'not set',
      attioMcpToolMode: process.env.ATTIO_MCP_TOOL_MODE || 'not set',
      nodeEnv: process.env.NODE_ENV || 'not set',
    };

    // Determine if we have API key access through context
    const hasContextApiKey =
      contextStats.hasDirectApiKey || contextStats.hasApiKeyGetter;

    const diagnostic = {
      timestamp: new Date().toISOString(),
      runtime: {
        platform: 'smithery-typescript',
        nodeVersion: process.version,
        startCommand: 'http',
      },
      environment: envDiag,
      context: contextStats,
      summary: {
        configurationSource: hasContextApiKey
          ? 'context'
          : envDiag.hasAttioApiKey
            ? 'environment'
            : 'none',
        isAuthenticated: hasContextApiKey || envDiag.hasAttioApiKey,
        apiKeyAvailable: Boolean(
          contextStats.hasDirectApiKey ||
            contextStats.hasApiKeyGetter ||
            envDiag.hasAttioApiKey
        ),
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
      const data = JSON.parse(textContent) as {
        timestamp: string;
        runtime: { platform: string; nodeVersion: string };
        environment: Record<string, unknown>;
        context: Record<string, unknown>;
        summary: {
          configurationSource: string;
          isAuthenticated: boolean;
          apiKeyAvailable: boolean;
        };
      };

      const statusIcon = data.summary.isAuthenticated ? '✅' : '❌';
      const parts: string[] = [
        `${statusIcon} Smithery Diagnostics`,
        `Auth: ${data.summary.isAuthenticated ? 'OK' : 'FAILED'}`,
        `Source: ${data.summary.configurationSource}`,
        `Runtime: ${data.runtime.platform}`,
        `Node: ${data.runtime.nodeVersion}`,
      ];

      return parts.join(' | ');
    } catch {
      return '⚠️ Failed to parse diagnostic data';
    }
  },
};
