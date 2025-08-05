/**
 * Tests for MCP Prompts handlers
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerPromptHandlers } from '../../src/prompts/handlers';
import { getAllPrompts } from '../../src/prompts/templates/index';

// Mock the server
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
  })),
}));

describe('Prompts Handlers', () => {
  let server: Server;

  beforeEach(() => {
    server = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: {} }
    ) as any;
    vi.clearAllMocks();
  });

  describe('registerPromptHandlers', () => {
    it('should register prompt handlers with the server', () => {
      // Register the handlers
      registerPromptHandlers(server);

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
      registerPromptHandlers(server);
      const handler = (server.setRequestHandler as vi.Mock).mock.calls.find(
        (call) => call[0] === ListPromptsRequestSchema
      )[1];

      // Call the handler
      const result = await handler({});

      // Verify the result
      const allPrompts = getAllPrompts();
      expect(result).toBeDefined();
      expect(result.prompts).toBeDefined();
      expect(Array.isArray(result.prompts)).toBe(true);
      expect(result.prompts.length).toBe(allPrompts.length);
      expect(result.prompts[0]).toHaveProperty('id');
      expect(result.prompts[0]).toHaveProperty('name');
      expect(result.prompts[0]).toHaveProperty('description');
      expect(result.prompts[0]).toHaveProperty('category');
    });

    it('should implement prompts/get handler correctly', async () => {
      // Get the handler function
      registerPromptHandlers(server);
      const handler = (server.setRequestHandler as vi.Mock).mock.calls.find(
        (call) => call[0] === GetPromptRequestSchema
      )[1];

      // Get a prompt ID for testing
      const prompts = getAllPrompts();
      const testPromptId = prompts[0].id;

      // Call the handler
      const result = await handler({ params: { promptId: testPromptId } });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.prompt).toBeDefined();
      expect(result.prompt.id).toBe(testPromptId);
      expect(result.prompt.name).toBeDefined();
      expect(result.prompt.description).toBeDefined();
      expect(result.prompt.category).toBeDefined();
      expect(result.prompt.parameters).toBeDefined();
      expect(result.prompt.template).toBeDefined();
    });

    it('should throw an error when prompt is not found', async () => {
      // Get the handler function
      registerPromptHandlers(server);
      const handler = (server.setRequestHandler as vi.Mock).mock.calls.find(
        (call) => call[0] === GetPromptRequestSchema
      )[1];

      // Call the handler with a non-existent prompt ID
      await expect(
        handler({ params: { promptId: 'non-existent-prompt' } })
      ).rejects.toThrow('Prompt not found: non-existent-prompt');
    });
  });
});
