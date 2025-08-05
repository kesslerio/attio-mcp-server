/**
 * Batch operation tool configurations for companies
 */
import {
  batchCreateCompanies,
  batchDeleteCompanies,
  batchGetCompanyDetails,
  batchSearchCompanies,
  batchUpdateCompanies,
} from '../../../objects/batch-companies.js';
import type { ToolConfig } from '../../tool-types.js';

// Company batch tool configurations
export const batchToolConfigs = {
  batchCreate: {
    name: 'batch-create-companies',
    handler: batchCreateCompanies,
    formatResult: (result: any) => {
      const { results, summary } = result;
      let output = `Batch Create Summary: ${summary.succeeded}/${summary.total} succeeded\n`;

      results.forEach((item: any) => {
        if (item.success) {
          output += `✓ Created: ${
            item.data.values?.name?.[0]?.value || 'Unknown'
          } (ID: ${item.data.id?.record_id})\n`;
        } else {
          output += `✗ Failed: ${item.error?.message || 'Unknown error'}\n`;
        }
      });

      return output;
    },
  } as ToolConfig,

  batchUpdate: {
    name: 'batch-update-companies',
    handler: batchUpdateCompanies,
    formatResult: (result: any) => {
      const { results, summary } = result;
      let output = `Batch Update Summary: ${summary.succeeded}/${summary.total} succeeded\n`;

      results.forEach((item: any) => {
        if (item.success) {
          output += `✓ Updated: ${
            item.data.values?.name?.[0]?.value || 'Unknown'
          } (ID: ${item.data.id?.record_id})\n`;
        } else {
          output += `✗ Failed: ${item.error?.message || 'Unknown error'}\n`;
        }
      });

      return output;
    },
  } as ToolConfig,

  batchDelete: {
    name: 'batch-delete-companies',
    handler: batchDeleteCompanies,
    formatResult: (result: any) => {
      const { results, summary } = result;
      let output = `Batch Delete Summary: ${summary.succeeded}/${summary.total} succeeded\n`;

      results.forEach((item: any) => {
        if (item.success) {
          output += `✓ Deleted: ${item.id}\n`;
        } else {
          output += `✗ Failed: ${item.id} - ${
            item.error?.message || 'Unknown error'
          }\n`;
        }
      });

      return output;
    },
  } as ToolConfig,

  batchSearch: {
    name: 'batch-search-companies',
    handler: batchSearchCompanies,
    formatResult: (result: any) => {
      const { results, summary } = result;
      let output = `Batch Search Summary: ${summary.succeeded}/${summary.total} succeeded\n\n`;

      results.forEach((item: any, index: number) => {
        if (item.success) {
          output += `Query ${index + 1}: Found ${item.data.length} companies\n`;
          item.data.forEach((company: any) => {
            output += `  - ${
              company.values?.name?.[0]?.value || 'Unknown'
            } (ID: ${company.id?.record_id})\n`;
          });
        } else {
          output += `Query ${index + 1}: Failed - ${
            item.error?.message || 'Unknown error'
          }\n`;
        }
        output += '\n';
      });

      return output;
    },
  } as ToolConfig,

  batchGetDetails: {
    name: 'batch-get-company-details',
    handler: batchGetCompanyDetails,
    formatResult: (result: any) => {
      const { results, summary } = result;
      let output = `Batch Get Details Summary: ${summary.succeeded}/${summary.total} succeeded\n\n`;

      results.forEach((item: any) => {
        if (item.success) {
          const company = item.data;
          output += `✓ ${
            company.values?.name?.[0]?.value || 'Unknown'
          } (ID: ${company.id?.record_id})\n`;
          output += `  Website: ${
            company.values?.website?.[0]?.value || 'N/A'
          }\n`;
          output += `  Industry: ${
            company.values?.industry?.[0]?.value || 'N/A'
          }\n`;
        } else {
          output += `✗ Failed: ${item.id} - ${
            item.error?.message || 'Unknown error'
          }\n`;
        }
        output += '\n';
      });

      return output;
    },
  } as ToolConfig,
};

// Batch tool definitions
export const batchToolDefinitions = [
  {
    name: 'batch-create-companies',
    description: 'Create multiple companies in a single batch operation',
    inputSchema: {
      type: 'object',
      properties: {
        companies: {
          type: 'array',
          description: 'Array of company data to create',
          items: {
            type: 'object',
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
                description: 'Industry classification',
              },
            },
            required: ['name'],
          },
        },
        config: {
          type: 'object',
          description: 'Optional batch configuration',
          properties: {
            maxBatchSize: {
              type: 'number',
              description: 'Maximum items per batch (default: 10)',
            },
            continueOnError: {
              type: 'boolean',
              description: 'Continue processing on errors (default: true)',
            },
          },
        },
      },
      required: ['companies'],
    },
  },
  {
    name: 'batch-update-companies',
    description: 'Update multiple companies in a single batch operation',
    inputSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          description: 'Array of company updates',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Company ID to update',
              },
              attributes: {
                type: 'object',
                description: 'Attributes to update',
              },
            },
            required: ['id', 'attributes'],
          },
        },
        config: {
          type: 'object',
          description: 'Optional batch configuration',
        },
      },
      required: ['updates'],
    },
  },
  {
    name: 'batch-delete-companies',
    description: 'Delete multiple companies in a single batch operation',
    inputSchema: {
      type: 'object',
      properties: {
        companyIds: {
          type: 'array',
          description: 'Array of company IDs to delete',
          items: {
            type: 'string',
          },
        },
        config: {
          type: 'object',
          description: 'Optional batch configuration',
        },
      },
      required: ['companyIds'],
    },
  },
  {
    name: 'batch-search-companies',
    description:
      'Perform multiple company searches in a single batch operation',
    inputSchema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          description: 'Array of search queries',
          items: {
            type: 'string',
          },
        },
        config: {
          type: 'object',
          description: 'Optional batch configuration',
        },
      },
      required: ['queries'],
    },
  },
  {
    name: 'batch-get-company-details',
    description:
      'Get details for multiple companies in a single batch operation',
    inputSchema: {
      type: 'object',
      properties: {
        companyIds: {
          type: 'array',
          description: 'Array of company IDs to get details for',
          items: {
            type: 'string',
          },
        },
        config: {
          type: 'object',
          description: 'Optional batch configuration',
        },
      },
      required: ['companyIds'],
    },
  },
];
