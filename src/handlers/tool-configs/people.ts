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
  searchPeopleByActivity
} from "../../objects/people.js";
import { 
  SearchToolConfig, 
  DetailsToolConfig, 
  NotesToolConfig, 
  CreateNoteToolConfig,
  AdvancedSearchToolConfig 
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
  
  // Advanced search and activity filtering tools
  searchByCreationDate: {
    name: "search-people-by-creation-date",
    handler: searchPeopleByCreationDate,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people created in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'}, Created: ${person.values?.created_at || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  
  searchByModificationDate: {
    name: "search-people-by-modification-date",
    handler: searchPeopleByModificationDate,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people modified in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'}, Modified: ${person.values?.updated_at || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  
  searchByLastInteraction: {
    name: "search-people-by-last-interaction",
    handler: searchPeopleByLastInteraction,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with interactions in the specified date range:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'}, Last Interaction: ${person.values?.last_interaction?.interacted_at || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
  
  searchByActivity: {
    name: "search-people-by-activity",
    handler: searchPeopleByActivity,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with matching activity:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'}, Last Interaction: ${person.values?.last_interaction?.interacted_at || 'unknown'})`).join('\n')}`;
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
  }
];
