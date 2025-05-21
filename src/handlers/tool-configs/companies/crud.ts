/**
 * CRUD operation tool configurations for companies
 */
import { Company } from "../../../types/attio.js";
import { 
  createCompany,
  updateCompany,
  updateCompanyAttribute,
  deleteCompany,
  getCompanyBasicInfo
} from "../../../objects/companies/index.js";
import { ToolConfig } from "../../tool-types.js";
import { formatterConfigs } from "./formatters.js";

// Company CRUD tool configurations
export const crudToolConfigs = {
  basicInfo: {
    name: "get-company-basic-info",
    handler: getCompanyBasicInfo,
    formatResult: formatterConfigs.basicInfo.formatResult
  } as ToolConfig,
  
  create: {
    name: "create-company",
    handler: createCompany,
    formatResult: (result: Company) => {
      // Extract name safely, handling the array format correctly
      const companyName = result.values?.name?.[0]?.value || 'Unnamed';
      const companyId = result.id?.record_id || result.id || 'unknown';
      return `Company created: ${companyName} (ID: ${companyId})`;
    }
  } as ToolConfig,
  
  update: {
    name: "update-company",
    handler: updateCompany,
    formatResult: (result: Company) => {
      // Extract name safely, handling the array format correctly
      const companyName = result.values?.name?.[0]?.value || 'Unnamed';
      const companyId = result.id?.record_id || result.id || 'unknown';
      return `Company updated: ${companyName} (ID: ${companyId})`;
    }
  } as ToolConfig,
  
  updateAttribute: {
    name: "update-company-attribute",
    handler: updateCompanyAttribute,
    formatResult: (result: Company) => {
      // Extract name safely, handling the array format correctly
      const companyName = result.values?.name?.[0]?.value || 'Unnamed';
      const companyId = result.id?.record_id || result.id || 'unknown';
      return `Company attribute updated for: ${companyName} (ID: ${companyId})`;
    }
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
    name: "get-company-basic-info",
    description: "Get basic information about a company in Attio",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to retrieve"
        }
      },
      required: ["companyId"]
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