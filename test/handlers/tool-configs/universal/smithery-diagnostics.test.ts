import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';

const { mockGetContextStats } = vi.hoisted(() => ({
  mockGetContextStats: vi.fn(),
}));

vi.mock('@/api/client-context.js', () => ({
  getContextStats: mockGetContextStats,
}));

import {
  smitheryDiagnosticsConfig,
  smitheryDiagnosticsToolDefinition,
  type SmitheryDiagnosticsPayload,
} from '@/handlers/tool-configs/universal/smithery-diagnostics.js';
import { buildStructuredToolResult } from '@/handlers/tools/result-contract.js';

const payload = (
  overrides: Partial<SmitheryDiagnosticsPayload> = {}
): SmitheryDiagnosticsPayload => ({
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
  },
  ...overrides,
});

describe('smithery-diagnostics', () => {
  const originalEnv = {
    ATTIO_API_KEY: process.env.ATTIO_API_KEY,
    ATTIO_WORKSPACE_ID: process.env.ATTIO_WORKSPACE_ID,
    MCP_LOG_LEVEL: process.env.MCP_LOG_LEVEL,
    MCP_SERVER_MODE: process.env.MCP_SERVER_MODE,
    ATTIO_MCP_TOOL_MODE: process.env.ATTIO_MCP_TOOL_MODE,
    NODE_ENV: process.env.NODE_ENV,
  };

  const restoreEnv = (key: string) => {
    const value = originalEnv[key as keyof typeof originalEnv];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
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
    Object.keys(originalEnv).forEach(restoreEnv);
  });

  it('returns only non-sensitive runtime and context diagnostics', async () => {
    const payloadResult =
      (await smitheryDiagnosticsConfig.handler()) as SmitheryDiagnosticsPayload;

    expect(payloadResult.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(payloadResult.runtime).toEqual({
      platform: 'smithery-typescript',
      nodeVersion: process.version,
      startCommand: 'http',
    });
    expect(payloadResult.environment).toEqual({
      hasAttioWorkspaceId: true,
      mcpLogLevel: 'DEBUG',
      mcpServerMode: 'http',
      attioMcpToolMode: 'universal',
      nodeEnv: 'test',
    });
    expect(payloadResult.context).toEqual({
      hasContext: true,
      hasWeakMapStorage: true,
      hasFallbackStorage: false,
    });

    expect(payloadResult).not.toHaveProperty('summary');
    expect(payloadResult.environment).not.toHaveProperty('hasAttioApiKey');
    expect(payloadResult.environment).not.toHaveProperty('attioApiKeyLength');
    expect(payloadResult.context).not.toHaveProperty('hasApiKeyGetter');
    expect(payloadResult.context).not.toHaveProperty('hasDirectApiKey');
    expect(payloadResult.context).not.toHaveProperty('hasDirectAccessToken');

    const serialized = JSON.stringify(payloadResult);
    for (const leak of [
      'hasAttioApiKey',
      'attioApiKeyLength',
      'configurationSource',
      'isAuthenticated',
      'apiKeyAvailable',
      'failedContextCacheSize',
      'attio-secret-value',
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });

  it('publishes a schema-valid envelope with no Attio credentials required', async () => {
    const raw = (await smitheryDiagnosticsConfig.handler()) as Record<
      string,
      unknown
    >;
    const result = buildStructuredToolResult(
      smitheryDiagnosticsConfig,
      raw,
      {}
    );

    expect(result.isError).toBe(false);
    expect(
      new AjvJsonSchemaValidator().getValidator(
        smitheryDiagnosticsConfig.outputSchema!
      )(result.structuredContent).valid
    ).toBe(true);
    // content[0] is the serialized envelope, so the machine channel never lies.
    expect(JSON.parse(result.content[0].text as string)).toEqual(
      result.structuredContent
    );
    expect(JSON.stringify(result.structuredContent)).not.toContain(
      'attio-secret-value'
    );
  });

  it('formats a neutral runtime summary without auth-state wording', () => {
    const formatted = smitheryDiagnosticsConfig.formatResult(payload());

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
    const formatted = smitheryDiagnosticsConfig.formatResult(
      payload({
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
        },
      })
    );

    expect(formatted).toBe(
      'Smithery Diagnostics | Runtime: smithery-typescript | Node: v22.0.0 | Context: missing | Workspace: missing'
    );
  });

  it('formats the fallback storage branch explicitly', () => {
    const formatted = smitheryDiagnosticsConfig.formatResult(
      payload({
        context: {
          hasContext: true,
          hasWeakMapStorage: false,
          hasFallbackStorage: true,
        },
      })
    );

    expect(formatted).toBe(
      'Smithery Diagnostics | Runtime: smithery-typescript | Node: v22.0.0 | Context: fallback | Workspace: configured'
    );
  });

  it('reports missing diagnostic data instead of inventing prose', () => {
    expect(smitheryDiagnosticsConfig.formatResult({})).toBe(
      '⚠️ No diagnostic data available'
    );
    expect(
      smitheryDiagnosticsConfig.formatResult({
        runtime: payload().runtime,
      })
    ).toBe('⚠️ No diagnostic data available');
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
