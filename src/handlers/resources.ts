/**
 * Handlers for resource-related requests
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../utils/error-handler.js';
import {
  listCompanies,
  getCompanyDetails,
} from '../objects/companies/index.js';
import { listPeople, getPersonDetails } from '../objects/people/index.js';
import { getLists, getListDetails } from '../objects/lists.js';
import { parseResourceUri, formatResourceUri } from '../utils/uri-parser.js';
import { ResourceType, AttioRecord, AttioList } from '../types/attio.js';

/**
 * Type for API errors with response data
 */
interface ApiError extends Error {
  response?: {
    data?: Record<string, unknown>;
  };
}

/**
 * Format a single record for resource response
 *
 * @param record - The record to format
 * @param type - The type of resource
 * @returns Formatted resource object
 */
function formatRecordAsResource(record: AttioRecord, type: ResourceType) {
  return {
    uri: formatResourceUri(type, record.id?.record_id || ''),
    name:
      (record.values?.name as any)?.[0]?.value ||
      `Unknown ${type.slice(0, -1)}`,
    mimeType: 'application/json',
  };
}

/**
 * Format a list for resource response
 *
 * @param list - The list to format
 * @returns Formatted resource object
 */
function formatListAsResource(list: AttioList) {
  return {
    uri: formatResourceUri(ResourceType.LISTS, list.id?.list_id || ''),
    name: list.name || 'Unknown list',
    mimeType: 'application/json',
  };
}

/**
 * Registers resource-related request handlers with the server
 *
 * @param server - The MCP server instance
 */
export function registerResourceHandlers(server: Server): void {
  // Handler for listing resources (Companies, People, and Lists)
  server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    try {
      // Determine resource type (default to companies if not specified)
      const resourceType =
        (request.params?.type as ResourceType) || ResourceType.COMPANIES;

      switch (resourceType) {
        case ResourceType.PEOPLE:
          try {
            const people = await listPeople();
            return {
              resources: people.map((person) =>
                formatRecordAsResource(person, ResourceType.PEOPLE)
              ),
            };
          } catch (error: unknown) {
            return createErrorResult(
              error instanceof Error ? error : new Error('Unknown error'),
              `/objects/people/records/query`,
              'POST',
              (error as ApiError).response?.data || {}
            );
          }

        case ResourceType.LISTS:
          try {
            const lists = await getLists();
            // Ensure lists is always an array
            const safeList = Array.isArray(lists) ? lists : [];
            return {
              resources: safeList.map((list) => formatListAsResource(list)),
            };
          } catch {
            // For resource requests, always return resources array even on error
            return {
              resources: [],
            };
          }

        case ResourceType.COMPANIES:
        default:
          try {
            const companies = await listCompanies();
            return {
              resources: companies.map((company) =>
                formatRecordAsResource(company, ResourceType.COMPANIES)
              ),
            };
          } catch (error: unknown) {
            return createErrorResult(
              error instanceof Error ? error : new Error('Unknown error'),
              `/objects/companies/records/query`,
              'POST',
              (error as ApiError).response?.data || {}
            );
          }
      }
    } catch (error: unknown) {
      return createErrorResult(
        error instanceof Error ? error : new Error('Unknown error'),
        'unknown',
        'unknown',
        {}
      );
    }
  });

  // Handler for reading resource details (Companies, People, and Lists)
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const uri = request.params.uri;
      const [resourceType, id] = parseResourceUri(uri);

      switch (resourceType) {
        case ResourceType.PEOPLE:
          try {
            const person = await getPersonDetails(id);

            return {
              contents: [
                {
                  uri,
                  text: JSON.stringify(person, null, 2),
                  mimeType: 'application/json',
                },
              ],
            };
          } catch (error: unknown) {
            return createErrorResult(
              error instanceof Error ? error : new Error('Unknown error'),
              `/objects/people/${id}`,
              'GET',
              (error as ApiError).response?.data || {}
            );
          }

        case ResourceType.LISTS:
          try {
            const list = await getListDetails(id);

            return {
              contents: [
                {
                  uri,
                  text: JSON.stringify(list, null, 2),
                  mimeType: 'application/json',
                },
              ],
            };
          } catch (error: unknown) {
            return createErrorResult(
              error instanceof Error ? error : new Error('Unknown error'),
              `/lists/${id}`,
              'GET',
              (error as ApiError).response?.data || {}
            );
          }

        case ResourceType.COMPANIES:
          try {
            const company = await getCompanyDetails(id);

            return {
              contents: [
                {
                  uri,
                  text: JSON.stringify(company, null, 2),
                  mimeType: 'application/json',
                },
              ],
            };
          } catch (error: unknown) {
            return createErrorResult(
              error instanceof Error ? error : new Error('Unknown error'),
              `/objects/companies/${id}`,
              'GET',
              (error as ApiError).response?.data || {}
            );
          }

        default:
          throw new Error(`Unsupported resource type: ${resourceType}`);
      }
    } catch (error: unknown) {
      return createErrorResult(
        error instanceof Error ? error : new Error('Unknown error'),
        request.params.uri,
        'GET',
        {}
      );
    }
  });
}
