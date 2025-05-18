import { searchCompanies, advancedSearchCompanies } from "../../../objects/companies/index.js";
// Company search tool configurations
export const searchToolConfigs = {
    search: {
        name: "search-companies",
        handler: searchCompanies,
        formatResult: (results) => {
            return `Found ${results.length} companies:\n${results.map((company) => `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
        }
    },
    advancedSearch: {
        name: "advanced-search-companies",
        handler: advancedSearchCompanies,
        formatResult: (results) => {
            return `Found ${results.length} companies matching advanced search:\n${results.map((company) => `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`).join('\n')}`;
        }
    }
};
// Search tool definitions
export const searchToolDefinitions = [
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
];
//# sourceMappingURL=search.js.map