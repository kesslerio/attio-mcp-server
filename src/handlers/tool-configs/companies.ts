/**
 * Company-related tool configurations
 */
import { ResourceType, AttioRecord } from "../../types/attio.js";
import { 
  searchCompanies, 
  getCompanyDetails, 
  getCompanyNotes, 
  createCompanyNote 
} from "../../objects/companies.js";
import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig } from "../tool-types.js";

// Company tool configurations
export const companyToolConfigs = {
  search: {
    name: "search-companies",
    handler: searchCompanies,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as SearchToolConfig,
  details: {
    name: "get-company-details",
    handler: getCompanyDetails,
  } as DetailsToolConfig,
  notes: {
    name: "get-company-notes",
    handler: getCompanyNotes,
  } as NotesToolConfig,
  createNote: {
    name: "create-company-note",
    handler: createCompanyNote,
    idParam: "companyId"
  } as CreateNoteToolConfig
};

// Company tool definitions
export const companyToolDefinitions = [
  {
    name: "search-companies",
    description: "Search for companies in Attio",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for companies"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get-company-details",
    description: "Get details of a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to get details for"
        }
      },
      required: ["companyId"]
    }
  },
  {
    name: "get-company-notes",
    description: "Get notes for a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to get notes for"
        }
      },
      required: ["companyId"]
    }
  },
  {
    name: "create-company-note",
    description: "Create a note for a specific company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to create a note for"
        },
        content: {
          type: "string",
          description: "Content of the note"
        }
      },
      required: ["companyId", "content"]
    }
  }
];
