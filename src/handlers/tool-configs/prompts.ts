/**
 * Prompts-related tool configurations
 */
import { PromptsToolConfig } from '../tool-types.js';

// Prompts tool definitions
export const promptsToolDefinitions = [
  {
    name: 'list-prompts',
    description: 'List all available prompts or filter by category',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category to filter prompts by',
        },
      },
    },
  },
  {
    name: 'list-prompt-categories',
    description: 'List all available prompt categories',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get-prompt-details',
    description: 'Get details for a specific prompt',
    inputSchema: {
      type: 'object',
      properties: {
        promptId: {
          type: 'string',
          description: 'ID of the prompt to get details for',
        },
      },
      required: ['promptId'],
    },
  },
  {
    name: 'execute-prompt',
    description: 'Execute a prompt with provided parameters',
    inputSchema: {
      type: 'object',
      properties: {
        promptId: {
          type: 'string',
          description: 'ID of the prompt to execute',
        },
        parameters: {
          type: 'object',
          description: 'Parameters to use when executing the prompt',
        },
      },
      required: ['promptId', 'parameters'],
    },
  },
];
