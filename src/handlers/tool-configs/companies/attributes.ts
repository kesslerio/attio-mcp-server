/**
 * Attribute management tool configurations for companies
 */
import { Company } from "../../../types/attio.js";
import { 
  getCompanyFields,
  getCompanyCustomFields,
  discoverCompanyAttributes,
  getCompanyAttributes
} from "../../../objects/companies.js";
import { ToolConfig } from "../../tool-types.js";

// Company attribute tool configurations
export const attributeToolConfigs = {
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
  } as ToolConfig,
  
  getAttributes: {
    name: "get-company-attributes",
    handler: getCompanyAttributes,
    formatResult: (result: any) => {
      if (result.value !== undefined) {
        // Return specific attribute value
        return `Company: ${result.company}\nAttribute value: ${typeof result.value === 'object' ? JSON.stringify(result.value, null, 2) : result.value}`;
      } else {
        // Return list of attributes
        return `Company: ${result.company}\nAvailable attributes (${result.attributes.length}):\n${result.attributes.map((attr: string) => `  - ${attr}`).join('\n')}`;
      }
    }
  } as ToolConfig
};

// Attribute tool definitions
export const attributeToolDefinitions = [
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
  },
  {
    name: "get-company-attributes",
    description: "Get all available attributes for a company or the value of a specific attribute",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
        },
        attributeName: {
          type: "string",
          description: "Optional name of specific attribute to retrieve (if not provided, lists all attributes)"
        }
      },
      required: ["companyId"]
    }
  }
];