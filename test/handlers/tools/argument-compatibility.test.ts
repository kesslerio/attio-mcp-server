/**
 * Test suite for Issue #344: MCP tool call argument compatibility
 * Tests both wrapped and unwrapped argument formats using universal tools
 * Tests migration from legacy tools to universal tools
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { registerToolHandlers } from '../../../src/handlers/tools/index.js';

import { registerToolHandlers } from '../../../src/handlers/tools/index.js';

// Mock the dispatcher
vi.mock('../../../src/handlers/tools/dispatcher.js', () => ({
  executeToolRequest: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked response' }],
  }),
}));

describe('MCP Tool Argument Compatibility (Issue #344)', () => {
  let server: Server;
  let requestHandler: unknown;

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


      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle unwrapped arguments (Issue #344 format) with universal tools', async () => {
      // This is the problematic format from Issue #344 adapted for universal tools
        params: {
          name: 'search-records',
          resource_type: 'companies',
          query: 'Lenox Hill Plastic Surgery', // Arguments directly in params
        },
      } as any;


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


      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle multiple unwrapped arguments with universal tools', async () => {
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


      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should preserve properly wrapped arguments without modification using universal tools', async () => {
      const { executeToolRequest } = await import(
        '../../../src/handlers/tools/dispatcher.js'
      );

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

        params: {
          name: 'search-records',
          resource_type: 'companies',
          query: 'Test Query',
          limit: 10,
        },
      } as any;

      await requestHandler(request);

      // Verify the arguments were wrapped
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
        params: {
          name: 'get-record-details',
          resource_type: 'companies', // Minimal args for universal tool
        },
      } as any;


      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle malformed requests gracefully using universal tools', async () => {
        params: {
          name: 'search-records',
          // Missing required resource_type argument
        },
      } as any;


      // Should still return a result (error handling is in the dispatcher)
      expect(result).toBeDefined();
    });

    it('should not wrap arguments if they already exist using universal tools', async () => {
      const { executeToolRequest } = await import(
        '../../../src/handlers/tools/dispatcher.js'
      );

        params: {
          name: 'search-records',
          arguments: { resource_type: 'companies', query: 'Already wrapped' },
          query: 'Should be ignored', // This should be ignored
        },
      } as any;

      await requestHandler(request);

      expect(calledWith.params.arguments).toEqual({
        resource_type: 'companies',
        query: 'Already wrapped',
      });
      // The loose 'query' parameter should not be included
      expect((calledWith.params as any).query).toBeUndefined();
    });

    it('should validate request structure', async () => {
        params: {
          // Missing name
        },
      } as any;


      expect(result.isError).toBe(true);
      expect(result.error?.type).toBe('normalization_error');
      expect(result.error?.message).toContain('missing params or tool name');
    });

    it('should reject oversized arguments using universal tools', async () => {
        params: {
          name: 'search-records',
          arguments: {
            resource_type: 'companies',
            query: largeString,
          },
        },
      } as any;


      expect(result.isError).toBe(true);
      expect(result.error?.type).toBe('normalization_error');
      expect(result.error?.message).toContain('Tool arguments too large');
    });
  });
});
