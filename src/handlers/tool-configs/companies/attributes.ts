/**
 * Attribute management tool configurations for companies
 */
import { Company } from '../../../types/attio.js';
import {
  getCompanyFields,
  getCompanyCustomFields,
  discoverCompanyAttributes,
  getCompanyAttributes,
} from '../../../objects/companies/index.js';
import { ToolConfig } from '../../tool-types.js';

// Company attribute tool configurations
export const attributeToolConfigs = {
  fields: {
    name: 'get-company-fields',
    handler: getCompanyFields,
    formatResult: (company: Partial<Company>) => {
      const name = (company.values?.name as any)?.[0]?.value || 'Unknown';
      const id = company.id?.record_id || 'Unknown';
      const fieldCount = Object.keys(company.values || {}).length;
      const fields = Object.keys(company.values || {});

      // Create a simplified version of the values for display
      const simplifiedValues: Record<string, unknown> = {};
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
    },
  } as ToolConfig,

  customFields: {
    name: 'get-company-custom-fields',
    handler: async (
      companyId: string,
      customFieldNames?: string[] | string
    ) => {
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
      const name = (company.values?.name as any)?.[0]?.value || 'Unknown';
      const id = company.id?.record_id || 'Unknown';
      const customFields = { ...company.values };
      delete customFields.name;

      const fieldCount = Object.keys(customFields).length;

      return `Company: ${name} (ID: ${id})
Custom fields: ${fieldCount}

${
  fieldCount > 0
    ? JSON.stringify(customFields, null, 2)
    : 'No custom fields found'
}`;
    },
  } as ToolConfig,

  discoverAttributes: {
    name: 'discover-company-attributes',
    handler: discoverCompanyAttributes,
    formatResult: (result: Record<string, unknown>): string => {
      // Type-safe property access with proper narrowing
      const all = Array.isArray(result.all) ? result.all : [];
      const standard = Array.isArray(result.standard) ? result.standard : [];
      const custom = Array.isArray(result.custom) ? result.custom : [];

      // Sanity check for empty or invalid results
      if (all.length === 0 && standard.length === 0 && custom.length === 0) {
        return 'No company attributes found. This may occur if there are no companies in the workspace.';
      }

      let output = `Company Attributes Discovery\n`;
      output += `Total attributes: ${all.length}\n`;
      output += `Standard fields: ${standard.length}\n`;
      output += `Custom fields: ${custom.length}\n\n`;

      output += `STANDARD FIELDS:\n`;
      if (standard.length > 0) {
        standard.forEach((field: unknown) => {
          output += `  - ${String(field)}\n`;
        });
      } else {
        output += '  None found\n';
      }

      output += `\nCUSTOM FIELDS:\n`;
      if (custom.length > 0) {
        custom.forEach((field: unknown) => {
          const fieldInfo = all.find(
            (f: unknown) =>
              typeof f === 'object' &&
              f !== null &&
              'name' in f &&
              (f as { name: unknown }).name === field
          );
          const fieldType =
            fieldInfo && typeof fieldInfo === 'object' && 'type' in fieldInfo
              ? String((fieldInfo as { type: unknown }).type)
              : 'unknown';
          output += `  - ${String(field)} (${fieldType})\n`;
        });
      } else {
        output += '  None found\n';
      }

      return output;
    },
  } as ToolConfig,

  getAttributes: {
    name: 'get-company-attributes',
    handler: getCompanyAttributes,
    formatResult: (result: Record<string, unknown>): string => {
      // Enhanced error handling for unexpected result structure
      if (!result || typeof result !== 'object') {
        return `Error: Unable to process the response. Received: ${JSON.stringify(
          result
        )}`;
      }

      // Handle case where the result contains an error object
      if (result.error) {
        const errorMessage =
          typeof result.error === 'object' &&
          result.error !== null &&
          'message' in result.error &&
          typeof (result.error as { message: unknown }).message === 'string'
            ? (result.error as { message: string }).message
            : JSON.stringify(result.error);
        return `Error retrieving attribute: ${errorMessage}`;
      }

      if (result.value !== undefined) {
        // Return specific attribute value
        const company =
          typeof result.company === 'string' ? result.company : 'Unknown';
        return `Company: ${company}\nAttribute value: ${
          typeof result.value === 'object'
            ? JSON.stringify(result.value, null, 2)
            : String(result.value)
        }`;
      } else if (result.attributes && Array.isArray(result.attributes)) {
        // Return list of attributes
        const company =
          typeof result.company === 'string' ? result.company : 'Unknown';
        return `Company: ${company}\nAvailable attributes (${
          result.attributes.length
        }):\n${result.attributes
          .map((attr: unknown) => `  - ${String(attr)}`)
          .join('\n')}`;
      } else {
        // Fallback for unexpected result structure
        return `Unexpected result format. Received: ${JSON.stringify(result)}`;
      }
    },
  } as ToolConfig,
};

// Attribute tool definitions
export const attributeToolDefinitions = [
  {
    name: 'get-company-fields',
    description: 'Get specific fields from a company by field names',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of field names to retrieve',
        },
      },
      required: ['companyId', 'fields'],
    },
  },
  {
    name: 'get-company-custom-fields',
    description: 'Get custom fields for a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
        customFieldNames: {
          type: ['string', 'array'],
          items: { type: 'string' },
          description:
            'Optional: specific custom field names to retrieve (comma-separated string or array). If omitted, returns all custom fields.',
        },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'discover-company-attributes',
    description: 'Discover all available company attributes in the workspace',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get-company-attributes',
    description:
      'Get all available attributes for a company or the value of a specific attribute',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
        attributeName: {
          type: 'string',
          description:
            'Optional name of specific attribute to retrieve (if not provided, lists all attributes)',
        },
      },
      required: ['companyId'],
    },
  },
];
