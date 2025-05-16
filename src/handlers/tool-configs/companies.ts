/**
 * Company-related tool configurations
 */
import { ResourceType, AttioRecord, Company } from "../../types/attio.js";
import { 
  searchCompanies, 
  getCompanyDetails, 
  getCompanyNotes, 
  createCompanyNote,
  advancedSearchCompanies,
  searchCompaniesByPeople,
  searchCompaniesByPeopleList,
  searchCompaniesByNotes,
  createCompany,
  updateCompany,
  updateCompanyAttribute,
  deleteCompany
} from "../../objects/companies.js";
import { 
  SearchToolConfig, 
  DetailsToolConfig, 
  NotesToolConfig, 
  CreateNoteToolConfig,
  AdvancedSearchToolConfig,
  ToolConfig
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
    formatResult: (company: Company) => {
      const companyName = company.values?.name?.[0]?.value || 'Unnamed';
      const companyId = company.id?.record_id || 'unknown';
      const website = company.values?.website?.[0]?.value || 'Not available';
      const industry = company.values?.industry?.[0]?.value || 'Not available';
      const description = company.values?.description?.[0]?.value || 'No description available';
      const createdAt = company.created_at || 'Unknown';
      
      // Extract other key details
      const location = company.values?.primary_location?.[0];
      const locationStr = location ? 
        `${location.locality || ''}, ${location.region || ''} ${location.country_code || ''}`.trim() : 
        'Not available';
      
      const employeeRange = company.values?.employee_range?.[0]?.option?.title || 'Not available';
      const foundationDate = company.values?.foundation_date?.[0]?.value || 'Not available';
      
      return `Company: ${companyName} (ID: ${companyId})
Created: ${createdAt}
Website: ${website}
Industry: ${industry}
Location: ${locationStr}
Employees: ${employeeRange}
Founded: ${foundationDate}

Description:
${description}

For full details, use get-company-json with this ID: ${companyId}`;
    }
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
  create: {
    name: "create-company",
    handler: createCompany,
    formatResult: (result: Company) => 
      `Company created: ${result.values?.name?.[0]?.value || 'Unnamed'} (ID: ${result.id?.record_id || 'unknown'})`
  } as ToolConfig,
  update: {
    name: "update-company",
    handler: updateCompany,
    formatResult: (result: Company) => 
      `Company updated: ${result.values?.name?.[0]?.value || 'Unnamed'} (ID: ${result.id?.record_id || 'unknown'})`
  } as ToolConfig,
  updateAttribute: {
    name: "update-company-attribute",
    handler: updateCompanyAttribute,
    formatResult: (result: Company) => 
      `Company attribute updated for: ${result.values?.name?.[0]?.value || 'Unnamed'} (ID: ${result.id?.record_id || 'unknown'})`
  } as ToolConfig,
  delete: {
    name: "delete-company",
    handler: deleteCompany,
    formatResult: (result: boolean) => result ? "Company deleted successfully" : "Failed to delete company"
  } as ToolConfig,
  json: {
    name: "get-company-json",
    handler: getCompanyDetails,
    formatResult: (company: Company) => {
      try {
        const cleanedCompany = JSON.parse(JSON.stringify(company));
        
        // Fix the typo in the response data
        if (cleanedCompany.values?.typpe) {
          cleanedCompany.values.type = cleanedCompany.values.typpe;
          delete cleanedCompany.values.typpe;
        }
        
        // Safely handle the services field if it exists
        if (cleanedCompany.values?.services !== undefined) {
          // Ensure services is an array
          if (!Array.isArray(cleanedCompany.values.services)) {
            cleanedCompany.values.services = cleanedCompany.values.services ? [cleanedCompany.values.services] : [];
          }
        }
        
        // Instead of returning the entire JSON at once, create a summary
        const summary = {
          id: cleanedCompany.id,
          created_at: cleanedCompany.created_at,
          web_url: cleanedCompany.web_url,
          basic_values: {
            name: cleanedCompany.values?.name?.[0]?.value,
            website: cleanedCompany.values?.website?.[0]?.value,
            type: cleanedCompany.values?.type?.[0]?.option?.title,
            type_persona: cleanedCompany.values?.type_persona?.[0]?.option?.title,
            services: cleanedCompany.values?.services || [],
            employee_range: cleanedCompany.values?.employee_range?.[0]?.option?.title,
            foundation_date: cleanedCompany.values?.foundation_date?.[0]?.value
          },
          attribute_count: Object.keys(cleanedCompany.values || {}).length,
          message: "Full JSON data is too large for display. Use get-company-attributes to access specific fields."
        };
        
        return JSON.stringify(summary, null, 2);
      } catch (error) {
        // If any error occurs during JSON processing, return a safe error message
        return JSON.stringify({
          error: "Failed to process company data",
          message: error instanceof Error ? error.message : "Unknown error",
          companyId: company.id?.record_id || 'unknown'
        }, null, 2);
      }
    }
  } as DetailsToolConfig,
  attributes: {
    name: "get-company-attributes",
    handler: async (companyId: string, attributeName?: string) => {
      const company = await getCompanyDetails(companyId);
      
      if (!attributeName) {
        // Return list of available attributes
        const attributes = Object.keys(company.values || {}).map(key => ({
          name: key,
          type: Array.isArray(company.values?.[key]) && company.values[key].length > 0
            ? company.values[key][0].attribute_type
            : "unknown",
          hasValue: Array.isArray(company.values?.[key]) && company.values[key].length > 0
        }));
        
        return {
          companyId: company.id?.record_id,
          companyName: company.values?.name?.[0]?.value,
          attributeCount: attributes.length,
          attributes: attributes.sort((a, b) => a.name.localeCompare(b.name))
        };
      }
      
      // Return specific attribute value
      const attributeData = company.values?.[attributeName];
      
      return {
        companyId: company.id?.record_id,
        companyName: company.values?.name?.[0]?.value,
        attribute: attributeName,
        value: attributeData || null,
        exists: attributeData !== undefined
      };
    },
    formatResult: (result: any) => {
      if (result.attributes) {
        // List of attributes
        const grouped = result.attributes.reduce((acc: any, attr: any) => {
          if (!acc[attr.type]) acc[attr.type] = [];
          acc[attr.type].push(attr);
          return acc;
        }, {});
        
        let output = `Company: ${result.companyName} (ID: ${result.companyId})\n`;
        output += `Total attributes: ${result.attributeCount}\n\n`;
        
        Object.entries(grouped).forEach(([type, attrs]: [string, any]) => {
          output += `${type.toUpperCase()} attributes:\n`;
          attrs.forEach((attr: any) => {
            output += `  - ${attr.name}${!attr.hasValue ? ' (empty)' : ''}\n`;
          });
          output += '\n';
        });
        
        return output;
      } else {
        // Specific attribute value
        let output = `Company: ${result.companyName} (ID: ${result.companyId})\n`;
        output += `Attribute: ${result.attribute}\n`;
        output += `Exists: ${result.exists}\n`;
        
        if (result.value) {
          output += `Value:\n${JSON.stringify(result.value, null, 2)}`;
        } else {
          output += 'Value: null';
        }
        
        return output;
      }
    }
  } as ToolConfig
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
  },
  {
    name: "create-company",
    description: "Create a new company in Attio",
    inputSchema: {
      type: "object",
      properties: {
        attributes: {
          type: "object",
          description: "Company attributes (name, website, etc.)",
          properties: {
            name: {
              type: "string",
              description: "Company name"
            },
            website: {
              type: "string",
              description: "Company website URL"
            },
            industry: {
              type: "string",
              description: "Company industry"
            }
          },
          additionalProperties: true
        }
      },
      required: ["attributes"]
    }
  },
  {
    name: "update-company",
    description: "Update an existing company in Attio",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to update"
        },
        attributes: {
          type: "object",
          description: "Company attributes to update",
          additionalProperties: true
        }
      },
      required: ["companyId", "attributes"]
    }
  },
  {
    name: "update-company-attribute",
    description: "Update a specific attribute of a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to update"
        },
        attributeName: {
          type: "string",
          description: "Name of the attribute to update"
        },
        attributeValue: {
          type: ["string", "number", "boolean", "object", "array"],
          description: "New value for the attribute"
        }
      },
      required: ["companyId", "attributeName", "attributeValue"]
    }
  },
  {
    name: "delete-company",
    description: "Delete a company from Attio",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to delete"
        }
      },
      required: ["companyId"]
    }
  },
  {
    name: "get-company-json",
    description: "Get summary JSON details of a company (full data too large to display)",
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
    name: "get-company-attributes",
    description: "Get all available attributes or a specific attribute value for a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
        },
        attributeName: {
          type: "string",
          description: "Optional: specific attribute name to retrieve. If omitted, returns list of all attributes."
        }
      },
      required: ["companyId"]
    }
  }
];
