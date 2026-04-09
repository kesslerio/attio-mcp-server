import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetContextStats } = vi.hoisted(() => ({
  mockGetContextStats: vi.fn(),
}));

vi.mock('@/api/client-context.js', () => ({
  getContextStats: mockGetContextStats,
}));

import {
  smitheryDiagnosticsConfig,
  smitheryDiagnosticsToolDefinition,
} from '@/handlers/tool-configs/universal/smithery-diagnostics.js';

interface SmitheryDiagnosticsResponse {
  content?: Array<{
    type: string;
    text?: string;
  }>;
  isError?: boolean;
}

describe('smithery-diagnostics', () => {
  const originalEnv = {
    ATTIO_API_KEY: process.env.ATTIO_API_KEY,
    ATTIO_WORKSPACE_ID: process.env.ATTIO_WORKSPACE_ID,
    MCP_LOG_LEVEL: process.env.MCP_LOG_LEVEL,
    MCP_SERVER_MODE: process.env.MCP_SERVER_MODE,
    ATTIO_MCP_TOOL_MODE: process.env.ATTIO_MCP_TOOL_MODE,
    NODE_ENV: process.env.NODE_ENV,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.ATTIO_API_KEY = 'attio-secret-value';
    process.env.ATTIO_WORKSPACE_ID = 'workspace-123';
    process.env.MCP_LOG_LEVEL = 'DEBUG';
    process.env.MCP_SERVER_MODE = 'http';
    process.env.ATTIO_MCP_TOOL_MODE = 'universal';
    process.env.NODE_ENV = 'test';

    mockGetContextStats.mockReturnValue({
      hasContext: true,
      hasWeakMapStorage: true,
      hasFallbackStorage: false,
      hasApiKeyGetter: true,
      hasDirectApiKey: true,
      hasDirectAccessToken: true,
      failedContextCacheSize: 2,
    });
  });

  afterEach(() => {
    if (originalEnv.ATTIO_API_KEY === undefined) {
      delete process.env.ATTIO_API_KEY;
    } else {
      process.env.ATTIO_API_KEY = originalEnv.ATTIO_API_KEY;
    }

    if (originalEnv.ATTIO_WORKSPACE_ID === undefined) {
      delete process.env.ATTIO_WORKSPACE_ID;
    } else {
      process.env.ATTIO_WORKSPACE_ID = originalEnv.ATTIO_WORKSPACE_ID;
    }

    if (originalEnv.MCP_LOG_LEVEL === undefined) {
      delete process.env.MCP_LOG_LEVEL;
    } else {
      process.env.MCP_LOG_LEVEL = originalEnv.MCP_LOG_LEVEL;
    }

    if (originalEnv.MCP_SERVER_MODE === undefined) {
      delete process.env.MCP_SERVER_MODE;
    } else {
      process.env.MCP_SERVER_MODE = originalEnv.MCP_SERVER_MODE;
    }

    if (originalEnv.ATTIO_MCP_TOOL_MODE === undefined) {
      delete process.env.ATTIO_MCP_TOOL_MODE;
    } else {
      process.env.ATTIO_MCP_TOOL_MODE = originalEnv.ATTIO_MCP_TOOL_MODE;
    }

    if (originalEnv.NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    }
  });

  it('returns only non-sensitive runtime and context diagnostics', async () => {
    const response =
      (await smitheryDiagnosticsConfig.handler()) as SmitheryDiagnosticsResponse;

    expect(response.isError).toBe(false);
    expect(response.content).toHaveLength(1);
    expect(response.content?.[0]?.type).toBe('text');

    const text = response.content?.[0]?.text;
    expect(typeof text).toBe('string');

    const payload = JSON.parse(text || '{}') as {
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
    };

    expect(payload.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(payload.runtime).toEqual({
      platform: 'smithery-typescript',
      nodeVersion: process.version,
      startCommand: 'http',
    });
    expect(payload.environment).toEqual({
      hasAttioWorkspaceId: true,
      mcpLogLevel: 'DEBUG',
      mcpServerMode: 'http',
      attioMcpToolMode: 'universal',
      nodeEnv: 'test',
    });
    expect(payload.context).toEqual({
      hasContext: true,
      hasWeakMapStorage: true,
      hasFallbackStorage: false,
    });

    expect(payload).not.toHaveProperty('summary');
    expect(payload.environment).not.toHaveProperty('hasAttioApiKey');
    expect(payload.environment).not.toHaveProperty('attioApiKeyLength');
    expect(payload.context).not.toHaveProperty('hasApiKeyGetter');
    expect(payload.context).not.toHaveProperty('hasDirectApiKey');
    expect(payload.context).not.toHaveProperty('hasDirectAccessToken');

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('hasAttioApiKey');
    expect(serialized).not.toContain('attioApiKeyLength');
    expect(serialized).not.toContain('configurationSource');
    expect(serialized).not.toContain('isAuthenticated');
    expect(serialized).not.toContain('apiKeyAvailable');
    expect(serialized).not.toContain('failedContextCacheSize');
  });

  it('formats a neutral runtime summary without auth-state wording', () => {
    const formatted = smitheryDiagnosticsConfig.formatResult({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            timestamp: '2026-04-08T00:00:00.000Z',
            runtime: {
              platform: 'smithery-typescript',
              nodeVersion: 'v22.0.0',
              startCommand: 'http',
            },
            environment: {
              hasAttioWorkspaceId: true,
              mcpLogLevel: 'DEBUG',
              mcpServerMode: 'http',
              attioMcpToolMode: 'universal',
              nodeEnv: 'test',
            },
            context: {
              hasContext: true,
              hasWeakMapStorage: true,
              hasFallbackStorage: false,
              failedContextCacheSize: 0,
            },
          }),
        },
      ],
    });

    expect(formatted).toBe(
      'Smithery Diagnostics | Runtime: smithery-typescript | Node: v22.0.0 | Context: weakmap | Workspace: configured'
    );
    expect(formatted).not.toContain('Auth:');
    expect(formatted).not.toContain('Source:');
    expect(formatted).not.toMatch(/api key/i);
    expect(formatted).not.toMatch(/token/i);
    expect(formatted).not.toMatch(/authenticated|unauthenticated/i);
  });

  it('falls back to missing context and workspace wording without auth details', () => {
    const formatted = smitheryDiagnosticsConfig.formatResult({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            timestamp: '2026-04-08T00:00:00.000Z',
            runtime: {
              platform: 'smithery-typescript',
              nodeVersion: 'v22.0.0',
              startCommand: 'http',
            },
            environment: {
              hasAttioWorkspaceId: false,
              mcpLogLevel: 'not set',
              mcpServerMode: 'not set',
              attioMcpToolMode: 'not set',
              nodeEnv: 'not set',
            },
            context: {
              hasContext: false,
              hasWeakMapStorage: false,
              hasFallbackStorage: false,
              failedContextCacheSize: 0,
            },
          }),
        },
      ],
    });

    expect(formatted).toBe(
      'Smithery Diagnostics | Runtime: smithery-typescript | Node: v22.0.0 | Context: missing | Workspace: missing'
    );
    expect(formatted).not.toMatch(/auth|source|token|api key/i);
  });

  it('formats the fallback storage branch explicitly', () => {
    const formatted = smitheryDiagnosticsConfig.formatResult({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            timestamp: '2026-04-08T00:00:00.000Z',
            runtime: {
              platform: 'smithery-typescript',
              nodeVersion: 'v22.0.0',
              startCommand: 'http',
            },
            environment: {
              hasAttioWorkspaceId: true,
              mcpLogLevel: 'DEBUG',
              mcpServerMode: 'http',
              attioMcpToolMode: 'universal',
              nodeEnv: 'test',
            },
            context: {
              hasContext: true,
              hasWeakMapStorage: false,
              hasFallbackStorage: true,
            },
          }),
        },
      ],
    });

    expect(formatted).toBe(
      'Smithery Diagnostics | Runtime: smithery-typescript | Node: v22.0.0 | Context: fallback | Workspace: configured'
    );
  });

  it('retains existing fallback messages for missing or invalid text content', () => {
    expect(smitheryDiagnosticsConfig.formatResult({})).toBe(
      '⚠️ No diagnostic data available'
    );
    expect(
      smitheryDiagnosticsConfig.formatResult({
        content: [{ type: 'text', text: '{not-valid-json' }],
      })
    ).toBe('⚠️ Failed to parse diagnostic data');
  });

  it('describes the tool as non-sensitive runtime diagnostics', () => {
    expect(smitheryDiagnosticsToolDefinition.description).toContain(
      'non-sensitive diagnostic information'
    );
    expect(smitheryDiagnosticsToolDefinition.description).toContain(
      'runtime configuration propagation'
    );
    expect(smitheryDiagnosticsToolDefinition.description).not.toMatch(
      /authentication issues/i
    );
  });
});
