import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expectLogCallsToExclude,
  findLogCall,
} from './utils/log-assertions.js';

const buildServerMock = vi.fn((context: unknown) => context);

vi.mock('../src/server/createServer.js', () => ({
  createServer: buildServerMock,
}));

describe('smithery debug-log hardening', () => {
  const originalEnv = {
    ATTIO_API_KEY: process.env.ATTIO_API_KEY,
    ATTIO_ACCESS_TOKEN: process.env.ATTIO_ACCESS_TOKEN,
    ATTIO_WORKSPACE_ID: process.env.ATTIO_WORKSPACE_ID,
    ATTIO_MCP_TOOL_MODE: process.env.ATTIO_MCP_TOOL_MODE,
    MCP_LOG_LEVEL: process.env.MCP_LOG_LEVEL,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.ATTIO_API_KEY;
    delete process.env.ATTIO_ACCESS_TOKEN;
    delete process.env.ATTIO_WORKSPACE_ID;
    delete process.env.ATTIO_MCP_TOOL_MODE;
    delete process.env.MCP_LOG_LEVEL;
  });

  afterEach(() => {
    process.env.ATTIO_API_KEY = originalEnv.ATTIO_API_KEY;
    process.env.ATTIO_ACCESS_TOKEN = originalEnv.ATTIO_ACCESS_TOKEN;
    process.env.ATTIO_WORKSPACE_ID = originalEnv.ATTIO_WORKSPACE_ID;
    process.env.ATTIO_MCP_TOOL_MODE = originalEnv.ATTIO_MCP_TOOL_MODE;
    process.env.MCP_LOG_LEVEL = originalEnv.MCP_LOG_LEVEL;
  });

  it('logs only coarse safe config metadata during smithery init', async () => {
    process.env.ATTIO_API_KEY = 'env-api-key-1234567890';
    process.env.ATTIO_ACCESS_TOKEN = 'env-access-token-1234567890';
    process.env.ATTIO_MCP_TOOL_MODE = 'search';

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { default: createServer } = await import('../src/smithery.js');

    createServer({
      config: {
        ATTIO_API_KEY: 'config-api-key-1234567890',
        ATTIO_ACCESS_TOKEN: 'config-access-token-1234567890',
        ATTIO_WORKSPACE_ID: 'workspace-123',
        ATTIO_MCP_TOOL_MODE: 'full',
        debug: true,
      },
    });

    const initCall = findLogCall(
      consoleErrorSpy.mock.calls,
      '[smithery:init] Config received:'
    );
    expect(initCall).toBeDefined();
    expect(initCall).toEqual([
      '[smithery:init] Config received:',
      expect.objectContaining({
        hasConfig: true,
        hasWorkspaceId: true,
        toolMode: 'full',
        debug: true,
        timestamp: expect.any(String),
      }),
    ]);

    const initPayload = initCall?.[1] as Record<string, unknown> | undefined;
    expect(initPayload).not.toHaveProperty('configKeys');
    expect(initPayload).not.toHaveProperty('hasApiKeyInConfig');
    expect(initPayload).not.toHaveProperty('hasAccessTokenInConfig');
    expect(initPayload).not.toHaveProperty('hasEnvApiKey');
    expect(initPayload).not.toHaveProperty('hasEnvAccessToken');
    expect(initPayload).not.toHaveProperty('apiKeyLength');
    expect(initPayload).not.toHaveProperty('accessTokenLength');
    expect(initPayload).not.toHaveProperty('envApiKeyLength');
    expect(initPayload).not.toHaveProperty('envAccessTokenLength');

    expectLogCallsToExclude(consoleErrorSpy.mock.calls, [
      'hasApiKeyInConfig',
      'hasEnvApiKey',
      'apiKeyLength',
      'accessTokenLength',
      'config-api-key-1234567890',
      'env-access-token-1234567890',
    ]);
  });

  it.each([
    {
      label: 'config api key',
      config: {
        ATTIO_API_KEY: 'config-api-key-1234567890',
        debug: true,
      },
      env: {},
      expectedKey: 'config-api-key-1234567890',
      secret: 'config-api-key-1234567890',
    },
    {
      label: 'config access token',
      config: {
        ATTIO_ACCESS_TOKEN: 'config-access-token-1234567890',
        debug: true,
      },
      env: {},
      expectedKey: 'config-access-token-1234567890',
      secret: 'config-access-token-1234567890',
    },
    {
      label: 'env api key',
      config: {
        debug: true,
      },
      env: {
        ATTIO_API_KEY: 'env-api-key-1234567890',
      },
      expectedKey: 'env-api-key-1234567890',
      secret: 'env-api-key-1234567890',
    },
    {
      label: 'env access token',
      config: {
        debug: true,
      },
      env: {
        ATTIO_ACCESS_TOKEN: 'env-access-token-1234567890',
      },
      expectedKey: 'env-access-token-1234567890',
      secret: 'env-access-token-1234567890',
    },
  ])(
    'uses a message-only lifecycle log for credential resolution from $label',
    async ({ config, env, expectedKey, secret }) => {
      Object.assign(process.env, env);

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { default: createServer } = await import('../src/smithery.js');

      const server = createServer({
        config,
      }) as {
        getApiKey: () => string | undefined;
      };

      expect(server.getApiKey()).toBe(expectedKey);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[smithery:getApiKey] Credential resolution attempted'
      );
      expectLogCallsToExclude(consoleErrorSpy.mock.calls, [
        'fromConfigApiKey',
        'fromConfigAccessToken',
        'fromEnvApiKey',
        'fromEnvAccessToken',
        'keyLength',
        secret,
      ]);
    }
  );

  it('keeps non-debug smithery startup free of debug logs while preserving resolution order', async () => {
    process.env.ATTIO_API_KEY = 'env-api-key-1234567890';

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { default: createServer } = await import('../src/smithery.js');

    const server = createServer({
      config: {
        ATTIO_ACCESS_TOKEN: 'config-access-token-1234567890',
        ATTIO_WORKSPACE_ID: 'workspace-123',
        debug: false,
      },
    }) as {
      getApiKey: () => string | undefined;
      getWorkspaceId: () => string | undefined;
    };

    expect(server.getApiKey()).toBe('config-access-token-1234567890');
    expect(server.getWorkspaceId()).toBe('workspace-123');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
