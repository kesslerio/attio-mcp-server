/**
 * Handlers for resource-related requests
 */
import { Server } from '@modelcontextprotocol/server';
import {
  ListResourcesResult,
  ReadResourceResult,
  ProtocolError,
  ProtocolErrorCode as ErrorCode,
} from '@modelcontextprotocol/server';
import { ServerContext } from '@/server/createServer.js';
import { withGlobalContext } from '@/api/lazy-client.js';
import { listObjects } from '@/api/operations/index.js';
import { getCompanyDetails } from '@/objects/companies/index.js';
import { getPersonDetails } from '@/objects/people/index.js';
import { getLists, getListDetails } from '@/objects/lists.js';
import { parseResourceUri, formatResourceUri } from '@/utils/uri-parser.js';
import { ResourceType, AttioRecord, AttioList } from '@/types/attio.js';
import {
  ResourceProtocolError,
  resourceFailure as sanitizeResourceFailure,
} from '@/handlers/resource-errors.js';

const RESOURCE_PAGE_SIZE = 20;

// The maintained SDK recognizes ProtocolError at its wire boundary. Preserve
// U5's sanitized codes and messages while keeping diagnostics off the wire.
function resourceFailure(
  error: unknown,
  operation: 'read' | 'list'
): ProtocolError {
  const sanitized = sanitizeResourceFailure(error, operation);
  const protocolError = new ProtocolError(sanitized.code, sanitized.message);
  Object.defineProperty(protocolError, 'cause', {
    value: sanitized.cause,
    enumerable: false,
  });
  return protocolError;
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
    name: (() => {
      const nameField = (record.values as Record<string, unknown> | undefined)
        ?.name as unknown;
      if (
        Array.isArray(nameField) &&
        nameField.length > 0 &&
        nameField[0] &&
        typeof nameField[0] === 'object' &&
        'value' in (nameField[0] as Record<string, unknown>)
      ) {
        const v = (nameField[0] as Record<string, unknown>).value;
        return typeof v === 'string' ? v : String(v);
      }
      return `Unknown ${type.slice(0, -1)}`;
    })(),
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
export function registerResourceHandlers(
  server: Server,
  context?: ServerContext
): void {
  server.setRequestHandler(
    'resources/list',
    async (request): Promise<ListResourcesResult> => {
      try {
        if (request.params?.cursor !== undefined) {
          throw new ResourceProtocolError(
            ErrorCode.InvalidParams,
            'Resource listing does not support cursors'
          );
        }
        const buildResources = async (): Promise<ListResourcesResult> => {
          // Use the validated query operation directly: the company convenience
          // adapter retries through a fallback that can turn malformed data into [].
          const companies = await listObjects(
            ResourceType.COMPANIES,
            RESOURCE_PAGE_SIZE
          );
          const people = await listObjects(
            ResourceType.PEOPLE,
            RESOURCE_PAGE_SIZE
          );
          const lists = await getLists();
          if (
            companies.length >= RESOURCE_PAGE_SIZE ||
            people.length >= RESOURCE_PAGE_SIZE ||
            (lists as AttioList[] & { truncated?: boolean }).truncated !== false
          ) {
            throw new ResourceProtocolError(
              ErrorCode.InternalError,
              'Resource catalog completeness cannot be established; use record and list search tools'
            );
          }
          return {
            resources: [
              ...companies.map((record) =>
                formatRecordAsResource(record, ResourceType.COMPANIES)
              ),
              ...people.map((record) =>
                formatRecordAsResource(record, ResourceType.PEOPLE)
              ),
              ...lists.map(formatListAsResource),
            ],
          };
        };
        return await (context
          ? withGlobalContext(context, buildResources)
          : buildResources());
      } catch (error) {
        throw resourceFailure(error, 'list');
      }
    }
  );

  server.setRequestHandler(
    'resources/read',
    async (request): Promise<ReadResourceResult> => {
      try {
        const uri = request.params.uri;
        let resourceType: ResourceType;
        let id: string;
        try {
          [resourceType, id] = parseResourceUri(uri);
        } catch (error) {
          throw new ResourceProtocolError(
            ErrorCode.InvalidParams,
            'Invalid resource URI',
            error
          );
        }
        const readResource = async (): Promise<ReadResourceResult> => {
          let record: AttioRecord | AttioList;
          switch (resourceType) {
            case ResourceType.COMPANIES:
              record = await getCompanyDetails(id);
              break;
            case ResourceType.PEOPLE:
              record = await getPersonDetails(id);
              break;
            case ResourceType.LISTS:
              record = await getListDetails(id);
              break;
            default:
              throw new ResourceProtocolError(
                ErrorCode.InvalidParams,
                'Unsupported resource URI'
              );
          }
          return {
            contents: [
              {
                uri,
                text: JSON.stringify(record, null, 2),
                mimeType: 'application/json',
              },
            ],
          };
        };
        return await (context
          ? withGlobalContext(context, readResource)
          : readResource());
      } catch (error) {
        throw resourceFailure(error, 'read');
      }
    }
  );
}
