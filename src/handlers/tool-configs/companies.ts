/**
 * Company-related tool configurations
 */
import { ResourceType, AttioRecord, DateRange, FilterConditionType } from "../../types/attio.js";
import { 
  searchCompanies, 
  getCompanyDetails, 
  getCompanyNotes, 
  createCompanyNote,
  advancedSearchCompanies,
  createCreatedDateFilter,
  createModifiedDateFilter,
  createLastInteractionFilter,
  createNameFilter,
  createWebsiteFilter,
  createIndustryFilter,
  createNumericFilter
} from "../../objects/companies.js";
import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig, AdvancedSearchToolConfig } from "../tool-types.js";
import { createDateRangeFromPreset } from "../../utils/date-utils.js";

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
  } as CreateNoteToolConfig,
  advancedSearch: {
    name: "advanced-search-companies",
    handler: advancedSearchCompanies,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies with the specified filters:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  searchByDateCreated: {
    name: "search-companies-by-date-created",
    handler: (dateRange?: DateRange, limit?: number, offset?: number) => {
      const filters = dateRange ? createCreatedDateFilter(dateRange) : undefined;
      return advancedSearchCompanies(filters, limit, offset);
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies created in the specified date range:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  searchByDateModified: {
    name: "search-companies-by-date-modified",
    handler: (dateRange?: DateRange, limit?: number, offset?: number) => {
      const filters = dateRange ? createModifiedDateFilter(dateRange) : undefined;
      return advancedSearchCompanies(filters, limit, offset);
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies modified in the specified date range:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  searchByLastInteraction: {
    name: "search-companies-by-last-interaction",
    handler: (dateRange?: DateRange, limit?: number, offset?: number) => {
      const filters = dateRange ? createLastInteractionFilter(dateRange) : undefined;
      return advancedSearchCompanies(filters, limit, offset);
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies with interactions in the specified date range:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  searchByEmployeeCount: {
    name: "search-companies-by-employee-count",
    handler: (min?: number, max?: number, limit?: number, offset?: number) => {
      const filters = createNumericFilter('employee_count', min, max);
      return advancedSearchCompanies(filters, limit, offset);
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies with the specified employee count range:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  searchByIndustry: {
    name: "search-companies-by-industry",
    handler: (industry: string, condition: FilterConditionType = FilterConditionType.EQUALS, limit?: number, offset?: number) => {
      const filters = createIndustryFilter(industry, condition);
      return advancedSearchCompanies(filters, limit, offset);
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} companies in the specified industry:\n${results.map((company: any) => 
        `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig
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
  {
    name: "advanced-search-companies",
    description: "Advanced search for companies with custom filters",
    inputSchema: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          description: "Filter configuration for advanced search",
          properties: {
            filters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  attribute: {
                    type: "object",
                    properties: {
                      slug: {
                        type: "string",
                        description: "Attribute slug to filter on (e.g., 'name', 'website', 'industry', 'created_at')"
                      }
                    },
                    required: ["slug"]
                  },
                  condition: {
                    type: "string",
                    description: "Filter condition",
                    enum: [
                      "equals", "not_equals", "contains", "not_contains", 
                      "starts_with", "ends_with", "greater_than", "less_than", 
                      "greater_than_or_equals", "less_than_or_equals",
                      "before", "after", "between", 
                      "is_empty", "is_not_empty", "is_set", "is_not_set"
                    ]
                  },
                  value: {
                    description: "Value to filter by (type depends on the attribute)"
                  }
                },
                required: ["attribute", "condition", "value"]
              }
            },
            matchAny: {
              type: "boolean",
              description: "When true, match any of the filters (OR logic). When false, match all filters (AND logic)."
            }
          }
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)"
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)"
        }
      }
    }
  },
  {
    name: "search-companies-by-date-created",
    description: "Search for companies by their creation date",
    inputSchema: {
      type: "object",
      properties: {
        dateRange: {
          type: "object",
          description: "Date range for filtering",
          properties: {
            start: {
              description: "Start date (ISO string or preset like 'last_month')"
            },
            end: {
              description: "End date (ISO string or preset like 'today')"
            }
          }
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
      required: ["dateRange"]
    }
  },
  {
    name: "search-companies-by-date-modified",
    description: "Search for companies by their last modification date",
    inputSchema: {
      type: "object",
      properties: {
        dateRange: {
          type: "object",
          description: "Date range for filtering",
          properties: {
            start: {
              description: "Start date (ISO string or preset like 'last_month')"
            },
            end: {
              description: "End date (ISO string or preset like 'today')"
            }
          }
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
      required: ["dateRange"]
    }
  },
  {
    name: "search-companies-by-last-interaction",
    description: "Search for companies by their last interaction date",
    inputSchema: {
      type: "object",
      properties: {
        dateRange: {
          type: "object",
          description: "Date range for filtering",
          properties: {
            start: {
              description: "Start date (ISO string or preset like 'last_month')"
            },
            end: {
              description: "End date (ISO string or preset like 'today')"
            }
          }
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
      required: ["dateRange"]
    }
  },
  {
    name: "search-companies-by-employee-count",
    description: "Search for companies by employee count range",
    inputSchema: {
      type: "object",
      properties: {
        min: {
          type: "number",
          description: "Minimum employee count (inclusive)"
        },
        max: {
          type: "number",
          description: "Maximum employee count (inclusive)"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)"
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default: 0)"
        }
      }
    }
  },
  {
    name: "search-companies-by-industry",
    description: "Search for companies by industry",
    inputSchema: {
      type: "object",
      properties: {
        industry: {
          type: "string",
          description: "Industry to filter by"
        },
        condition: {
          type: "string",
          description: "Filter condition (default: equals)",
          enum: ["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with"]
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
      required: ["industry"]
    }
  }
];
