/**
 * Result formatting functions for company tool configurations
 */

import {
  getCompanyBasicInfo,
  getCompanyBusinessInfo,
  getCompanyContactInfo,
  getCompanyDetails,
  getCompanySocialInfo,
} from '../../../objects/companies/index.js';
import type { Company } from '../../../types/attio.js';
import type { DetailsToolConfig } from '../../tool-types.js';

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
      const website =
        getCompanyValue(company, 'website')?.[0]?.value || 'Not available';
      const industry =
        getCompanyValue(company, 'industry')?.[0]?.value || 'Not available';
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

      const employeeRange =
        getCompanyValue(company, 'employee_range')?.[0]?.option?.title ||
        'Not available';
      const foundationDate =
        getCompanyValue(company, 'foundation_date')?.[0]?.value ||
        'Not available';

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
            website: cleanedCompany.values?.website?.[0]?.value,
            type: cleanedCompany.values?.type?.[0]?.option?.title,
            type_persona:
              cleanedCompany.values?.type_persona?.[0]?.option?.title,
            services: cleanedCompany.values?.services || [],
            employee_range:
              cleanedCompany.values?.employee_range?.[0]?.option?.title,
            foundation_date: cleanedCompany.values?.foundation_date?.[0]?.value,
          },
          attribute_count: Object.keys(cleanedCompany.values || {}).length,
          message:
            'Full JSON data is too large for display. Use get-company-attributes to access specific fields.',
        };

        return JSON.stringify(summary, null, 2);
      } catch (error) {
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
      const website =
        getCompanyValue(company as Company, 'website')?.[0]?.value ||
        'Not available';
      const industry =
        getCompanyValue(company as Company, 'industry')?.[0]?.value ||
        'Not available';
      const type =
        getCompanyValue(company as Company, 'type')?.[0]?.option?.title ||
        'Not available';
      const typePersona =
        getCompanyValue(company as Company, 'type_persona')?.[0]?.option
          ?.title || 'Not available';
      const employees =
        getCompanyValue(company as Company, 'employee_range')?.[0]?.option
          ?.title || 'Not available';
      const founded =
        getCompanyValue(company as Company, 'foundation_date')?.[0]?.value ||
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
Website: ${website}
Industry: ${industry}
Type: ${type}
Type Persona: ${typePersona}
Location: ${locationStr}
Employees: ${employees}
Founded: ${founded}

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
      const website =
        getCompanyValue(company as Company, 'website')?.[0]?.value ||
        'Not available';
      const phone =
        getCompanyValue(company as Company, 'company_phone_5')?.[0]
          ?.phone_number || 'Not available';
      const _location = getCompanyValue(
        company as Company,
        'primary_location'
      )?.[0];
      const streetAddress =
        getCompanyValue(company as Company, 'street_address')?.[0]?.value || '';
      const streetAddress2 =
        getCompanyValue(company as Company, 'street_address_2')?.[0]?.value ||
        '';
      const city =
        getCompanyValue(company as Company, 'city')?.[0]?.value || '';
      const state =
        getCompanyValue(company as Company, 'state')?.[0]?.value || '';
      const postalCode =
        getCompanyValue(company as Company, 'postal_code')?.[0]?.value || '';
      const country =
        getCompanyValue(company as Company, 'country')?.[0]?.value || '';

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
    },
  } as DetailsToolConfig,

  businessInfo: {
    name: 'get-company-business-info',
    handler: getCompanyBusinessInfo,
    formatResult: (company: Partial<Company>) => {
      const name =
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
      const type =
        getCompanyValue(company as Company, 'type')?.[0]?.option?.title ||
        'Not available';
      const typePersona =
        getCompanyValue(company as Company, 'type_persona')?.[0]?.option
          ?.title || 'Not available';
      const services = getCompanyValue(company as Company, 'services') || [];
      const categories =
        getCompanyValue(company as Company, 'categories')?.map(
          (cat: any) => cat.option?.title
        ) || [];
      const industry =
        getCompanyValue(company as Company, 'industry')?.[0]?.value ||
        'Not available';
      const revenue =
        getCompanyValue(company as Company, 'estimated_arr_usd')?.[0]?.option
          ?.title || 'Not available';
      const funding =
        getCompanyValue(company as Company, 'funding_raised_usd')?.[0]?.value ||
        'Not available';
      const employees =
        getCompanyValue(company as Company, 'employee_range')?.[0]?.option
          ?.title || 'Not available';
      const founded =
        getCompanyValue(company as Company, 'foundation_date')?.[0]?.value ||
        'Not available';

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
    },
  } as DetailsToolConfig,

  socialInfo: {
    name: 'get-company-social-info',
    handler: getCompanySocialInfo,
    formatResult: (company: Partial<Company>) => {
      const name =
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
      const website =
        getCompanyValue(company as Company, 'website')?.[0]?.value ||
        'Not available';
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
      const twitterFollowers =
        getCompanyValue(company as Company, 'twitter_follower_count')?.[0]
          ?.value || 'Not available';

      return `Company: ${name}
Website: ${website}

Social Media:
LinkedIn: ${linkedin}
Twitter: ${twitter}
Facebook: ${facebook}
Instagram: ${instagram}
AngelList: ${angellist}

Twitter Followers: ${twitterFollowers}`;
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
