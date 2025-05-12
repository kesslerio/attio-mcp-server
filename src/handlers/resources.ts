/**
 * Handlers for resource-related requests
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createErrorResult } from "../utils/error-handler.js";
import { listCompanies, getCompanyDetails } from "../objects/companies.js";
import { listPeople, getPersonDetails } from "../objects/people.js";
import { parseResourceUri, formatResourceUri } from "../utils/uri-parser.js";
import { ResourceType, AttioRecord } from "../types/attio.js";

/**
 * Format a single record for resource response
 * 
 * @param record - The record to format
 * @param type - The type of resource
 * @returns Formatted resource object
 */
function formatRecordAsResource(record: AttioRecord, type: ResourceType) {
  return {
    uri: formatResourceUri(type, record.id?.record_id || ""),
    name: record.values?.name?.[0]?.value || `Unknown ${type.slice(0, -1)}`,
    mimeType: "application/json",
  };
}

/**
 * Registers resource-related request handlers with the server
 * 
 * @param server - The MCP server instance
 */
export function registerResourceHandlers(server: Server): void {
  // Handler for listing resources (Companies and People)
  server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    try {
      // Determine resource type (default to companies if not specified)
      const resourceType = request.params?.type as ResourceType || ResourceType.COMPANIES;

      switch (resourceType) {
        case ResourceType.PEOPLE:
          try {
            const people = await listPeople();
            return {
              resources: people.map(person => formatRecordAsResource(person, ResourceType.PEOPLE)),
              description: `Found ${people.length} people that you have interacted with most recently`,
            };
          } catch (error) {
            return createErrorResult(
              error instanceof Error ? error : new Error("Unknown error"),
              `/objects/people/records/query`,
              "POST",
              (error as any).response?.data || {}
            );
          }

        case ResourceType.COMPANIES:
        default:
          try {
            const companies = await listCompanies();
            return {
              resources: companies.map(company => formatRecordAsResource(company, ResourceType.COMPANIES)),
              description: `Found ${companies.length} companies that you have interacted with most recently`,
            };
          } catch (error) {
            return createErrorResult(
              error instanceof Error ? error : new Error("Unknown error"),
              `/objects/companies/records/query`,
              "POST",
              (error as any).response?.data || {}
            );
          }
      }
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error("Unknown error"),
        "unknown",
        "unknown",
        {}
      );
    }
  });

  // Handler for reading resource details (Companies and People)
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
                  mimeType: "application/json",
                },
              ],
            };
          } catch (error) {
            return createErrorResult(
              error instanceof Error ? error : new Error("Unknown error"),
              `/objects/people/${id}`,
              "GET",
              (error as any).response?.data || {}
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
                  mimeType: "application/json",
                },
              ],
            };
          } catch (error) {
            return createErrorResult(
              error instanceof Error ? error : new Error("Unknown error"),
              `/objects/companies/${id}`,
              "GET",
              (error as any).response?.data || {}
            );
          }
          
        default:
          throw new Error(`Unsupported resource type: ${resourceType}`);
      }
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error("Unknown error"),
        request.params.uri,
        "GET",
        {}
      );
    }
  });
}
