import { searchCompanies, getCompanyDetails, getCompanyBasicInfo, getCompanyContactInfo, getCompanyBusinessInfo, getCompanySocialInfo, getCompanyFields, getCompanyCustomFields, discoverCompanyAttributes, getCompanyAttributes, getCompanyNotes, createCompanyNote, advancedSearchCompanies, searchCompaniesByPeople, searchCompaniesByPeopleList, searchCompaniesByNotes, createCompany, updateCompany, updateCompanyAttribute, deleteCompany } from "../../objects/companies.js";
import { batchCreateCompanies, batchUpdateCompanies, batchDeleteCompanies, batchSearchCompanies, batchGetCompanyDetails } from "../../objects/batch-companies.js";
// Company tool configurations
export const companyToolConfigs = {
    search: {
        name: "search-companies",
        handler: searchCompanies,
        formatResult: (results) => {
            return `Found ${results.length} companies:\n${results.map((company) => `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
        }
    },
    // Relationship-based search tools
    searchByPeople: {
        name: "search-companies-by-people",
        handler: searchCompaniesByPeople,
        formatResult: (results) => {
            return `Found ${results.length} companies matching the people filter:\n${results.map((company) => `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
        }
    },
    searchByPeopleList: {
        name: "search-companies-by-people-list",
        handler: searchCompaniesByPeopleList,
        formatResult: (results) => {
            return `Found ${results.length} companies that have employees in the specified list:\n${results.map((company) => `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
        }
    },
    searchByNotes: {
        name: "search-companies-by-notes",
        handler: searchCompaniesByNotes,
        formatResult: (results) => {
            return `Found ${results.length} companies with matching notes:\n${results.map((company) => `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
        }
    },
    advancedSearch: {
        name: "advanced-search-companies",
        handler: advancedSearchCompanies,
        formatResult: (results) => {
            return `Found ${results.length} companies with specified filters:\n${results.map((company) => `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
        }
    },
    details: {
        name: "get-company-details",
        handler: getCompanyDetails,
        formatResult: (company) => {
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
    },
    notes: {
        name: "get-company-notes",
        handler: getCompanyNotes,
    },
    createNote: {
        name: "create-company-note",
        handler: createCompanyNote,
        idParam: "companyId"
    },
    create: {
        name: "create-company",
        handler: createCompany,
        formatResult: (result) => `Company created: ${result.values?.name?.[0]?.value || 'Unnamed'} (ID: ${result.id?.record_id || 'unknown'})`
    },
    update: {
        name: "update-company",
        handler: updateCompany,
        formatResult: (result) => `Company updated: ${result.values?.name?.[0]?.value || 'Unnamed'} (ID: ${result.id?.record_id || 'unknown'})`
    },
    updateAttribute: {
        name: "update-company-attribute",
        handler: updateCompanyAttribute,
        formatResult: (result) => `Company attribute updated for: ${result.values?.name?.[0]?.value || 'Unnamed'} (ID: ${result.id?.record_id || 'unknown'})`
    },
    delete: {
        name: "delete-company",
        handler: deleteCompany,
        formatResult: (result) => result ? "Company deleted successfully" : "Failed to delete company"
    },
    json: {
        name: "get-company-json",
        handler: getCompanyDetails,
        formatResult: (company) => {
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
            }
            catch (error) {
                // If any error occurs during JSON processing, return a safe error message
                return JSON.stringify({
                    error: "Failed to process company data",
                    message: error instanceof Error ? error.message : "Unknown error",
                    companyId: company.id?.record_id || 'unknown'
                }, null, 2);
            }
        }
    },
    // New specialized company info tools
    basicInfo: {
        name: "get-company-basic-info",
        handler: getCompanyBasicInfo,
        formatResult: (company) => {
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
    },
    contactInfo: {
        name: "get-company-contact-info",
        handler: getCompanyContactInfo,
        formatResult: (company) => {
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
            if (streetAddress2)
                address += `, ${streetAddress2}`;
            if (city)
                address += `, ${city}`;
            if (state)
                address += `, ${state}`;
            if (postalCode)
                address += ` ${postalCode}`;
            if (country)
                address += `, ${country}`;
            return `Company: ${name}
Website: ${website}
Phone: ${phone}

Address:
${address || 'Not available'}`;
        }
    },
    businessInfo: {
        name: "get-company-business-info",
        handler: getCompanyBusinessInfo,
        formatResult: (company) => {
            const name = company.values?.name?.[0]?.value || 'Unnamed';
            const type = company.values?.type?.[0]?.option?.title || 'Not available';
            const typePersona = company.values?.type_persona?.[0]?.option?.title || 'Not available';
            const services = company.values?.services || [];
            const categories = company.values?.categories?.map((cat) => cat.option?.title) || [];
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
    },
    socialInfo: {
        name: "get-company-social-info",
        handler: getCompanySocialInfo,
        formatResult: (company) => {
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
    },
    fields: {
        name: "get-company-fields",
        handler: getCompanyFields,
        formatResult: (company) => {
            const name = company.values?.name?.[0]?.value || 'Unknown';
            const id = company.id?.record_id || 'Unknown';
            const fieldCount = Object.keys(company.values || {}).length;
            const fields = Object.keys(company.values || {});
            // Create a simplified version of the values for display
            const simplifiedValues = {};
            for (const [key, value] of Object.entries(company.values || {})) {
                if (Array.isArray(value) && value.length > 0) {
                    // Extract just the actual value from the array structure
                    const firstItem = value[0];
                    if (firstItem && firstItem.value !== undefined) {
                        simplifiedValues[key] = firstItem.value;
                    }
                    else if (firstItem && firstItem.target_record_id) {
                        // Handle reference fields
                        simplifiedValues[key] = `Reference: ${firstItem.target_record_id}`;
                    }
                    else {
                        simplifiedValues[key] = firstItem;
                    }
                }
                else {
                    simplifiedValues[key] = value;
                }
            }
            return `Company: ${name} (ID: ${id})
Fields retrieved: ${fieldCount} (${fields.join(', ')})

${JSON.stringify(simplifiedValues, null, 2)}`;
        }
    },
    customFields: {
        name: "get-company-custom-fields",
        handler: async (companyId, customFieldNames) => {
            // Support both array of field names and comma-separated string
            let fields;
            if (customFieldNames) {
                if (typeof customFieldNames === 'string') {
                    fields = customFieldNames.split(',').map((f) => f.trim());
                }
                else if (Array.isArray(customFieldNames)) {
                    fields = customFieldNames;
                }
            }
            return await getCompanyCustomFields(companyId, fields);
        },
        formatResult: (company) => {
            const name = company.values?.name?.[0]?.value || 'Unknown';
            const id = company.id?.record_id || 'Unknown';
            const customFields = { ...company.values };
            delete customFields.name;
            const fieldCount = Object.keys(customFields).length;
            return `Company: ${name} (ID: ${id})
Custom fields: ${fieldCount}

${fieldCount > 0 ? JSON.stringify(customFields, null, 2) : 'No custom fields found'}`;
        }
    },
    discoverAttributes: {
        name: "discover-company-attributes",
        handler: discoverCompanyAttributes,
        formatResult: (result) => {
            let output = `Company Attributes Discovery\n`;
            output += `Total attributes: ${result.all.length}\n`;
            output += `Standard fields: ${result.standard.length}\n`;
            output += `Custom fields: ${result.custom.length}\n\n`;
            output += `STANDARD FIELDS:\n`;
            result.standard.forEach((field) => {
                output += `  - ${field}\n`;
            });
            output += `\nCUSTOM FIELDS:\n`;
            result.custom.forEach((field) => {
                const fieldInfo = result.all.find((f) => f.name === field);
                output += `  - ${field} (${fieldInfo?.type || 'unknown'})\n`;
            });
            return output;
        }
    },
    getAttributes: {
        name: "get-company-attributes",
        handler: getCompanyAttributes,
        formatResult: (result) => {
            if (result.value !== undefined) {
                // Return specific attribute value
                return `Company: ${result.company}\nAttribute value: ${typeof result.value === 'object' ? JSON.stringify(result.value, null, 2) : result.value}`;
            }
            else {
                // Return list of attributes
                return `Company: ${result.company}\nAvailable attributes (${result.attributes.length}):\n${result.attributes.map((attr) => `  - ${attr}`).join('\n')}`;
            }
        }
    },
    // Batch operations
    batchCreate: {
        name: "batch-create-companies",
        handler: batchCreateCompanies,
        formatResult: (result) => {
            const { results, summary } = result;
            let output = `Batch Create Summary: ${summary.succeeded}/${summary.total} succeeded\n`;
            results.forEach((item) => {
                if (item.success) {
                    output += `✓ Created: ${item.data.values?.name?.[0]?.value || 'Unknown'} (ID: ${item.data.id?.record_id})\n`;
                }
                else {
                    output += `✗ Failed: ${item.error?.message || 'Unknown error'}\n`;
                }
            });
            return output;
        }
    },
    batchUpdate: {
        name: "batch-update-companies",
        handler: batchUpdateCompanies,
        formatResult: (result) => {
            const { results, summary } = result;
            let output = `Batch Update Summary: ${summary.succeeded}/${summary.total} succeeded\n`;
            results.forEach((item) => {
                if (item.success) {
                    output += `✓ Updated: ${item.data.values?.name?.[0]?.value || 'Unknown'} (ID: ${item.data.id?.record_id})\n`;
                }
                else {
                    output += `✗ Failed: ${item.error?.message || 'Unknown error'}\n`;
                }
            });
            return output;
        }
    },
    batchDelete: {
        name: "batch-delete-companies",
        handler: batchDeleteCompanies,
        formatResult: (result) => {
            const { results, summary } = result;
            let output = `Batch Delete Summary: ${summary.succeeded}/${summary.total} succeeded\n`;
            results.forEach((item) => {
                if (item.success) {
                    output += `✓ Deleted: ${item.id}\n`;
                }
                else {
                    output += `✗ Failed: ${item.id} - ${item.error?.message || 'Unknown error'}\n`;
                }
            });
            return output;
        }
    },
    batchSearch: {
        name: "batch-search-companies",
        handler: batchSearchCompanies,
        formatResult: (result) => {
            const { results, summary } = result;
            let output = `Batch Search Summary: ${summary.succeeded}/${summary.total} succeeded\n\n`;
            results.forEach((item, index) => {
                if (item.success) {
                    output += `Query ${index + 1}: Found ${item.data.length} companies\n`;
                    item.data.forEach((company) => {
                        output += `  - ${company.values?.name?.[0]?.value || 'Unknown'} (ID: ${company.id?.record_id})\n`;
                    });
                }
                else {
                    output += `Query ${index + 1}: Failed - ${item.error?.message || 'Unknown error'}\n`;
                }
                output += '\n';
            });
            return output;
        }
    },
    batchGetDetails: {
        name: "batch-get-company-details",
        handler: batchGetCompanyDetails,
        formatResult: (result) => {
            const { results, summary } = result;
            let output = `Batch Get Details Summary: ${summary.succeeded}/${summary.total} succeeded\n\n`;
            results.forEach((item) => {
                if (item.success) {
                    const company = item.data;
                    output += `✓ ${company.values?.name?.[0]?.value || 'Unknown'} (ID: ${company.id?.record_id})\n`;
                    output += `  Website: ${company.values?.website?.[0]?.value || 'N/A'}\n`;
                    output += `  Industry: ${company.values?.industry?.[0]?.value || 'N/A'}\n`;
                }
                else {
                    output += `✗ Failed: ${item.id} - ${item.error?.message || 'Unknown error'}\n`;
                }
                output += '\n';
            });
            return output;
        }
    }
};
// Company tool definitions
export const companyToolDefinitions = [
    {
        name: "search-companies",
        description: "Search for companies in Attio",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query for companies"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "advanced-search-companies",
        description: "Search for companies using advanced filtering capabilities",
        inputSchema: {
            type: "object",
            properties: {
                filters: {
                    type: "object",
                    description: "Complex filter object for advanced searching",
                    properties: {
                        filters: {
                            type: "array",
                            description: "Array of filter conditions",
                            items: {
                                type: "object",
                                properties: {
                                    attribute: {
                                        type: "object",
                                        properties: {
                                            slug: {
                                                type: "string",
                                                description: "Attribute to filter on (e.g., 'name', 'website', 'industry')"
                                            }
                                        },
                                        required: ["slug"]
                                    },
                                    condition: {
                                        type: "string",
                                        description: "Condition to apply (e.g., 'equals', 'contains', 'starts_with')"
                                    },
                                    value: {
                                        type: ["string", "number", "boolean"],
                                        description: "Value to filter by"
                                    }
                                },
                                required: ["attribute", "condition", "value"]
                            }
                        },
                        matchAny: {
                            type: "boolean",
                            description: "When true, matches any filter (OR logic). When false, matches all filters (AND logic)"
                        }
                    },
                    required: ["filters"]
                },
                limit: {
                    type: "number",
                    description: "Maximum number of results to return (default: 20)"
                },
                offset: {
                    type: "number",
                    description: "Number of results to skip (default: 0)"
                }
            },
            required: ["filters"]
        }
    },
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
        name: "get-company-notes",
        description: "Get notes for a company",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company to get notes for"
                },
                uri: {
                    type: "string",
                    description: "URI of the company in the format 'attio://companies/{id}'"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of notes to fetch (default: 10)"
                },
                offset: {
                    type: "number",
                    description: "Number of notes to skip for pagination (default: 0)"
                }
            },
            oneOf: [
                { required: ["companyId"] },
                { required: ["uri"] }
            ]
        }
    },
    {
        name: "create-company-note",
        description: "Create a note for a specific company",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company to create a note for"
                },
                uri: {
                    type: "string",
                    description: "URI of the company in the format 'attio://companies/{id}'"
                },
                title: {
                    type: "string",
                    description: "Title of the note (optional)"
                },
                content: {
                    type: "string",
                    description: "Content of the note"
                }
            },
            required: ["content"],
            oneOf: [
                { required: ["companyId"] },
                { required: ["uri"] }
            ]
        }
    },
    // Relationship-based tools
    {
        name: "search-companies-by-people",
        description: "Search for companies based on attributes of their associated people",
        inputSchema: {
            type: "object",
            properties: {
                peopleFilter: {
                    type: "object",
                    description: "Filter conditions to apply to people",
                    properties: {
                        filters: {
                            type: "array",
                            description: "Array of filter conditions",
                            items: {
                                type: "object",
                                properties: {
                                    attribute: {
                                        type: "object",
                                        properties: {
                                            slug: {
                                                type: "string",
                                                description: "Person attribute to filter on (e.g., 'name', 'email', 'phone')"
                                            }
                                        },
                                        required: ["slug"]
                                    },
                                    condition: {
                                        type: "string",
                                        description: "Condition to apply (e.g., 'equals', 'contains', 'starts_with')"
                                    },
                                    value: {
                                        type: ["string", "number", "boolean"],
                                        description: "Value to filter by"
                                    }
                                },
                                required: ["attribute", "condition", "value"]
                            }
                        },
                        matchAny: {
                            type: "boolean",
                            description: "When true, matches any filter (OR logic). When false, matches all filters (AND logic)"
                        }
                    },
                    required: ["filters"]
                },
                limit: {
                    type: "number",
                    description: "Maximum number of results to return (default: 20)"
                },
                offset: {
                    type: "number",
                    description: "Number of results to skip (default: 0)"
                }
            },
            required: ["peopleFilter"]
        }
    },
    {
        name: "search-companies-by-people-list",
        description: "Search for companies that have employees in a specific list",
        inputSchema: {
            type: "object",
            properties: {
                listId: {
                    type: "string",
                    description: "ID of the list containing people"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of results to return (default: 20)"
                },
                offset: {
                    type: "number",
                    description: "Number of results to skip (default: 0)"
                }
            },
            required: ["listId"]
        }
    },
    {
        name: "search-companies-by-notes",
        description: "Search for companies that have notes containing specific text",
        inputSchema: {
            type: "object",
            properties: {
                searchText: {
                    type: "string",
                    description: "Text to search for in notes"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of results to return (default: 20)"
                },
                offset: {
                    type: "number",
                    description: "Number of results to skip (default: 0)"
                }
            },
            required: ["searchText"]
        }
    },
    {
        name: "create-company",
        description: "Create a new company in Attio",
        inputSchema: {
            type: "object",
            properties: {
                attributes: {
                    type: "object",
                    description: "Company attributes (name, website, etc.)",
                    properties: {
                        name: {
                            type: "string",
                            description: "Company name"
                        },
                        website: {
                            type: "string",
                            description: "Company website URL"
                        },
                        industry: {
                            type: "string",
                            description: "Company industry"
                        }
                    },
                    additionalProperties: true
                }
            },
            required: ["attributes"]
        }
    },
    {
        name: "update-company",
        description: "Update an existing company in Attio",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company to update"
                },
                attributes: {
                    type: "object",
                    description: "Company attributes to update",
                    additionalProperties: true
                }
            },
            required: ["companyId", "attributes"]
        }
    },
    {
        name: "update-company-attribute",
        description: "Update a specific attribute of a company",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company to update"
                },
                attributeName: {
                    type: "string",
                    description: "Name of the attribute to update"
                },
                attributeValue: {
                    type: ["string", "number", "boolean", "object", "array"],
                    description: "New value for the attribute"
                }
            },
            required: ["companyId", "attributeName", "attributeValue"]
        }
    },
    {
        name: "delete-company",
        description: "Delete a company from Attio",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company to delete"
                }
            },
            required: ["companyId"]
        }
    },
    {
        name: "get-company-json",
        description: "Get summary JSON details of a company (full data too large to display)",
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
        name: "get-company-attributes",
        description: "Get all available attributes or a specific attribute value for a company",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company"
                },
                attributeName: {
                    type: "string",
                    description: "Optional: specific attribute name to retrieve. If omitted, returns list of all attributes."
                }
            },
            required: ["companyId"]
        }
    },
    {
        name: "get-company-basic-info",
        description: "Get basic company information (limited fields for performance)",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company"
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
        name: "get-company-contact-info",
        description: "Get company contact information including phone, address, etc.",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company"
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
        name: "get-company-business-info",
        description: "Get company business information including services, categories, revenue, etc.",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company"
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
        name: "get-company-social-info",
        description: "Get company social media presence information",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company"
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
    },
    // Batch operations
    {
        name: "batch-create-companies",
        description: "Create multiple companies in a single batch operation",
        inputSchema: {
            type: "object",
            properties: {
                companies: {
                    type: "array",
                    description: "Array of company data to create",
                    items: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                                description: "Company name (required)"
                            },
                            website: {
                                type: "string",
                                description: "Company website URL"
                            },
                            description: {
                                type: "string",
                                description: "Company description"
                            },
                            industry: {
                                type: "string",
                                description: "Industry classification"
                            }
                        },
                        required: ["name"]
                    }
                },
                config: {
                    type: "object",
                    description: "Optional batch configuration",
                    properties: {
                        maxBatchSize: {
                            type: "number",
                            description: "Maximum items per batch (default: 10)"
                        },
                        continueOnError: {
                            type: "boolean",
                            description: "Continue processing on errors (default: true)"
                        }
                    }
                }
            },
            required: ["companies"]
        }
    },
    {
        name: "batch-update-companies",
        description: "Update multiple companies in a single batch operation",
        inputSchema: {
            type: "object",
            properties: {
                updates: {
                    type: "array",
                    description: "Array of company updates",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "Company ID to update"
                            },
                            attributes: {
                                type: "object",
                                description: "Attributes to update"
                            }
                        },
                        required: ["id", "attributes"]
                    }
                },
                config: {
                    type: "object",
                    description: "Optional batch configuration"
                }
            },
            required: ["updates"]
        }
    },
    {
        name: "batch-delete-companies",
        description: "Delete multiple companies in a single batch operation",
        inputSchema: {
            type: "object",
            properties: {
                companyIds: {
                    type: "array",
                    description: "Array of company IDs to delete",
                    items: {
                        type: "string"
                    }
                },
                config: {
                    type: "object",
                    description: "Optional batch configuration"
                }
            },
            required: ["companyIds"]
        }
    },
    {
        name: "batch-search-companies",
        description: "Perform multiple company searches in a single batch operation",
        inputSchema: {
            type: "object",
            properties: {
                queries: {
                    type: "array",
                    description: "Array of search queries",
                    items: {
                        type: "string"
                    }
                },
                config: {
                    type: "object",
                    description: "Optional batch configuration"
                }
            },
            required: ["queries"]
        }
    },
    {
        name: "batch-get-company-details",
        description: "Get details for multiple companies in a single batch operation",
        inputSchema: {
            type: "object",
            properties: {
                companyIds: {
                    type: "array",
                    description: "Array of company IDs to get details for",
                    items: {
                        type: "string"
                    }
                },
                config: {
                    type: "object",
                    description: "Optional batch configuration"
                }
            },
            required: ["companyIds"]
        }
    }
];
//# sourceMappingURL=companies.old.js.map