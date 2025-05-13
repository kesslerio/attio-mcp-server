/**
 * People-related tool configurations
 */
import { ResourceType, AttioRecord, DateRange, FilterConditionType } from "../../types/attio.js";
import {
  searchPeople,
  searchPeopleByEmail,
  searchPeopleByPhone,
  getPersonDetails,
  getPersonNotes,
  createPersonNote,
  advancedSearchPeople,
  createCreatedDateFilter,
  createModifiedDateFilter,
  createLastInteractionFilter
} from "../../objects/people.js";
import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig, AdvancedSearchToolConfig } from "../tool-types.js";
import { createDateRangeFromPreset } from "../../utils/date-utils.js";

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
  details: {
    name: "get-person-details",
    handler: getPersonDetails,
  } as DetailsToolConfig,
  notes: {
    name: "get-person-notes",
    handler: getPersonNotes,
  } as NotesToolConfig,
  createNote: {
    name: "create-person-note",
    handler: createPersonNote,
    idParam: "personId"
  } as CreateNoteToolConfig,
  advancedSearch: {
    name: "advanced-search-people",
    handler: advancedSearchPeople,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with the specified filters:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  searchByDateCreated: {
    name: "search-people-by-date-created",
    handler: (dateRange?: DateRange, limit?: number, offset?: number) => {
      const filters = dateRange ? createCreatedDateFilter(dateRange) : undefined;
      return advancedSearchPeople(filters, limit, offset);
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people created in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  searchByDateModified: {
    name: "search-people-by-date-modified",
    handler: (dateRange?: DateRange, limit?: number, offset?: number) => {
      const filters = dateRange ? createModifiedDateFilter(dateRange) : undefined;
      return advancedSearchPeople(filters, limit, offset);
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people modified in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  searchByLastInteraction: {
    name: "search-people-by-last-interaction",
    handler: (dateRange?: DateRange, limit?: number, offset?: number) => {
      const filters = dateRange ? createLastInteractionFilter(dateRange) : undefined;
      return advancedSearchPeople(filters, limit, offset);
    },
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with interactions in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig
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
  {
    name: "advanced-search-people",
    description: "Advanced search for people with custom filters",
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
                        description: "Attribute slug to filter on (e.g., 'name', 'email', 'phone', 'created_at')"
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
    name: "search-people-by-date-created",
    description: "Search for people by their creation date",
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
    name: "search-people-by-date-modified",
    description: "Search for people by their last modification date",
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
  }
];
