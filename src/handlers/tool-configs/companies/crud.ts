/**
 * CRUD operation tool configurations for companies
 */
import { Company } from "../../../types/attio.js";
import { 
  createCompany,
  updateCompany,
  updateCompanyAttribute,
  deleteCompany
} from "../../../objects/companies/index.js";
import { ToolConfig } from "../../tool-types.js";

// Company CRUD tool configurations
export const crudToolConfigs = {
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
  } as ToolConfig
};

// CRUD tool definitions
export const crudToolDefinitions = [
  {
    name: "create-company",
    description: "Create a new company in Attio",
    inputSchema: {
      type: "object",
      properties: {
        attributes: {
          type: "object",
          description: "Company attributes to set",
          properties: {
            name: {
              type: "string",
              description: "Company name (required)"
            },
            website: {
              type: "string",
              description: "Company website URL"
            },
            description: {
              type: "string",
              description: "Company description"
            },
            industry: {
              type: "string",
              description: "Industry classification"
            }
          }
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
          description: "Attributes to update on the company"
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
        value: {
          description: "New value for the attribute. Can be string, number, object, null, or array of these types",
          oneOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "null" },
            { type: "object" },
            { type: "array" }
          ]
        }
      },
      required: ["companyId", "attributeName", "value"]
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
  }
];