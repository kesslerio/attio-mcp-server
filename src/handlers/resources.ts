/**
 * Handlers for resource-related requests
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { DeleteResourceRequestSchema, GetResourceRequestSchema, ListResourcesRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createErrorResult } from "../utils/error-handler.js";
import { searchPeople, getPersonDetails } from "../objects/people.js";
import { searchCompanies, getCompanyDetails } from "../objects/companies.js";
import { getLists, getListDetails } from "../objects/lists.js";
import { parseResourceUri } from "../utils/uri-parser.js";
import { ResourceType } from "../types/attio.js";

/**
 * Registers resource-related request handlers with the server
 * 
 * @param server - The MCP server instance
 */
export function registerResourceHandlers(server: Server): void {
  // Handler for listing resources
  server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    try {
      const resourceType = request.params.type;
      const query = request.params.query;
      
      if (!resourceType && !query) {
        return { resources: [] };
      }
      
      // Default to empty array if no results
      let resources: any[] = [];
      
      // Handle search or list operations based on query and type
      if (resourceType === 'people' || (!resourceType && query)) {
        try {
          const people = await searchPeople(query || '');
          resources = [
            ...resources,
            ...people.map(person => {
              const name = person.values?.name?.[0]?.value || 'Unknown Person';
              const id = person.id?.record_id;
              return {
                uri: `attio://people/${id}`,
                type: 'people',
                title: name,
              };
            })
          ];
        } catch (error) {
          console.error('Error searching people:', error);
        }
      }
      
      if (resourceType === 'companies' || (!resourceType && query)) {
        try {
          const companies = await searchCompanies(query || '');
          resources = [
            ...resources,
            ...companies.map(company => {
              const name = company.values?.name?.[0]?.value || 'Unknown Company';
              const id = company.id?.record_id;
              return {
                uri: `attio://companies/${id}`,
                type: 'companies',
                title: name,
              };
            })
          ];
        } catch (error) {
          console.error('Error searching companies:', error);
        }
      }
      
      if (resourceType === 'lists' || (!resourceType && !query)) {
        try {
          const lists = await getLists();
          resources = [
            ...resources,
            ...lists.map(list => {
              const title = list.title || 'Untitled List';
              const id = typeof list.id === 'object' ? list.id.list_id : list.id;
              return {
                uri: `attio://lists/${id}`,
                type: 'lists',
                title,
              };
            })
          ];
        } catch (error) {
          console.error('Error getting lists:', error);
        }
      }
      
      return { resources };
    } catch (error) {
      console.error('Error in list resources handler:', error);
      return { resources: [] };
    }
  });

  // Handler for getting a specific resource
  server.setRequestHandler(GetResourceRequestSchema, async (request) => {
    try {
      const uri = request.params.uri;
      const [resourceType, id] = parseResourceUri(uri);
      
      // Fetch resource data based on type
      let resource: any;
      let properties: Record<string, any> = {};
      
      if (resourceType === ResourceType.PEOPLE) {
        const person = await getPersonDetails(id);
        resource = {
          uri,
          type: 'people',
          title: person.values?.name?.[0]?.value || 'Unknown Person',
        };
        
        // Extract properties
        if (person.values) {
          for (const [key, valueArray] of Object.entries(person.values)) {
            if (Array.isArray(valueArray) && valueArray.length > 0) {
              properties[key] = valueArray[0].value;
            }
          }
        }
      } else if (resourceType === ResourceType.COMPANIES) {
        const company = await getCompanyDetails(id);
        resource = {
          uri,
          type: 'companies',
          title: company.values?.name?.[0]?.value || 'Unknown Company',
        };
        
        // Extract properties
        if (company.values) {
          for (const [key, valueArray] of Object.entries(company.values)) {
            if (Array.isArray(valueArray) && valueArray.length > 0) {
              properties[key] = valueArray[0].value;
            }
          }
        }
      } else if (resourceType === ResourceType.LISTS) {
        const list = await getListDetails(id);
        resource = {
          uri,
          type: 'lists',
          title: list.title || 'Untitled List',
        };
        
        // Add list properties
        properties = {
          object_slug: list.object_slug,
          description: list.description || '',
          entry_count: list.entry_count || 0,
          created_at: list.created_at || '',
          updated_at: list.updated_at || '',
        };
      } else {
        throw new Error(`Unknown resource type: ${resourceType}`);
      }
      
      // Return resource with properties
      return {
        resource: {
          ...resource,
          properties,
        },
      };
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error(String(error)),
        request.params.uri,
        "GET",
        {}
      );
    }
  });

  // Handler for deleting a resource (not implemented)
  server.setRequestHandler(DeleteResourceRequestSchema, async (request) => {
    return createErrorResult(
      new Error("Resource deletion is not currently supported"),
      request.params.uri,
      "DELETE",
      {}
    );
  });
}