/**
 * Tests for MCP Prompts handlers
 */
import { describe, beforeEach, it, expect, vi } from 'vitest';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerPromptHandlers } from '../../src/prompts/handlers';

describe('Prompts Handlers', () => {
  let server: {
    setRequestHandler: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    server = {
      setRequestHandler: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('registerPromptHandlers', () => {
    it('should register prompt handlers with the server', async () => {
      // Register the handlers
      await registerPromptHandlers(server);

      // Verify the handlers were registered
      expect(server.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(server.setRequestHandler).toHaveBeenCalledWith(
        ListPromptsRequestSchema,
        expect.any(Function)
      );
      expect(server.setRequestHandler).toHaveBeenCalledWith(
        GetPromptRequestSchema,
        expect.any(Function)
      );
    });
  });

  // Test the handler implementations
  describe('handlers implementation', () => {
    it('should implement prompts/list handler correctly', async () => {
      // Get the handler function
      await registerPromptHandlers(server);
      const handler = (server.setRequestHandler as vi.Mock).mock.calls.find(
        (call) => call[0] === ListPromptsRequestSchema
      )[1];

      // Call the handler
      const result = await handler({});

      // Verify the result
      expect(result).toBeDefined();
      expect(result.prompts).toBeDefined();
      expect(Array.isArray(result.prompts)).toBe(true);
      // Should include both legacy (22) and v1 (10) prompts = 32 total
      expect(result.prompts.length).toBeGreaterThanOrEqual(30);
      expect(result.prompts[0]).toHaveProperty('name');
      expect(result.prompts[0]).toHaveProperty('description');
    });

    it('should implement prompts/get handler correctly', async () => {
      // Get the handler function
      await registerPromptHandlers(server);
      const handler = (server.setRequestHandler as vi.Mock).mock.calls.find(
        (call) => call[0] === GetPromptRequestSchema
      )[1];

      // Test with a v1 prompt
      const testPromptName = 'people_search.v1';

      // Call the handler with required arguments
      const result = await handler({
        params: {
          name: testPromptName,
          arguments: { query: 'Account Executive' },
        },
      });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should throw an error when prompt is not found', async () => {
      // Get the handler function
      await registerPromptHandlers(server);
      const handler = (server.setRequestHandler as vi.Mock).mock.calls.find(
        (call) => call[0] === GetPromptRequestSchema
      )[1];

      // Call the handler with a non-existent prompt name
      await expect(
        handler({ params: { name: 'non-existent-prompt' } })
      ).rejects.toThrow('Prompt not found: non-existent-prompt');
    });
  });
});
