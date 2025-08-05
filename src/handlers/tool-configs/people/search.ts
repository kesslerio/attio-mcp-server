/**
 * Basic search tool configurations for people
 */

import {
  searchPeople,
  searchPeopleByEmail,
  searchPeopleByPhone,
} from '../../../objects/people/index.js';
import type { AttioRecord } from '../../../types/attio.js';
import type { SearchToolConfig } from '../../tool-types.js';
import { getPersonName } from './formatters.js';

export const searchToolConfigs = {
  search: {
    name: 'search-people',
    handler: searchPeople,
    formatResult: (results: AttioRecord[]) =>
      results
        .map(
          (person: AttioRecord) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            })`
        )
        .join('\n'),
  } as SearchToolConfig,

  searchByEmail: {
    name: 'search-people-by-email',
    handler: searchPeopleByEmail,
    formatResult: (results: AttioRecord[]) =>
      results
        .map(
          (person: AttioRecord) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            })`
        )
        .join('\n'),
  } as SearchToolConfig,

  searchByPhone: {
    name: 'search-people-by-phone',
    handler: searchPeopleByPhone,
    formatResult: (results: AttioRecord[]) =>
      results
        .map(
          (person: AttioRecord) =>
            `- ${getPersonName(person)} (ID: ${
              person.id?.record_id || 'unknown'
            })`
        )
        .join('\n'),
  } as SearchToolConfig,
};

export const searchToolDefinitions = [
  {
    name: 'search-people',
    description: 'Search for people in your CRM (Attio)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for people' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search-people-by-email',
    description: 'Search for people by email in your CRM (Attio)',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address to search for' },
      },
      required: ['email'],
    },
  },
  {
    name: 'search-people-by-phone',
    description: 'Search for people by phone number in your CRM (Attio)',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Phone number to search for' },
      },
      required: ['phone'],
    },
  },
];
