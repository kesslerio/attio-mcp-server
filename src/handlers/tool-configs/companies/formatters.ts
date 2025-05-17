/**
 * Result formatting functions for company tool configurations
 */
import { Company } from "../../../types/attio.js";
import { 
  getCompanyDetails,
  getCompanyBasicInfo,
  getCompanyContactInfo,
  getCompanyBusinessInfo,
  getCompanySocialInfo
} from "../../../objects/companies.js";
import { 
  DetailsToolConfig,
  ToolConfig
} from "../../tool-types.js";

// Company formatter configurations
export const formatterConfigs = {
  details: {
    name: "get-company-details",
    handler: getCompanyDetails,
    formatResult: (company: Company) => {
      const companyName = company.values?.name?.[0]?.value || 'Unnamed';
      const companyId = company.id?.record_id || 'unknown';
      const website = company.values?.website?.[0]?.value || 'Not available';
      const industry = company.values?.industry?.[0]?.value || 'Not available';
      const description = company.values?.description?.[0]?.value || 'No description available';
      const createdAt = company.created_at || 'Unknown';
      
      // Extract other key details
      const location = company.values?.primary_location?.[0];
      const locationStr = location ? 
        `${location.locality || ''}, ${location.region || ''} ${location.country_code || ''}`.trim() : 
        'Not available';
      
      const employeeRange = company.values?.employee_range?.[0]?.option?.title || 'Not available';
      const foundationDate = company.values?.foundation_date?.[0]?.value || 'Not available';
      
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
    }
  } as DetailsToolConfig,
  
  json: {
    name: "get-company-json",
    handler: getCompanyDetails,
    formatResult: (company: Company) => {
      try {
        const cleanedCompany = JSON.parse(JSON.stringify(company));
        
        // Fix the typo in the response data
        if (cleanedCompany.values?.typpe) {
          cleanedCompany.values.type = cleanedCompany.values.typpe;
          delete cleanedCompany.values.typpe;
        }
        
        // Safely handle the services field if it exists
        if (cleanedCompany.values?.services !== undefined) {
          // Ensure services is an array
          if (!Array.isArray(cleanedCompany.values.services)) {
            cleanedCompany.values.services = cleanedCompany.values.services ? [cleanedCompany.values.services] : [];
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
            type_persona: cleanedCompany.values?.type_persona?.[0]?.option?.title,
            services: cleanedCompany.values?.services || [],
            employee_range: cleanedCompany.values?.employee_range?.[0]?.option?.title,
            foundation_date: cleanedCompany.values?.foundation_date?.[0]?.value
          },
          attribute_count: Object.keys(cleanedCompany.values || {}).length,
          message: "Full JSON data is too large for display. Use get-company-attributes to access specific fields."
        };
        
        return JSON.stringify(summary, null, 2);
      } catch (error) {
        // If any error occurs during JSON processing, return a safe error message
        return JSON.stringify({
          error: "Failed to process company data",
          message: error instanceof Error ? error.message : "Unknown error",
          companyId: company.id?.record_id || 'unknown'
        }, null, 2);
      }
    }
  } as DetailsToolConfig,
  
  basicInfo: {
    name: "get-company-basic-info",
    handler: getCompanyBasicInfo,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unnamed';
      const website = company.values?.website?.[0]?.value || 'Not available';
      const industry = company.values?.industry?.[0]?.value || 'Not available';
      const type = company.values?.type?.[0]?.option?.title || 'Not available';
      const typePersona = company.values?.type_persona?.[0]?.option?.title || 'Not available';
      const employees = company.values?.employee_range?.[0]?.option?.title || 'Not available';
      const founded = company.values?.foundation_date?.[0]?.value || 'Not available';
      const location = company.values?.primary_location?.[0];
      const locationStr = location ? 
        `${location.locality || ''}, ${location.region || ''} ${location.country_code || ''}`.trim() : 
        'Not available';
      const description = company.values?.description?.[0]?.value || 'No description available';
      
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
    }
  } as DetailsToolConfig,
  
  contactInfo: {
    name: "get-company-contact-info",
    handler: getCompanyContactInfo,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unnamed';
      const website = company.values?.website?.[0]?.value || 'Not available';
      const phone = company.values?.company_phone_5?.[0]?.phone_number || 'Not available';
      const location = company.values?.primary_location?.[0];
      const streetAddress = company.values?.street_address?.[0]?.value || '';
      const streetAddress2 = company.values?.street_address_2?.[0]?.value || '';
      const city = company.values?.city?.[0]?.value || '';
      const state = company.values?.state?.[0]?.value || '';
      const postalCode = company.values?.postal_code?.[0]?.value || '';
      const country = company.values?.country?.[0]?.value || '';
      
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
    }
  } as DetailsToolConfig,
  
  businessInfo: {
    name: "get-company-business-info",
    handler: getCompanyBusinessInfo,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unnamed';
      const type = company.values?.type?.[0]?.option?.title || 'Not available';
      const typePersona = company.values?.type_persona?.[0]?.option?.title || 'Not available';
      const services = company.values?.services || [];
      const categories = company.values?.categories?.map((cat: any) => cat.option?.title) || [];
      const industry = company.values?.industry?.[0]?.value || 'Not available';
      const revenue = company.values?.estimated_arr_usd?.[0]?.option?.title || 'Not available';
      const funding = company.values?.funding_raised_usd?.[0]?.value || 'Not available';
      const employees = company.values?.employee_range?.[0]?.option?.title || 'Not available';
      const founded = company.values?.foundation_date?.[0]?.value || 'Not available';
      
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
    }
  } as DetailsToolConfig,
  
  socialInfo: {
    name: "get-company-social-info",
    handler: getCompanySocialInfo,
    formatResult: (company: Partial<Company>) => {
      const name = company.values?.name?.[0]?.value || 'Unnamed';
      const website = company.values?.website?.[0]?.value || 'Not available';
      const linkedin = company.values?.linkedin?.[0]?.value || 'Not available';
      const twitter = company.values?.twitter?.[0]?.value || 'Not available';
      const facebook = company.values?.facebook?.[0]?.value || 'Not available';
      const instagram = company.values?.instagram?.[0]?.value || 'Not available';
      const angellist = company.values?.angellist?.[0]?.value || 'Not available';
      const twitterFollowers = company.values?.twitter_follower_count?.[0]?.value || 'Not available';
      
      return `Company: ${name}
Website: ${website}

Social Media:
LinkedIn: ${linkedin}
Twitter: ${twitter}
Facebook: ${facebook}
Instagram: ${instagram}
AngelList: ${angellist}

Twitter Followers: ${twitterFollowers}`;
    }
  } as DetailsToolConfig
};

// Formatter tool definitions (for the specialized info tools)
export const formatterToolDefinitions = [
  {
    name: "get-company-details",
    description: "Get details of a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to get details for"
        },
        uri: {
          type: "string",
          description: "URI of the company in the format 'attio://companies/{id}'"
        }
      },
      oneOf: [
        { required: ["companyId"] },
        { required: ["uri"] }
      ]
    }
  },
  {
    name: "get-company-json",
    description: "Get raw JSON representation of a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company to get JSON for"
        }
      },
      required: ["companyId"]
    }
  },
  {
    name: "get-company-basic-info",
    description: "Get basic information about a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
        }
      },
      required: ["companyId"]
    }
  },
  {
    name: "get-company-contact-info",
    description: "Get contact information for a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
        }
      },
      required: ["companyId"]
    }
  },
  {
    name: "get-company-business-info",
    description: "Get business information about a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
        }
      },
      required: ["companyId"]
    }
  },
  {
    name: "get-company-social-info",
    description: "Get social media information for a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "ID of the company"
        }
      },
      required: ["companyId"]
    }
  }
];