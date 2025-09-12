/**
 * Result formatting functions for company tool configurations
 */
import { Company } from '../../../types/attio.js';
import {
  getCompanyDetails,
  getCompanyBasicInfo,
  getCompanyContactInfo,
  getCompanyBusinessInfo,
  getCompanySocialInfo,
} from '../../../objects/companies/index.js';
import { DetailsToolConfig } from '../../tool-types.js';

// Type-safe helper to access company values
function getCompanyValue(
  company: Company,
  field: string
): Array<{ value: any; [key: string]: any }> | undefined {
  const values = company.values as any;
  return values?.[field];
}

// Company formatter configurations
export const formatterConfigs = {
  details: {
    name: 'get-company-details',
    handler: getCompanyDetails,
    formatResult: (company: Company) => {
      const companyName =
        getCompanyValue(company, 'name')?.[0]?.value || 'Unnamed';
      const companyId = company.id?.record_id || 'unknown';
      const domains = getCompanyValue(company, 'domains')?.[0]?.domain || 'Not available';
      const categories =
        getCompanyValue(company, 'categories')?.map((cat: any) => cat.option?.title).join(', ') || 'Not available';
      const description =
        getCompanyValue(company, 'description')?.[0]?.value ||
        'No description available';
      const createdAt = (company as any).created_at || 'Unknown';

      // Extract other key details
      const location = getCompanyValue(company, 'primary_location')?.[0];
      const locationStr = location
        ? `${location.locality || ''}, ${location.region || ''} ${
            location.country_code || ''
          }`.trim()
        : 'Not available';

      // Note: employee_range and foundation_date removed as they're not standard Attio fields
      // Custom fields should be handled through user.json mapping

      return `Company: ${companyName} (ID: ${companyId})
Created: ${createdAt}
Domains: ${domains}
Categories: ${categories}
Location: ${locationStr}
Description:
${description}

For full details, use get-company-json with this ID: ${companyId}`;
    },
  } as DetailsToolConfig,

  json: {
    name: 'get-company-json',
    handler: getCompanyDetails,
    formatResult: (company: Company) => {
      try {
        const cleanedCompany = JSON.parse(JSON.stringify(company)) as any;

        // Fix the typo in the response data
        if (cleanedCompany.values?.typpe) {
          cleanedCompany.values.type = cleanedCompany.values.typpe;
          delete cleanedCompany.values.typpe;
        }

        // Safely handle the services field if it exists
        if (cleanedCompany.values?.services !== undefined) {
          // Ensure services is an array
          if (!Array.isArray(cleanedCompany.values.services)) {
            cleanedCompany.values.services = cleanedCompany.values.services
              ? [cleanedCompany.values.services]
              : [];
          }
        }

        // Instead of returning the entire JSON at once, create a summary
        const summary = {
          id: cleanedCompany.id,
          created_at: cleanedCompany.created_at,
          web_url: cleanedCompany.web_url,
          basic_values: {
            name: cleanedCompany.values?.name?.[0]?.value,
            domains: cleanedCompany.values?.domains?.[0]?.domain,
            description: cleanedCompany.values?.description?.[0]?.value,
            categories: cleanedCompany.values?.categories?.map((cat: any) => cat.option?.title),
            primary_location: cleanedCompany.values?.primary_location?.[0],
          },
          attribute_count: Object.keys(cleanedCompany.values || {}).length,
          message:
            'Full JSON data is too large for display. Use get-company-attributes to access specific fields.',
        };

        return JSON.stringify(summary, null, 2);
      } catch (error: unknown) {
        // If any error occurs during JSON processing, return a safe error message
        return JSON.stringify(
          {
            error: 'Failed to process company data',
            message: error instanceof Error ? error.message : 'Unknown error',
            companyId: company.id?.record_id || 'unknown',
          },
          null,
          2
        );
      }
    },
  } as DetailsToolConfig,

  basicInfo: {
    name: 'get-company-basic-info',
    handler: getCompanyBasicInfo,
    formatResult: (company: Partial<Company>) => {
      const name =
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
      const domains = getCompanyValue(company as Company, 'domains')?.[0]?.domain || 'Not available';
      const categories =
        getCompanyValue(company as Company, 'categories')?.map((cat: any) => cat.option?.title).join(', ') ||
        'Not available';
      const location = getCompanyValue(
        company as Company,
        'primary_location'
      )?.[0];
      const locationStr = location
        ? `${location.locality || ''}, ${location.region || ''} ${
            location.country_code || ''
          }`.trim()
        : 'Not available';
      const description =
        getCompanyValue(company as Company, 'description')?.[0]?.value ||
        'No description available';

      return `Company: ${name}
Domains: ${domains}
Categories: ${categories}
Location: ${locationStr}

Description:
${description}`;
    },
  } as DetailsToolConfig,

  contactInfo: {
    name: 'get-company-contact-info',
    handler: getCompanyContactInfo,
    formatResult: (company: Partial<Company>) => {
      const name =
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
      const domains = getCompanyValue(company as Company, 'domains')?.[0]?.domain || 'Not available';
      const location = getCompanyValue(company as Company, 'primary_location')?.[0];
      const locationStr = location
        ? `${location.locality || ''}, ${location.region || ''} ${location.country_code || ''}`.trim()
        : 'Not available';
      const team = getCompanyValue(company as Company, 'team') || [];

      return `Company: ${name}
Domains: ${domains}
Location: ${locationStr}

Team Members: ${team.length} people`;
    },
  } as DetailsToolConfig,

  businessInfo: {
    name: 'get-company-business-info',
    handler: getCompanyBusinessInfo,
    formatResult: (company: Partial<Company>) => {
      const name =
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
      // Note: Removed non-standard fields (type, services, industry, estimated_arr_usd, 
      // funding_raised_usd, employee_range, foundation_date) as they don't exist in default Attio API
      // Custom fields should be handled through user.json mapping
      const categories =
        getCompanyValue(company as Company, 'categories')?.map(
          (cat: any) => cat.option?.title
        ) || [];

      return `Company: ${name}

Categories:
${categories.join(', ') || 'None'}

Note: Additional fields like industry, type, employees, revenue, etc. are custom fields 
that should be configured through user.json mapping for your specific workspace.`;
    },
  } as DetailsToolConfig,

  socialInfo: {
    name: 'get-company-social-info',
    handler: getCompanySocialInfo,
    formatResult: (company: Partial<Company>) => {
      const name =
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
      const domains = getCompanyValue(company as Company, 'domains')?.[0]?.domain || 'Not available';
      const linkedin =
        getCompanyValue(company as Company, 'linkedin')?.[0]?.value ||
        'Not available';
      const twitter =
        getCompanyValue(company as Company, 'twitter')?.[0]?.value ||
        'Not available';
      const facebook =
        getCompanyValue(company as Company, 'facebook')?.[0]?.value ||
        'Not available';
      const instagram =
        getCompanyValue(company as Company, 'instagram')?.[0]?.value ||
        'Not available';
      const angellist =
        getCompanyValue(company as Company, 'angellist')?.[0]?.value ||
        'Not available';
      // Note: twitter_follower_count removed as it's not a standard Attio field

      return `Company: ${name}
Domains: ${domains}

Social Media:
LinkedIn: ${linkedin}
Twitter: ${twitter}
Facebook: ${facebook}
Instagram: ${instagram}
AngelList: ${angellist}

Note: Additional metrics like follower counts are custom fields 
that should be configured through user.json mapping for your workspace.`;
    },
  } as DetailsToolConfig,
};

// Formatter tool definitions (for the specialized info tools)
export const formatterToolDefinitions = [
  {
    name: 'get-company-details',
    description: 'Get details of a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description:
            'ID of the company to get details for (provide either this or uri)',
        },
        uri: {
          type: 'string',
          description:
            "URI of the company in the format 'attio://companies/{id}' (provide either this or companyId)",
        },
      },
    },
  },
  {
    name: 'get-company-json',
    description: 'Get raw JSON representation of a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company to get JSON for',
        },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'get-company-basic-info',
    description: 'Get basic information about a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'get-company-contact-info',
    description: 'Get contact information for a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'get-company-business-info',
    description: 'Get business information about a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'get-company-social-info',
    description: 'Get social media information for a company',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: {
          type: 'string',
          description: 'ID of the company',
        },
      },
      required: ['companyId'],
    },
  },
];
