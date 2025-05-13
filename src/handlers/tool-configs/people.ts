/**
 * People-related tool configurations
 */
import { ResourceType, AttioRecord } from "../../types/attio.js";
import {
  searchPeople,
  searchPeopleByEmail,
  searchPeopleByPhone,
  getPersonDetails,
  getPersonNotes,
  createPersonNote,
  advancedSearchPeople
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
  advancedSearch: {
    name: "advanced-search-people",
    handler: advancedSearchPeople,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} people with specified filters:\n${results.map((person: any) => 
        `- ${person.values?.name?.[0]?.value || 'Unnamed'} (ID: ${person.id?.record_id || 'unknown'})`).join('\n')}`;
    }
  } as AdvancedSearchToolConfig,
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
  } as CreateNoteToolConfig
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
  }
];
