/**
 * Batch operation tool configurations for companies
 */
import {
  batchCreateCompanies,
  batchUpdateCompanies,
  batchDeleteCompanies,
  batchSearchCompanies,
  batchGetCompanyDetails,
} from '../../../objects/batch-companies.js';
import { ToolConfig } from '../../tool-types.js';

// Company batch tool configurations
export const batchToolConfigs = {
  batchCreate: {
    name: 'batch-create-companies',
    handler: batchCreateCompanies,
    formatResult: (result: Record<string, unknown>): string => {
      // Type-safe property extraction
      const results = Array.isArray(result.results) ? result.results : [];
      const summary = typeof result.summary === 'object' && result.summary !== null ? result.summary : {};
      const summarySucceeded = typeof (summary as any).succeeded === 'number' ? (summary as any).succeeded : 0;
      const summaryTotal = typeof (summary as any).total === 'number' ? (summary as any).total : 0;
      
      let output = `Batch Create Summary: ${summarySucceeded}/${summaryTotal} succeeded\n`;

      results.forEach((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.success) {
            const data = itemObj.data as any;
            const name = data?.values?.name?.[0]?.value || 'Unknown';
            const recordId = data?.id?.record_id || 'Unknown';
            output += `✓ Created: ${name} (ID: ${recordId})\n`;
          } else {
            const error = itemObj.error as any;
            const message = error?.message || 'Unknown error';
            output += `✗ Failed: ${message}\n`;
          }
        }
      });

      return output;
    },
  } as ToolConfig,

  batchUpdate: {
    name: 'batch-update-companies',
    handler: batchUpdateCompanies,
    formatResult: (result: Record<string, unknown>): string => {
      // Type-safe property extraction
      const results = Array.isArray(result.results) ? result.results : [];
      const summary = typeof result.summary === 'object' && result.summary !== null ? result.summary : {};
      const summarySucceeded = typeof (summary as any).succeeded === 'number' ? (summary as any).succeeded : 0;
      const summaryTotal = typeof (summary as any).total === 'number' ? (summary as any).total : 0;
      
      let output = `Batch Update Summary: ${summarySucceeded}/${summaryTotal} succeeded\n`;

      results.forEach((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.success) {
            const data = itemObj.data as any;
            const name = data?.values?.name?.[0]?.value || 'Unknown';
            const recordId = data?.id?.record_id || 'Unknown';
            output += `✓ Updated: ${name} (ID: ${recordId})\n`;
          } else {
            const error = itemObj.error as any;
            const message = error?.message || 'Unknown error';
            output += `✗ Failed: ${message}\n`;
          }
        }
      });

      return output;
    },
  } as ToolConfig,

  batchDelete: {
    name: 'batch-delete-companies',
    handler: batchDeleteCompanies,
    formatResult: (result: Record<string, unknown>): string => {
      // Type-safe property extraction
      const results = Array.isArray(result.results) ? result.results : [];
      const summary = typeof result.summary === 'object' && result.summary !== null ? result.summary : {};
      const summarySucceeded = typeof (summary as any).succeeded === 'number' ? (summary as any).succeeded : 0;
      const summaryTotal = typeof (summary as any).total === 'number' ? (summary as any).total : 0;
      
      let output = `Batch Delete Summary: ${summarySucceeded}/${summaryTotal} succeeded\n`;

      results.forEach((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.success) {
            output += `✓ Deleted: ${String(itemObj.id)}\n`;
          } else {
            const error = itemObj.error as any;
            const message = error?.message || 'Unknown error';
            output += `✗ Failed: ${String(itemObj.id)} - ${message}\n`;
          }
        }
      });

      return output;
    },
  } as ToolConfig,

  batchSearch: {
    name: 'batch-search-companies',
    handler: batchSearchCompanies,
    formatResult: (result: Record<string, unknown>): string => {
      // Type-safe property extraction
      const results = Array.isArray(result.results) ? result.results : [];
      const summary = typeof result.summary === 'object' && result.summary !== null ? result.summary : {};
      const summarySucceeded = typeof (summary as any).succeeded === 'number' ? (summary as any).succeeded : 0;
      const summaryTotal = typeof (summary as any).total === 'number' ? (summary as any).total : 0;
      
      let output = `Batch Search Summary: ${summarySucceeded}/${summaryTotal} succeeded\n\n`;

      results.forEach((item: unknown, index: number) => {
        if (typeof item === 'object' && item !== null) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.success) {
            const data = Array.isArray(itemObj.data) ? itemObj.data : [];
            output += `Query ${index + 1}: Found ${data.length} companies\n`;
            data.forEach((company: unknown) => {
              if (typeof company === 'object' && company !== null) {
                const companyObj = company as any;
                const name = companyObj?.values?.name?.[0]?.value || 'Unknown';
                const recordId = companyObj?.id?.record_id || 'Unknown';
                output += `  - ${name} (ID: ${recordId})\n`;
              }
            });
          } else {
            const error = itemObj.error as any;
            const message = error?.message || 'Unknown error';
            output += `Query ${index + 1}: Failed - ${message}\n`;
          }
          output += '\n';
        }
      });

      return output;
    },
  } as ToolConfig,

  batchGetDetails: {
    name: 'batch-get-company-details',
    handler: batchGetCompanyDetails,
    formatResult: (result: Record<string, unknown>): string => {
      // Type-safe property extraction
      const results = Array.isArray(result.results) ? result.results : [];
      const summary = typeof result.summary === 'object' && result.summary !== null ? result.summary : {};
      const summarySucceeded = typeof (summary as any).succeeded === 'number' ? (summary as any).succeeded : 0;
      const summaryTotal = typeof (summary as any).total === 'number' ? (summary as any).total : 0;
      
      let output = `Batch Get Details Summary: ${summarySucceeded}/${summaryTotal} succeeded\n\n`;

      results.forEach((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const itemObj = item as Record<string, unknown>;
          if (itemObj.success) {
            const company = itemObj.data as any;
            const name = company?.values?.name?.[0]?.value || 'Unknown';
            const recordId = company?.id?.record_id || 'Unknown';
            const website = company?.values?.website?.[0]?.value || 'N/A';
            const industry = company?.values?.industry?.[0]?.value || 'N/A';
            
            output += `✓ ${name} (ID: ${recordId})\n`;
            output += `  Website: ${website}\n`;
            output += `  Industry: ${industry}\n`;
          } else {
            const error = itemObj.error as any;
            const message = error?.message || 'Unknown error';
            output += `✗ Failed: ${String(itemObj.id)} - ${message}\n`;
          }
          output += '\n';
        }
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
