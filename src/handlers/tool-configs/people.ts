/**
 * People-related tool configurations
 */
import { 
  ResourceType, 
  AttioRecord, 
  DateRange, 
  InteractionType,
  ActivityFilter 
} from "../../types/attio.js";
import {
  searchPeople,
  searchPeopleByEmail,
  searchPeopleByPhone,
  getPersonDetails,
  getPersonNotes,
  createPersonNote,
  searchPeopleByCreationDate,
  searchPeopleByModificationDate,
  searchPeopleByLastInteraction,
  searchPeopleByActivity,
  searchPeopleByCompany,
  searchPeopleByCompanyList,
  searchPeopleByNotes,
  advancedSearchPeople
} from "../../objects/people/index.js";
import { searchCompanies } from "../../objects/companies/index.js";
import { 
  SearchToolConfig, 
  DetailsToolConfig, 
  NotesToolConfig, 
  CreateNoteToolConfig,
  AdvancedSearchToolConfig,
  DateBasedSearchToolConfig
} from "../tool-types.js";

// People tool configurations
export const peopleToolConfigs = {
  search: {
    name: "search-people",
    handler: searchPeople,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as SearchToolConfig,
  searchByEmail: {
    name: "search-people-by-email",
    handler: searchPeopleByEmail,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with the specified email:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as SearchToolConfig,
  searchByPhone: {
    name: "search-people-by-phone",
    handler: searchPeopleByPhone,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with the specified phone number:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as SearchToolConfig,
  advancedSearch: {
    name: "advanced-search-people",
    handler: advancedSearchPeople,
    formatResult: (response: any) => {
      const results = response.results || response;
      return `Found ${results.length} people with specified filters:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as any,
  details: {
    name: "get-person-details",
    handler: getPersonDetails,
  } as DetailsToolConfig,
  notes: {
    name: "get-person-notes",
    handler: getPersonNotes,
    formatResult: (notes: any) => {
      if (!notes || notes.length === 0) {
        return 'No notes found for this person.';
      }
      return `Found ${notes.length} notes:\n${notes.map((note: any) => 
        `- ${note.title || 'Untitled'} (Created: ${note.timestamp || 'unknown'})\n  ${note.content ? note.content.substring(0, 100) + '...' : 'No content'}`
      ).join('\n\n')}`;
    }
  } as NotesToolConfig,
  createNote: {
    name: "create-person-note",
    handler: createPersonNote,
    idParam: "personId"
  } as CreateNoteToolConfig,
  
  // Advanced search and activity filtering tools
  searchByCreationDate: {
    name: "search-people-by-creation-date",
    handler: searchPeopleByCreationDate,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people created in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'}, Created: ${person.values?.created_at || 'unknown'})`).join('\n')}`;
    }
  } as DateBasedSearchToolConfig,
  
  searchByModificationDate: {
    name: "search-people-by-modification-date",
    handler: searchPeopleByModificationDate,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people modified in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'}, Modified: ${person.values?.updated_at || 'unknown'})`).join('\n')}`;
    }
  } as DateBasedSearchToolConfig,
  
  searchByLastInteraction: {
    name: "search-people-by-last-interaction",
    handler: searchPeopleByLastInteraction,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with interactions in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'}, Last Interaction: ${person.values?.last_interaction?.interacted_at || 'unknown'})`).join('\n')}`;
    }
  } as DateBasedSearchToolConfig,
  
  searchByActivity: {
    name: "search-people-by-activity",
    handler: searchPeopleByActivity,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with matching activity:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'}, Last Interaction: ${person.values?.last_interaction?.interacted_at || 'unknown'})`).join('\n')}`;
    }
  } as DateBasedSearchToolConfig,

  // Relationship-based filtering tools
  searchByCompany: {
    name: "search-people-by-company",
    /**
     * Handler for searching people by company affiliation
     * 
     * Expected filter format:
     * {
     *   companyFilter: {
     *     filters: [{
     *       attribute: { slug: 'companies.id' | 'companies.name' },
     *       condition: 'equals',
     *       value: string | { record_id: string }
     *     }]
     *   }
     * }
     */
    handler: async (args: any) => {
      // Extract companyFilter from arguments
      const { companyFilter } = args;
      
      // Log the incoming request for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[search-people-by-company] Received filter:', JSON.stringify(companyFilter, null, 2));
      }
      
      // Validate filter structure
      if (!companyFilter?.filters || !Array.isArray(companyFilter.filters) || companyFilter.filters.length === 0) {
        throw new Error('Invalid companyFilter format. Expected filters array with at least one filter');
      }
      
      // Handle multiple filters if provided (use the first valid one)
      for (const filter of companyFilter.filters) {
        // Check if this is a filter by company ID
        if (filter.attribute?.slug === 'companies.id' && filter.value?.record_id) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[search-people-by-company] Searching by company ID: ${filter.value.record_id}`);
          }
          // Call searchPeopleByCompany with just the company ID
          return searchPeopleByCompany(filter.value.record_id);
        }
        
        // Check if this is a filter by company name
        if (filter.attribute?.slug === 'companies.name' && filter.value) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[search-people-by-company] Searching by company name: ${filter.value}`);
          }
          // First search for the company by name
          const companies = await searchCompanies(filter.value);
          if (companies.length > 0) {
            // Use the first matching company's ID
            const companyId = companies[0].id?.record_id;
            if (companyId) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`[search-people-by-company] Found company ID: ${companyId}`);
              }
              return searchPeopleByCompany(companyId);
            }
          }
          throw new Error(`No company found with name: ${filter.value}`);
        }
      }
      
      // If no valid filter is found, throw error
      throw new Error('Invalid companyFilter format. Expected filter by companies.id or companies.name');
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people matching the company filter:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as any,

  searchByCompanyList: {
    name: "search-people-by-company-list",
    handler: searchPeopleByCompanyList,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people who work at companies in the specified list:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as any,

  searchByNotes: {
    name: "search-people-by-notes",
    handler: searchPeopleByNotes,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with matching notes:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as SearchToolConfig
};

// People tool definitions
export const peopleToolDefinitions = [
  {
    name: "search-people",
    description: "Search for people in Attio",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for people"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "search-people-by-email",
    description: "Search for people by email in Attio",
    inputSchema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Email address to search for"
        }
      },
      required: ["email"]
    }
  },
  {
    name: "search-people-by-phone",
    description: "Search for people by phone number in Attio",
    inputSchema: {
      type: "object",
      properties: {
        phone: {
          type: "string",
          description: "Phone number to search for"
        }
      },
      required: ["phone"]
    }
  },
  {
    name: "advanced-search-people",
    description: "Search for people using advanced filtering capabilities",
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
                        description: "Attribute to filter on (e.g., 'name', 'email', 'phone')"
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
    name: "get-person-details",
    description: "Get details of a person",
    inputSchema: {
      type: "object",
      properties: {
        personId: {
          type: "string",
          description: "ID of the person to get details for"
        }
      },
      required: ["personId"]
    }
  },
  {
    name: "get-person-notes",
    description: "Get notes for a person",
    inputSchema: {
      type: "object",
      properties: {
        personId: {
          type: "string",
          description: "ID of the person to get notes for"
        }
      },
      required: ["personId"]
    }
  },
  {
    name: "create-person-note",
    description: "Create a note for a specific person",
    inputSchema: {
      type: "object",
      properties: {
        personId: {
          type: "string",
          description: "ID of the person to create a note for"
        },
        content: {
          type: "string",
          description: "Content of the note"
        }
      },
      required: ["personId", "content"]
    }
  },
  
  // New activity and historical filtering tool definitions
  {
    name: "search-people-by-creation-date",
    description: "Search for people by their creation date",
    inputSchema: {
      type: "object",
      properties: {
        dateRange: {
          type: "object",
          description: "Date range for filtering",
          properties: {
            start: {
              type: "string",
              description: "Start date in ISO format or relative date expression (e.g., '2023-01-01')"
            },
            end: {
              type: "string",
              description: "End date in ISO format or relative date expression (e.g., '2023-12-31')"
            },
            preset: {
              type: "string",
              description: "Predefined date range (e.g., 'today', 'this_week', 'last_month')"
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
    name: "search-people-by-modification-date",
    description: "Search for people by their last modification date",
    inputSchema: {
      type: "object",
      properties: {
        dateRange: {
          type: "object",
          description: "Date range for filtering",
          properties: {
            start: {
              type: "string",
              description: "Start date in ISO format or relative date expression (e.g., '2023-01-01')"
            },
            end: {
              type: "string",
              description: "End date in ISO format or relative date expression (e.g., '2023-12-31')"
            },
            preset: {
              type: "string",
              description: "Predefined date range (e.g., 'today', 'this_week', 'last_month')"
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
    name: "search-people-by-last-interaction",
    description: "Search for people by their last interaction date",
    inputSchema: {
      type: "object",
      properties: {
        dateRange: {
          type: "object",
          description: "Date range for filtering",
          properties: {
            start: {
              type: "string",
              description: "Start date in ISO format or relative date expression (e.g., '2023-01-01')"
            },
            end: {
              type: "string",
              description: "End date in ISO format or relative date expression (e.g., '2023-12-31')"
            },
            preset: {
              type: "string",
              description: "Predefined date range (e.g., 'today', 'this_week', 'last_month')"
            }
          }
        },
        interactionType: {
          type: "string",
          description: "Type of interaction to filter by (any, email, calendar, phone, meeting, custom)",
          enum: ["any", "email", "calendar", "phone", "meeting", "custom"]
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
    name: "search-people-by-activity",
    description: "Search for people by their activity history",
    inputSchema: {
      type: "object",
      properties: {
        activityFilter: {
          type: "object",
          description: "Activity filter configuration",
          properties: {
            dateRange: {
              type: "object",
              description: "Date range for filtering",
              properties: {
                start: {
                  type: "string",
                  description: "Start date in ISO format or relative date expression (e.g., '2023-01-01')"
                },
                end: {
                  type: "string",
                  description: "End date in ISO format or relative date expression (e.g., '2023-12-31')"
                },
                preset: {
                  type: "string",
                  description: "Predefined date range (e.g., 'today', 'this_week', 'last_month')"
                }
              },
              required: ["start", "end"]
            },
            interactionType: {
              type: "string",
              description: "Type of interaction to filter by (any, email, calendar, phone, meeting, custom)",
              enum: ["any", "email", "calendar", "phone", "meeting", "custom"]
            }
          },
          required: ["dateRange"]
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
      required: ["activityFilter"]
    }
  },
  
  // Relationship-based filtering tool definitions
  {
    name: "search-people-by-company",
    description: "Search for people based on attributes of their associated companies",
    /**
     * @example
     * Search by company ID:
     * {
     *   companyFilter: {
     *     filters: [{
     *       attribute: { slug: 'companies.id' },
     *       condition: 'equals',
     *       value: { record_id: '0c472146-9c7b-5fde-96cd-5df8e5cf9575' }
     *     }]
     *   }
     * }
     * 
     * @example
     * Search by company name:
     * {
     *   companyFilter: {
     *     filters: [{
     *       attribute: { slug: 'companies.name' },
     *       condition: 'equals',
     *       value: 'Oakwood Precision Medicine'
     *     }]
     *   }
     * }
     */
    inputSchema: {
      type: "object",
      properties: {
        companyFilter: {
          type: "object",
          description: "Filter conditions to apply to companies. Supported slugs: 'companies.id', 'companies.name'",
          properties: {
            filters: {
              type: "array",
              description: "Array of filter conditions. The handler processes filters in order and uses the first valid one.",
              items: {
                type: "object",
                properties: {
                  attribute: {
                    type: "object",
                    properties: {
                      slug: {
                        type: "string",
                        description: "Company attribute to filter on. Currently supports: 'companies.id', 'companies.name'"
                      }
                    },
                    required: ["slug"]
                  },
                  condition: {
                    type: "string",
                    description: "Condition to apply (e.g., 'equals', 'contains', 'starts_with')"
                  },
                  value: {
                    type: ["string", "number", "boolean", "object"],
                    description: "Value to filter by. For company ID, use { record_id: 'id' }. For company name, use a string."
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
      required: ["companyFilter"]
    }
  },
  {
    name: "search-people-by-company-list",
    description: "Search for people who work at companies in a specific list",
    inputSchema: {
      type: "object",
      properties: {
        listId: {
          type: "string",
          description: "ID of the list containing companies"
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
    name: "search-people-by-notes",
    description: "Search for people that have notes containing specific text",
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
