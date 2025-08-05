/**
 * CRUD operations for people
 */

import { getPersonDetails } from '../../../objects/people/index.js';
import { createPerson } from '../../../objects/people-write.js';
import type {
  AttioRecord,
  Person,
  PersonCreateAttributes,
} from '../../../types/attio.js';
import type { ToolConfig } from '../../tool-types.js';
import { formatPersonDetails, getPersonName } from './formatters.js';

export const crudToolConfigs = {
  create: {
    name: 'create-person',
    handler: async (attributes: PersonCreateAttributes): Promise<Person> => {
      try {
        return await createPerson(attributes);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const contextualError = new Error(
          `Failed to create person via adapter: ${errorMessage}`
        );
        (contextualError as any).cause = error;
        throw contextualError;
      }
    },
    formatResult: (result: Person) =>
      `Person created: ${getPersonName(
        result as unknown as AttioRecord
      )} (ID: ${result.id?.record_id || result.id || 'unknown'})`,
  } as ToolConfig,

  details: {
    name: 'get-person-details',
    handler: getPersonDetails,
    formatResult: formatPersonDetails,
  } as ToolConfig,
};

export const crudToolDefinitions = [
  {
    name: 'create-person',
    description: 'Create a new person record in your CRM (Attio)',
    inputSchema: {
      type: 'object',
      properties: {
        attributes: {
          type: 'object',
          description: 'Person attributes to set',
          properties: {
            name: { type: 'string', description: 'Person name' },
            email_addresses: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Email address(es) - array of email strings. For single email, provide as single-item array.',
            },
            phone_numbers: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Phone number(s) - array of phone strings. For single phone, provide as single-item array.',
            },
            job_title: { type: 'string', description: 'Job title' },
            company: { type: 'string', description: 'Company name' },
          },
        },
      },
      required: ['attributes'],
    },
  },
  {
    name: 'get-person-details',
    description: 'Get details of a person',
    inputSchema: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'ID of the person to get details for',
        },
      },
      required: ['personId'],
    },
  },
];
