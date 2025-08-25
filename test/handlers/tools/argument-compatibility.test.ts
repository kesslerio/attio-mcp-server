/**
 * Test suite for Issue #344: MCP tool call argument compatibility
 * Tests both wrapped and unwrapped argument formats using universal tools
 * Tests migration from legacy tools to universal tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerToolHandlers } from '../../../src/handlers/tools/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Mock the dispatcher
vi.mock('../../../src/handlers/tools/dispatcher.js', () => ({
  executeToolRequest: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked response' }],
  }),
}));

describe('MCP Tool Argument Compatibility (Issue #344)', () => {
  let server: Server;
  let requestHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock server
    server = {
      setRequestHandler: vi.fn((schema, handler) => {
        if (schema === CallToolRequestSchema) {
          requestHandler = handler;
        }
      }),
    } as any;

    // Register handlers
    registerToolHandlers(server);
  });

  describe('Argument Format Normalization', () => {
    it('should handle properly wrapped arguments (standard MCP format) with universal tools', async () => {
      const request: CallToolRequest = {
        params: {
          name: 'search-records',
          arguments: {
            resource_type: 'companies',
            query: 'Lenox Hill Plastic Surgery',
          },
        },
      };

      const result = await requestHandler(request);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle unwrapped arguments (Issue #344 format) with universal tools', async () => {
      // This is the problematic format from Issue #344 adapted for universal tools
      const request = {
        params: {
          name: 'search-records',
          resource_type: 'companies',
          query: 'Lenox Hill Plastic Surgery', // Arguments directly in params
        },
      } as any;

      const result = await requestHandler(request);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle tools with minimal arguments using universal tools', async () => {
      const request: CallToolRequest = {
        params: {
          name: 'get-record-details',
          arguments: {
            resource_type: 'companies',
            // Could include record_id for specific record, but testing minimal args
          },
        },
      };

      const result = await requestHandler(request);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle multiple unwrapped arguments with universal tools', async () => {
      const request = {
        params: {
          name: 'create-record',
          // Multiple arguments directly in params
          resource_type: 'companies',
          record_data: {
            name: 'Test Company',
            domain: 'test.com',
          },
        },
      } as any;

      const result = await requestHandler(request);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should preserve properly wrapped arguments without modification using universal tools', async () => {
      const { executeToolRequest } = await import(
        '../../../src/handlers/tools/dispatcher.js'
      );
      const mockedExecute = vi.mocked(executeToolRequest);

      const request: CallToolRequest = {
        params: {
          name: 'search-records',
          arguments: {
            resource_type: 'companies',
            query: 'Test Query',
            limit: 10,
          },
        },
      };

      await requestHandler(request);

      // Verify the normalized request preserves the wrapped structure
      const calledWith = mockedExecute.mock.calls[0][0];
      expect(calledWith.params.arguments).toEqual({
        resource_type: 'companies',
        query: 'Test Query',
        limit: 10,
      });
    });

    it('should wrap loose arguments correctly using universal tools', async () => {
      const { executeToolRequest } = await import(
        '../../../src/handlers/tools/dispatcher.js'
      );
      const mockedExecute = vi.mocked(executeToolRequest);

      const request = {
        params: {
          name: 'search-records',
          resource_type: 'companies',
          query: 'Test Query',
          limit: 10,
        },
      } as any;

      await requestHandler(request);

      // Verify the arguments were wrapped
      const calledWith = mockedExecute.mock.calls[0][0];
      expect(calledWith.params.name).toBe('search-records');
      expect(calledWith.params.arguments).toEqual({
        resource_type: 'companies',
        query: 'Test Query',
        limit: 10,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle request with only name parameter using universal tools', async () => {
      const request = {
        params: {
          name: 'get-record-details',
          resource_type: 'companies', // Minimal args for universal tool
        },
      } as any;

      const result = await requestHandler(request);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle malformed requests gracefully using universal tools', async () => {
      const request = {
        params: {
          name: 'search-records',
          // Missing required resource_type argument
        },
      } as any;

      const result = await requestHandler(request);

      // Should still return a result (error handling is in the dispatcher)
      expect(result).toBeDefined();
    });

    it('should not wrap arguments if they already exist using universal tools', async () => {
      const { executeToolRequest } = await import(
        '../../../src/handlers/tools/dispatcher.js'
      );
      const mockedExecute = vi.mocked(executeToolRequest);

      const request = {
        params: {
          name: 'search-records',
          arguments: { resource_type: 'companies', query: 'Already wrapped' },
          query: 'Should be ignored', // This should be ignored
        },
      } as any;

      await requestHandler(request);

      const calledWith = mockedExecute.mock.calls[0][0];
      expect(calledWith.params.arguments).toEqual({
        resource_type: 'companies',
        query: 'Already wrapped',
      });
      // The loose 'query' parameter should not be included
      expect((calledWith.params as any).query).toBeUndefined();
    });

    it('should validate request structure', async () => {
      const request = {
        params: {
          // Missing name
        },
      } as any;

      const result = await requestHandler(request);

      expect(result.isError).toBe(true);
      expect(result.error?.type).toBe('normalization_error');
      expect(result.error?.message).toContain('missing params or tool name');
    });

    it('should reject oversized arguments using universal tools', async () => {
      const largeString = 'x'.repeat(1024 * 1024 + 1); // Over 1MB
      const request = {
        params: {
          name: 'search-records',
          arguments: {
            resource_type: 'companies',
            query: largeString,
          },
        },
      } as any;

      const result = await requestHandler(request);

      expect(result.isError).toBe(true);
      expect(result.error?.type).toBe('normalization_error');
      expect(result.error?.message).toContain('Tool arguments too large');
    });
  });
});
