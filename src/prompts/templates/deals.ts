/**
 * Deal-related prompt templates
 */
import { PromptTemplate } from '../types.js';

const dealsPrompts: PromptTemplate[] = [
  {
    id: 'search-deals',
    title: 'Search for deals',
    description: 'Search for deals in Attio by name or other criteria',
    category: 'deals',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description:
          'Search query for deal names, descriptions, or other fields',
        required: true,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of deals to return',
        required: false,
        default: 10,
      },
    ],
    template:
      'Search for deals using the query "{{query}}"{{#if limit}} and return up to {{limit}} results{{/if}}.',
  },
  {
    id: 'get-deal-details',
    title: 'Get deal details',
    description: 'Retrieve detailed information about a specific deal',
    category: 'deals',
    parameters: [
      {
        name: 'dealId',
        type: 'string',
        description: 'ID of the deal to retrieve details for',
        required: true,
      },
    ],
    template: 'Get detailed information for the deal with ID {{dealId}}.',
  },
  {
    id: 'create-deal',
    title: 'Create a new deal',
    description: 'Create a new deal record in Attio',
    category: 'deals',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Name of the deal',
        required: true,
      },
      {
        name: 'value',
        type: 'number',
        description: 'Deal value/amount',
        required: false,
      },
      {
        name: 'stage',
        type: 'string',
        description: 'Deal stage',
        required: false,
      },
      {
        name: 'description',
        type: 'string',
        description: 'Deal description',
        required: false,
      },
    ],
    template:
      'Create a new deal named "{{name}}"{{#if value}} with value {{value}}{{/if}}{{#if stage}} in stage "{{stage}}"{{/if}}{{#if description}} with description "{{description}}"{{/if}}.',
  },
  {
    id: 'update-deal',
    title: 'Update a deal',
    description: 'Update an existing deal record in Attio',
    category: 'deals',
    parameters: [
      {
        name: 'dealId',
        type: 'string',
        description: 'ID of the deal to update',
        required: true,
      },
      {
        name: 'name',
        type: 'string',
        description: 'New name for the deal',
        required: false,
      },
      {
        name: 'value',
        type: 'number',
        description: 'New deal value/amount',
        required: false,
      },
      {
        name: 'stage',
        type: 'string',
        description: 'New deal stage',
        required: false,
      },
      {
        name: 'description',
        type: 'string',
        description: 'New deal description',
        required: false,
      },
    ],
    template:
      'Update the deal with ID {{dealId}}{{#if name}} to change its name to {{name}}{{/if}}{{#if value}}, update its value to {{value}}{{/if}}{{#if stage}}, update its stage to "{{stage}}"{{/if}}{{#if description}}, and update its description to "{{description}}"{{/if}}.',
  },
  {
    id: 'add-note-to-deal',
    title: 'Add a note to a deal',
    description: 'Add a note to an existing deal record in Attio',
    category: 'deals',
    parameters: [
      {
        name: 'dealId',
        type: 'string',
        description: 'ID of the deal to add a note to',
        required: true,
      },
      {
        name: 'title',
        type: 'string',
        description: 'Title of the note',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: 'Content of the note',
        required: true,
      },
    ],
    template:
      'Add a note titled "{{title}}" with content "{{content}}" to the deal with ID {{dealId}}.',
  },
];

export default dealsPrompts;
