/**
 * CRUD operation tool configurations for companies
 */

import {
  createCompany,
  deleteCompany,
  updateCompany,
  updateCompanyAttribute,
} from '../../../objects/companies/index.js';
import { Company } from '../../../types/attio.js';
import { ToolConfig } from '../../tool-types.js';

/**
 * Helper function to safely extract company display information
 *
 * Handles all the necessary null checks for nested properties
 *
 * @param company - Company object from Attio API
 * @returns Object with extracted name and ID with fallbacks
 */
function extractCompanyDisplayInfo(company: Company): {
  name: string;
  id: string;
} {
  // Handle potentially missing or malformed data safely
  const name = company?.values?.name?.[0]?.value || 'Unnamed';

  // Handle the id which could be a string or an object with record_id
  let id: string = 'unknown';
  if (company?.id) {
    if (typeof company.id === 'string') {
      id = company.id;
    } else if (company.id.record_id) {
      id = company.id.record_id;
    }
  }

  return { name, id };
}

// Company CRUD tool configurations
export const crudToolConfigs = {
  // DO NOT add basicInfo tool here - it's already defined in formatterConfigs
  // Adding it here would cause duplicate tool name conflict in MCP

  create: {
    name: 'create-company',
    handler: createCompany,
    formatResult: (result: Company) => {
      const { name, id } = extractCompanyDisplayInfo(result);
      return `Company created: ${name} (ID: ${id})`;
    },
  } as ToolConfig,

  update: {
    name: 'update-company',
    handler: updateCompany,
    formatResult: (result: Company) => {
      const { name, id } = extractCompanyDisplayInfo(result);
      return `Company updated: ${name} (ID: ${id})`;
    },
  } as ToolConfig,

  updateAttribute: {
    name: 'update-company-attribute',
    handler: updateCompanyAttribute,
    formatResult: (result: Company) => {
      const { name, id } = extractCompanyDisplayInfo(result);
      return `Company attribute updated for: ${name} (ID: ${id})`;
    },
  } as ToolConfig,

  delete: {
    name: 'delete-company',
    handler: deleteCompany,
    formatResult: (result: boolean) =>
      result ? 'Company deleted successfully' : 'Failed to delete company',
  } as ToolConfig,
};

// CRUD tool definitions
export const crudToolDefinitions = [
  // DO NOT add get-company-basic-info definition here - it's already defined in formatterToolDefinitions
  // Adding it here would cause duplicate tool name conflict in MCP
  {
    name: 'create-company',
    description: 'Create a new company record in your CRM (Attio)',
    inputSchema: {
      type: 'object',
      properties: {
        attributes: {
          type: 'object',
          description: 'Company attributes to set',
          properties: {
            name: {
              type: 'string',
              description: 'Company name (required)',
            },
            website: {
              type: 'string',
              description: 'Company website URL',
            },
            description: {
              type: 'string',
              description: 'Company description',
            },
            industry: {
              type: 'string',
              description:
                "Industry classification (maps to 'categories' in Attio API). If both 'industry' and 'categories' are provided, 'industry' takes precedence.",
            },
          },
        },
      },
      required: ['attributes'],
    },
  },
  {
    name: 'update-company',
    description: 'Update an existing company record in your CRM (Attio)',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company to update',
        },
        attributes: {
          type: 'object',
          description: 'Attributes to update on the company',
        },
      },
      required: ['companyId', 'attributes'],
    },
  },
  {
    name: 'update-company-attribute',
    description: 'Update a specific attribute of a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company to update',
        },
        attributeName: {
          type: 'string',
          description: 'Name of the attribute to update',
        },
        value: {
          description:
            'New value for the attribute. Can be string, number, object, null, or array of these types',
          oneOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'null' },
            { type: 'object' },
            { type: 'array' },
          ],
        },
      },
      required: ['companyId', 'attributeName', 'value'],
    },
  },
  {
    name: 'delete-company',
    description: 'Delete a company record from your CRM (Attio)',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company to delete',
        },
      },
      required: ['companyId'],
    },
  },
];
