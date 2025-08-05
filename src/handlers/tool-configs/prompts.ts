/**
 * Prompts-related tool configurations
 */
import {
  executePrompt,
  getPromptDetails,
  listPromptCategories,
  listPrompts,
} from '../../prompts/index.js';
import type { PromptsToolConfig } from '../tool-types.js';

// Prompts tool configurations
export const promptsToolConfigs = {
  listPrompts: {
    name: 'list-prompts',
    handler: listPrompts,
    formatResult: (results: any) => {
      return `Available prompts:\n${results.data
        .map((prompt: any) => `- ${prompt.title} (ID: ${prompt.id})`)
        .join('\n')}`;
    },
  } as PromptsToolConfig,
  listPromptCategories: {
    name: 'list-prompt-categories',
    handler: listPromptCategories,
    formatResult: (results: any) => {
      return `Available prompt categories:\n${results.data
        .map((category: string) => `- ${category}`)
        .join('\n')}`;
    },
  } as PromptsToolConfig,
  getPromptDetails: {
    name: 'get-prompt-details',
    handler: getPromptDetails,
  } as PromptsToolConfig,
  executePrompt: {
    name: 'execute-prompt',
    handler: executePrompt,
  } as PromptsToolConfig,
};

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
