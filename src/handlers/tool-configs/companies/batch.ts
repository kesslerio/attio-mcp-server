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
import {
  BatchResponse,
  BatchItemResult,
  extractBatchSummary,
  extractBatchResults,
} from '../../../types/batch-types.js';
import { AttioRecord } from '../../../types/attio.js';

// Company batch tool configurations
export const batchToolConfigs = {
  batchCreate: {
    name: 'batch-create-companies',
    handler: batchCreateCompanies,
    formatResult: (result: BatchResponse<AttioRecord>): string => {
      const summary = extractBatchSummary(result);
      const results = extractBatchResults<AttioRecord>(result);

      let output = `Batch Create Summary: ${summary.succeeded}/${summary.total} succeeded\n`;

      results.forEach((item: BatchItemResult<AttioRecord>) => {
        if (item.success && item.data) {
          const data = item.data as AttioRecord;
          const name = (data?.values?.name as any)?.[0]?.value || 'Unknown';
          const recordId = data?.id?.record_id || 'Unknown';
          output += `✓ Created: ${name} (ID: ${recordId})\n`;
        } else if (item.error) {
          const message = item.error.message || 'Unknown error';
          output += `✗ Failed: ${message}\n`;
        }
      });

      return output;
    },
  } as ToolConfig,

  batchUpdate: {
    name: 'batch-update-companies',
    handler: batchUpdateCompanies,
    formatResult: (result: BatchResponse<AttioRecord>): string => {
      const summary = extractBatchSummary(result);
      const results = extractBatchResults<AttioRecord>(result);

      let output = `Batch Update Summary: ${summary.succeeded}/${summary.total} succeeded\n`;

      results.forEach((item: BatchItemResult<AttioRecord>) => {
        if (item.success && item.data) {
          const data = item.data as AttioRecord;
          const name = (data?.values?.name as any)?.[0]?.value || 'Unknown';
          const recordId = data?.id?.record_id || 'Unknown';
          output += `✓ Updated: ${name} (ID: ${recordId})\n`;
        } else if (item.error) {
          const message = item.error.message || 'Unknown error';
          output += `✗ Failed: ${message}\n`;
        }
      });

      return output;
    },
  } as ToolConfig,

  batchDelete: {
    name: 'batch-delete-companies',
    handler: batchDeleteCompanies,
    formatResult: (result: BatchResponse<AttioRecord>): string => {
      const summary = extractBatchSummary(result);
      const results = extractBatchResults<AttioRecord>(result);

      let output = `Batch Delete Summary: ${summary.succeeded}/${summary.total} succeeded\n`;

      results.forEach((item: BatchItemResult<AttioRecord>) => {
        const itemId = item.id;
        if (item.success) {
          output += `✓ Deleted: ${String(itemId)}\n`;
        } else if (item.error) {
          const message = item.error.message || 'Unknown error';
          output += `✗ Failed: ${String(itemId)} - ${message}\n`;
        }
      });

      return output;
    },
  } as ToolConfig,

  batchSearch: {
    name: 'batch-search-companies',
    handler: batchSearchCompanies,
    formatResult: (result: BatchResponse<AttioRecord[]>): string => {
      const summary = extractBatchSummary(result);
      const results = extractBatchResults<AttioRecord[]>(result);

      let output = `Batch Search Summary: ${summary.succeeded}/${summary.total} succeeded\n\n`;

      results.forEach((item: BatchItemResult<AttioRecord[]>, index: number) => {
        if (item.success && item.data) {
          const data = Array.isArray(item.data) ? item.data : [];
          output += `Query ${index + 1}: Found ${data.length} companies\n`;
          data.forEach((company: AttioRecord) => {
            const name = (company?.values?.name as any)?.[0]?.value || 'Unknown';
            const recordId = company?.id?.record_id || 'Unknown';
            output += `  - ${name} (ID: ${recordId})\n`;
          });
        } else if (item.error) {
          const message = item.error.message || 'Unknown error';
          output += `Query ${index + 1}: Failed - ${message}\n`;
        }
        output += '\n';
      });

      return output;
    },
  } as ToolConfig,

  batchGetDetails: {
    name: 'batch-get-company-details',
    handler: batchGetCompanyDetails,
    formatResult: (result: BatchResponse<AttioRecord>): string => {
      const summary = extractBatchSummary(result);
      const results = extractBatchResults<AttioRecord>(result);

      let output = `Batch Get Details Summary: ${summary.succeeded}/${summary.total} succeeded\n\n`;

      results.forEach((item: BatchItemResult<AttioRecord>) => {
        if (item.success && item.data) {
          const company = item.data as AttioRecord;
          const name = (company?.values?.name as any)?.[0]?.value || 'Unknown';
          const recordId = company?.id?.record_id || 'Unknown';
          const website = (company?.values?.website as any)?.[0]?.value || 'N/A';
          const industry = (company?.values?.industry as any)?.[0]?.value || 'N/A';

          output += `✓ ${name} (ID: ${recordId})\n`;
          output += `  Website: ${website}\n`;
          output += `  Industry: ${industry}\n`;
        } else if (item.error) {
          const itemId = item.id;
          const message = item.error.message || 'Unknown error';
          output += `✗ Failed: ${String(itemId)} - ${message}\n`;
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
