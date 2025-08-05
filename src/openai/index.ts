/**
 * OpenAI Tools Module
 * Provides ChatGPT-compatible search and fetch tools
 */

export { fetch as fetchRecord } from './fetch.js';
export { search, searchDirect } from './search.js';
export * from './types.js';

import { fetch } from './fetch.js';
import { search } from './search.js';
import type { OpenAITools } from './types.js';

/**
 * OpenAI-compliant tools for ChatGPT connector
 */
export const openAITools: OpenAITools = {
  search,
  fetch,
};

/**
 * Tool definitions for ChatGPT registration
 */
export const openAIToolDefinitions = [
  {
    name: 'search',
    description:
      'Search for records in Attio CRM across companies, people, lists, and tasks',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant records',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch',
    description: 'Fetch detailed information about a specific record by its ID',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The record ID (format: "type:id" or just "id")',
        },
      },
      required: ['id'],
    },
  },
];
