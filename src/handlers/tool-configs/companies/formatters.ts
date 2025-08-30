/**
 * Result formatting functions for company tool configurations
 */
import { Company } from '../../../types/attio.js';
import { DetailsToolConfig } from '../../tool-types.js';

// Type-safe helper to access company values
function getCompanyValue(
  company: Company,
  field: string
): Array<{ value: unknown; [key: string]: unknown }> | undefined {
  return values?.[field];
}

// Company formatter configurations
export const formatterConfigs = {
  details: {
    name: 'get-company-details',
    handler: getCompanyDetails,
    formatResult: (company: Company) => {
        getCompanyValue(company, 'name')?.[0]?.value || 'Unnamed';
        getCompanyValue(company, 'website')?.[0]?.value || 'Not available';
        getCompanyValue(company, 'industry')?.[0]?.value || 'Not available';
        getCompanyValue(company, 'description')?.[0]?.value ||
        'No description available';

      // Extract other key details
        ? `${location.locality || ''}, ${location.region || ''} ${
            location.country_code || ''
          }`.trim()
        : 'Not available';

        getCompanyValue(company, 'employee_range')?.[0]?.option?.title ||
        'Not available';
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
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
        getCompanyValue(company as Company, 'website')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'industry')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'type')?.[0]?.option?.title ||
        'Not available';
        getCompanyValue(company as Company, 'type_persona')?.[0]?.option
          ?.title || 'Not available';
        getCompanyValue(company as Company, 'employee_range')?.[0]?.option
          ?.title || 'Not available';
        getCompanyValue(company as Company, 'foundation_date')?.[0]?.value ||
        'Not available';
        company as Company,
        'primary_location'
      )?.[0];
        ? `${location.locality || ''}, ${location.region || ''} ${
            location.country_code || ''
          }`.trim()
        : 'Not available';
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
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
        getCompanyValue(company as Company, 'website')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'company_phone_5')?.[0]
          ?.phone_number || 'Not available';
        getCompanyValue(company as Company, 'street_address')?.[0]?.value || '';
        getCompanyValue(company as Company, 'street_address_2')?.[0]?.value ||
        '';
        getCompanyValue(company as Company, 'city')?.[0]?.value || '';
        getCompanyValue(company as Company, 'state')?.[0]?.value || '';
        getCompanyValue(company as Company, 'postal_code')?.[0]?.value || '';
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
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
        getCompanyValue(company as Company, 'type')?.[0]?.option?.title ||
        'Not available';
        getCompanyValue(company as Company, 'type_persona')?.[0]?.option
          ?.title || 'Not available';
        getCompanyValue(company as Company, 'categories')?.map(
          (cat: unknown) => cat.option?.title
        ) || [];
        getCompanyValue(company as Company, 'industry')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'estimated_arr_usd')?.[0]?.option
          ?.title || 'Not available';
        getCompanyValue(company as Company, 'funding_raised_usd')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'employee_range')?.[0]?.option
          ?.title || 'Not available';
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
        getCompanyValue(company as Company, 'name')?.[0]?.value || 'Unnamed';
        getCompanyValue(company as Company, 'website')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'linkedin')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'twitter')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'facebook')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'instagram')?.[0]?.value ||
        'Not available';
        getCompanyValue(company as Company, 'angellist')?.[0]?.value ||
        'Not available';
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
