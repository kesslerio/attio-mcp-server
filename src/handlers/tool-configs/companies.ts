/**
 * Company-related tool configurations
 */
import { ResourceType, AttioRecord, Company } from "../../types/attio.js";
import { 
  searchCompanies, 
  getCompanyDetails,
  getCompanyBasicInfo,
  getCompanyContactInfo,
  getCompanyBusinessInfo,
  getCompanySocialInfo,
  getCompanyFields,
  getCompanyCustomFields,
  discoverCompanyAttributes,
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
  // New specialized company info tools
  basicInfo: {
    name: "get-company-basic-info",
    handler: getCompanyBasicInfo,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unnamed';
      const website = company.values?.website?.[0]?.value || 'Not available';
      const industry = company.values?.industry?.[0]?.value || 'Not available';
      const type = company.values?.type?.[0]?.option?.title || 'Not available';
      const typePersona = company.values?.type_persona?.[0]?.option?.title || 'Not available';
      const employees = company.values?.employee_range?.[0]?.option?.title || 'Not available';
      const founded = company.values?.foundation_date?.[0]?.value || 'Not available';
      const location = company.values?.primary_location?.[0];
      const locationStr = location ? 
        `${location.locality || ''}, ${location.region || ''} ${location.country_code || ''}`.trim() : 
        'Not available';
      const description = company.values?.description?.[0]?.value || 'No description available';
      
      return `Company: ${name}
Website: ${website}
Industry: ${industry}
Type: ${type}
Type Persona: ${typePersona}
Location: ${locationStr}
Employees: ${employees}
Founded: ${founded}

Description:
${description}`;
    }
  } as DetailsToolConfig,
  
  contactInfo: {
    name: "get-company-contact-info",
    handler: getCompanyContactInfo,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unnamed';
      const website = company.values?.website?.[0]?.value || 'Not available';
      const phone = company.values?.company_phone_5?.[0]?.phone_number || 'Not available';
      const location = company.values?.primary_location?.[0];
      const streetAddress = company.values?.street_address?.[0]?.value || '';
      const streetAddress2 = company.values?.street_address_2?.[0]?.value || '';
      const city = company.values?.city?.[0]?.value || '';
      const state = company.values?.state?.[0]?.value || '';
      const postalCode = company.values?.postal_code?.[0]?.value || '';
      const country = company.values?.country?.[0]?.value || '';
      
      let address = streetAddress;
      if (streetAddress2) address += `, ${streetAddress2}`;
      if (city) address += `, ${city}`;
      if (state) address += `, ${state}`;
      if (postalCode) address += ` ${postalCode}`;
      if (country) address += `, ${country}`;
      
      return `Company: ${name}
Website: ${website}
Phone: ${phone}

Address:
${address || 'Not available'}`;
    }
  } as DetailsToolConfig,
  
  businessInfo: {
    name: "get-company-business-info",
    handler: getCompanyBusinessInfo,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unnamed';
      const type = company.values?.type?.[0]?.option?.title || 'Not available';
      const typePersona = company.values?.type_persona?.[0]?.option?.title || 'Not available';
      const services = company.values?.services || [];
      const categories = company.values?.categories?.map((cat: any) => cat.option?.title) || [];
      const industry = company.values?.industry?.[0]?.value || 'Not available';
      const revenue = company.values?.estimated_arr_usd?.[0]?.option?.title || 'Not available';
      const funding = company.values?.funding_raised_usd?.[0]?.value || 'Not available';
      const employees = company.values?.employee_range?.[0]?.option?.title || 'Not available';
      const founded = company.values?.foundation_date?.[0]?.value || 'Not available';
      
      return `Company: ${name}
Industry: ${industry}
Type: ${type}
Type Persona: ${typePersona}
Employees: ${employees}
Founded: ${founded}
Estimated Revenue: ${revenue}
Funding Raised: ${funding}

Categories:
${categories.join(', ') || 'None'}

Services:
${services.length > 0 ? JSON.stringify(services, null, 2) : 'None'}`;
    }
  } as DetailsToolConfig,
  
  socialInfo: {
    name: "get-company-social-info",
    handler: getCompanySocialInfo,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unnamed';
      const website = company.values?.website?.[0]?.value || 'Not available';
      const linkedin = company.values?.linkedin?.[0]?.value || 'Not available';
      const twitter = company.values?.twitter?.[0]?.value || 'Not available';
      const facebook = company.values?.facebook?.[0]?.value || 'Not available';
      const instagram = company.values?.instagram?.[0]?.value || 'Not available';
      const angellist = company.values?.angellist?.[0]?.value || 'Not available';
      const twitterFollowers = company.values?.twitter_follower_count?.[0]?.value || 'Not available';
      
      return `Company: ${name}
Website: ${website}

Social Media:
LinkedIn: ${linkedin}
Twitter: ${twitter}
Facebook: ${facebook}
Instagram: ${instagram}
AngelList: ${angellist}

Twitter Followers: ${twitterFollowers}`;
    }
  } as DetailsToolConfig,
  
  fields: {
    name: "get-company-fields",
    handler: getCompanyFields,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unknown';
      const id = company.id?.record_id || 'Unknown';
      const fieldCount = Object.keys(company.values || {}).length;
      const fields = Object.keys(company.values || {});
      
      // Create a simplified version of the values for display
      const simplifiedValues: Record<string, any> = {};
      for (const [key, value] of Object.entries(company.values || {})) {
        if (Array.isArray(value) && value.length > 0) {
          // Extract just the actual value from the array structure
          const firstItem = value[0];
          if (firstItem && firstItem.value !== undefined) {
            simplifiedValues[key] = firstItem.value;
          } else if (firstItem && firstItem.target_record_id) {
            // Handle reference fields
            simplifiedValues[key] = `Reference: ${firstItem.target_record_id}`;
          } else {
            simplifiedValues[key] = firstItem;
          }
        } else {
          simplifiedValues[key] = value;
        }
      }
      
      return `Company: ${name} (ID: ${id})
Fields retrieved: ${fieldCount} (${fields.join(', ')})

${JSON.stringify(simplifiedValues, null, 2)}`;
    }
  } as ToolConfig,
  
  customFields: {
    name: "get-company-custom-fields",
    handler: async (companyId: string, customFieldNames?: string[] | string) => {
      // Support both array of field names and comma-separated string
      let fields: string[] | undefined;
      
      if (customFieldNames) {
        if (typeof customFieldNames === 'string') {
          fields = customFieldNames.split(',').map((f: string) => f.trim());
        } else if (Array.isArray(customFieldNames)) {
          fields = customFieldNames;
        }
      }
      
      return await getCompanyCustomFields(companyId, fields);
    },
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unknown';
      const id = company.id?.record_id || 'Unknown';
      const customFields = { ...company.values };
      delete customFields.name;
      
      const fieldCount = Object.keys(customFields).length;
      
      return `Company: ${name} (ID: ${id})
Custom fields: ${fieldCount}

${fieldCount > 0 ? JSON.stringify(customFields, null, 2) : 'No custom fields found'}`;
    }
  } as ToolConfig,
  
  discoverAttributes: {
    name: "discover-company-attributes",
    handler: discoverCompanyAttributes,
    formatResult: (result: any) => {
      let output = `Company Attributes Discovery\n`;
      output += `Total attributes: ${result.all.length}\n`;
      output += `Standard fields: ${result.standard.length}\n`;
      output += `Custom fields: ${result.custom.length}\n\n`;
      
      output += `STANDARD FIELDS:\n`;
      result.standard.forEach((field: string) => {
        output += `  - ${field}\n`;
      });
      
      output += `\nCUSTOM FIELDS:\n`;
      result.custom.forEach((field: string) => {
        const fieldInfo = result.all.find((f: any) => f.name === field);
        output += `  - ${field} (${fieldInfo?.type || 'unknown'})\n`;
      });
      
      return output;
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
  },
  {
    name: "get-company-basic-info",
    description: "Get basic company information (limited fields for performance)",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
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
    name: "get-company-contact-info",
    description: "Get company contact information including phone, address, etc.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
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
    name: "get-company-business-info",
    description: "Get company business information including services, categories, revenue, etc.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
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
    name: "get-company-social-info",
    description: "Get company social media presence information",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
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
    name: "get-company-fields",
    description: "Get specific fields from a company by field names",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Array of field names to retrieve"
        }
      },
      required: ["companyId", "fields"]
    }
  },
  {
    name: "get-company-custom-fields",
    description: "Get custom fields for a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
        },
        customFieldNames: {
          type: ["string", "array"],
          items: { type: "string" },
          description: "Optional: specific custom field names to retrieve (comma-separated string or array). If omitted, returns all custom fields."
        }
      },
      required: ["companyId"]
    }
  },
  {
    name: "discover-company-attributes",
    description: "Discover all available company attributes in the workspace",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];
