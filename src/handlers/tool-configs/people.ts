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
  createPersonNote
} from "../../objects/people.js";
import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig } from "../tool-types.js";

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
