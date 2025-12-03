import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPTestClient } from 'mcp-test-client';

type MCPClientMode = 'local' | 'remote';

export interface MCPClientConfig {
  mode?: MCPClientMode;
  remoteEndpoint?: string;
  remoteAuthToken?: string;
  serverCommand?: string;
  serverArgs?: string[];
}

export interface MCPClientAdapter {
  init(): Promise<void>;
  listTools(): Promise<Tool[]>;
  assertToolCall(
    toolName: string,
    args: Record<string, unknown>,
    assertion: (result: CallToolResult) => void | Promise<void>
  ): Promise<void>;
  cleanup(): Promise<void>;
}

class LocalMCPClientAdapter implements MCPClientAdapter {
  private readonly client: MCPTestClient;

  constructor(serverCommand: string, serverArgs: string[]) {
    this.client = new MCPTestClient({
      serverCommand,
      serverArgs,
    });
  }

  async init(): Promise<void> {
    await this.client.init();
  }

  async listTools(): Promise<Tool[]> {
    return await this.client.listTools();
  }

  async assertToolCall(
    toolName: string,
    args: Record<string, unknown>,
    assertion: (result: CallToolResult) => void | Promise<void>
  ): Promise<void> {
    await this.client.assertToolCall(toolName, args, assertion);
  }

  async cleanup(): Promise<void> {
    await this.client.cleanup();
  }
}

class RemoteMCPClientAdapter implements MCPClientAdapter {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor(
    private readonly endpoint: string,
    private readonly authToken?: string
  ) {}

  async init(): Promise<void> {
    this.transport = new StreamableHTTPClientTransport(new URL(this.endpoint), {
      requestInit: this.authToken
        ? { headers: { Authorization: `Bearer ${this.authToken}` } }
        : undefined,
    });

    this.client = new Client(
      {
        name: 'mcp-test-client',
        version: '1.0.0',
      },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
  }

  async listTools(): Promise<Tool[]> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const response = await this.client.request(
      { method: 'tools/list' },
      ListToolsResultSchema
    );

    return response.tools;
  }

  async assertToolCall(
    toolName: string,
    args: Record<string, unknown>,
    assertion: (result: CallToolResult) => void | Promise<void>
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const result = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      },
      CallToolResultSchema
    );

    await assertion(result);
  }

  async cleanup(): Promise<void> {
    await this.client?.close();
    await this.transport?.close();
  }
}

function resolveMode(mode?: string): MCPClientMode {
  if (!mode) return 'local';
  return mode.toLowerCase() === 'remote' ? 'remote' : 'local';
}

export function createMCPClient(config: MCPClientConfig): MCPClientAdapter {
  const mode = resolveMode(config.mode);

  if (mode === 'remote') {
    if (!config.remoteEndpoint) {
      throw new Error(
        'MCP_REMOTE_ENDPOINT is required when MCP_TEST_MODE=remote'
      );
    }

    return new RemoteMCPClientAdapter(
      config.remoteEndpoint,
      config.remoteAuthToken
    );
  }

  const serverCommand = config.serverCommand || 'node';
  const serverArgs = config.serverArgs || ['./dist/cli.js'];

  return new LocalMCPClientAdapter(serverCommand, serverArgs);
}

export function buildMCPClientConfig(
  overrides: Partial<MCPClientConfig> = {}
): MCPClientConfig {
  const envMode = process.env.MCP_TEST_MODE;

  return {
    mode: resolveMode(overrides.mode ?? envMode),
    remoteEndpoint: overrides.remoteEndpoint ?? process.env.MCP_REMOTE_ENDPOINT,
    remoteAuthToken:
      overrides.remoteAuthToken ?? process.env.MCP_REMOTE_AUTH_TOKEN,
    serverCommand: overrides.serverCommand,
    serverArgs: overrides.serverArgs,
  };
}
