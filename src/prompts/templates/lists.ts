/**
 * Lists-related prompt templates
 */
import type { PromptTemplate } from '../types.js';

/**
 * Prompt templates for list operations
 */
export const listsPrompts: PromptTemplate[] = [
  {
    id: 'create-list',
    title: 'Create a new list',
    description: 'Create a new list in Attio for a specific object type',
    category: 'lists',
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: 'Title of the list',
        required: true,
      },
      {
        name: 'objectSlug',
        type: 'string',
        description:
          'Object type the list is for (e.g., "companies", "people")',
        required: true,
        enum: ['companies', 'people'],
      },
      {
        name: 'description',
        type: 'string',
        description: 'Description of the list',
        required: false,
      },
    ],
    template:
      'Create a new {{objectSlug}} list titled "{{title}}"{{#if description}} with description "{{description}}"{{/if}}.',
  },
  {
    id: 'add-record-to-list',
    title: 'Add a record to a list',
    description: 'Add an existing record to a list in Attio',
    category: 'lists',
    parameters: [
      {
        name: 'listId',
        type: 'string',
        description: 'ID of the list to add the record to',
        required: true,
      },
      {
        name: 'recordId',
        type: 'string',
        description: 'ID of the record to add to the list',
        required: true,
      },
    ],
    template:
      'Add the record with ID {{recordId}} to the list with ID {{listId}}.',
  },
  {
    id: 'remove-record-from-list',
    title: 'Remove a record from a list',
    description: 'Remove a record from a list in Attio',
    category: 'lists',
    parameters: [
      {
        name: 'listId',
        type: 'string',
        description: 'ID of the list to remove the record from',
        required: true,
      },
      {
        name: 'entryId',
        type: 'string',
        description: 'ID of the list entry to remove',
        required: true,
      },
    ],
    template:
      'Remove the entry with ID {{entryId}} from the list with ID {{listId}}.',
  },
  {
    id: 'check-record-in-list',
    title: 'Check if a record is in a list',
    description: 'Check if a specific record is present in a list',
    category: 'lists',
    parameters: [
      {
        name: 'listId',
        type: 'string',
        description: 'ID of the list to check',
        required: true,
      },
      {
        name: 'recordId',
        type: 'string',
        description: 'ID of the record to check for',
        required: true,
      },
    ],
    template:
      'Check if the record with ID {{recordId}} is in the list with ID {{listId}}.',
  },
  {
    id: 'get-list-entries',
    title: 'Get entries in a list',
    description: 'Retrieve all entries in a specific list',
    category: 'lists',
    parameters: [
      {
        name: 'listId',
        type: 'string',
        description: 'ID of the list to get entries from',
        required: true,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of entries to retrieve',
        required: false,
        default: 20,
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Number of entries to skip',
        required: false,
        default: 0,
      },
    ],
    template:
      'Get {{limit}} entries from the list with ID {{listId}}{{#if offset}}, skipping the first {{offset}} entries{{/if}}.',
  },
];

export default listsPrompts;
