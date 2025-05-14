/**
 * Company-related tool configurations
 */
import { ResourceType, AttioRecord } from "../../types/attio.js";
import { 
  searchCompanies, 
  getCompanyDetails, 
  getCompanyNotes, 
  createCompanyNote,
  advancedSearchCompanies,
  searchCompaniesByPeople,
  searchCompaniesByPeopleList,
  searchCompaniesByNotes
} from "../../objects/companies.js";
import { 
  SearchToolConfig, 
  DetailsToolConfig, 
  NotesToolConfig, 
  CreateNoteToolConfig,
  AdvancedSearchToolConfig
} from "../tool-types.js";

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
  
  // Relationship-based search tools
  searchByPeople: {
    name: "search-companies-by-people",
    handler: searchCompaniesByPeople,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies matching the people filter:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  
  searchByPeopleList: {
    name: "search-companies-by-people-list",
    handler: searchCompaniesByPeopleList,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies that have employees in the specified list:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as SearchToolConfig,
  
  searchByNotes: {
    name: "search-companies-by-notes",
    handler: searchCompaniesByNotes,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies with matching notes:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as SearchToolConfig,
  advancedSearch: {
    name: "advanced-search-companies",
    handler: advancedSearchCompanies,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies with specified filters:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
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
    name: "advanced-search-companies",
    description: "Search for companies using advanced filtering capabilities",
    inputSchema: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          description: "Complex filter object for advanced searching",
          properties: {
            filters: {
              type: "array",
              description: "Array of filter conditions",
              items: {
                type: "object",
                properties: {
                  attribute: {
                    type: "object",
                    properties: {
                      slug: {
                        type: "string",
                        description: "Attribute to filter on (e.g., 'name', 'website', 'industry')"
                      }
                    },
                    required: ["slug"]
                  },
                  condition: {
                    type: "string",
                    description: "Condition to apply (e.g., 'equals', 'contains', 'starts_with')"
                  },
                  value: {
                    type: ["string", "number", "boolean"],
                    description: "Value to filter by"
                  }
                },
                required: ["attribute", "condition", "value"]
              }
            },
            matchAny: {
              type: "boolean",
              description: "When true, matches any filter (OR logic). When false, matches all filters (AND logic)"
            }
          },
          required: ["filters"]
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)"
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)"
        }
      },
      required: ["filters"]
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
        },
        uri: {
          type: "string",
          description: "URI of the company in the format 'attio://companies/{id}'"
        }
      },
      oneOf: [
        { required: ["companyId"] },
        { required: ["uri"] }
      ]
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
        },
        uri: {
          type: "string",
          description: "URI of the company in the format 'attio://companies/{id}'"
        },
        limit: {
          type: "number",
          description: "Maximum number of notes to fetch (default: 10)"
        },
        offset: {
          type: "number",
          description: "Number of notes to skip for pagination (default: 0)"
        }
      },
      oneOf: [
        { required: ["companyId"] },
        { required: ["uri"] }
      ]
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
        uri: {
          type: "string",
          description: "URI of the company in the format 'attio://companies/{id}'"
        },
        title: {
          type: "string",
          description: "Title of the note (optional)"
        },
        content: {
          type: "string",
          description: "Content of the note"
        }
      },
      required: ["content"],
      oneOf: [
        { required: ["companyId"] },
        { required: ["uri"] }
      ]
    }
  },
  
  // Relationship-based tools
  {
    name: "search-companies-by-people",
    description: "Search for companies based on attributes of their associated people",
    inputSchema: {
      type: "object",
      properties: {
        peopleFilter: {
          type: "object",
          description: "Filter conditions to apply to people",
          properties: {
            filters: {
              type: "array",
              description: "Array of filter conditions",
              items: {
                type: "object",
                properties: {
                  attribute: {
                    type: "object",
                    properties: {
                      slug: {
                        type: "string",
                        description: "Person attribute to filter on (e.g., 'name', 'email', 'phone')"
                      }
                    },
                    required: ["slug"]
                  },
                  condition: {
                    type: "string",
                    description: "Condition to apply (e.g., 'equals', 'contains', 'starts_with')"
                  },
                  value: {
                    type: ["string", "number", "boolean"],
                    description: "Value to filter by"
                  }
                },
                required: ["attribute", "condition", "value"]
              }
            },
            matchAny: {
              type: "boolean",
              description: "When true, matches any filter (OR logic). When false, matches all filters (AND logic)"
            }
          },
          required: ["filters"]
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)"
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)"
        }
      },
      required: ["peopleFilter"]
    }
  },
  {
    name: "search-companies-by-people-list",
    description: "Search for companies that have employees in a specific list",
    inputSchema: {
      type: "object",
      properties: {
        listId: {
          type: "string",
          description: "ID of the list containing people"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)"
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)"
        }
      },
      required: ["listId"]
    }
  },
  {
    name: "search-companies-by-notes",
    description: "Search for companies that have notes containing specific text",
    inputSchema: {
      type: "object",
      properties: {
        searchText: {
          type: "string",
          description: "Text to search for in notes"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)"
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)"
        }
      },
      required: ["searchText"]
    }
  }
];
