/**
 * Aggregated exports for company tool configurations
 */
import { searchToolConfigs, searchToolDefinitions } from "./search.js";
import { crudToolConfigs, crudToolDefinitions } from "./crud.js";
import { attributeToolConfigs, attributeToolDefinitions } from "./attributes.js";
import { notesToolConfigs, notesToolDefinitions } from "./notes.js";
import { relationshipToolConfigs, relationshipToolDefinitions } from "./relationships.js";
import { batchToolConfigs, batchToolDefinitions } from "./batch.js";
import { formatterConfigs, formatterToolDefinitions } from "./formatters.js";
export declare const companyToolConfigs: {
    details: import("../../tool-types.js").DetailsToolConfig;
    json: import("../../tool-types.js").DetailsToolConfig;
    basicInfo: import("../../tool-types.js").DetailsToolConfig;
    contactInfo: import("../../tool-types.js").DetailsToolConfig;
    businessInfo: import("../../tool-types.js").DetailsToolConfig;
    socialInfo: import("../../tool-types.js").DetailsToolConfig;
    batchCreate: import("../../tool-types.js").ToolConfig;
    batchUpdate: import("../../tool-types.js").ToolConfig;
    batchDelete: import("../../tool-types.js").ToolConfig;
    batchSearch: import("../../tool-types.js").ToolConfig;
    batchGetDetails: import("../../tool-types.js").ToolConfig;
    searchByPeople: import("../../tool-types.js").ToolConfig;
    searchByPeopleList: import("../../tool-types.js").ToolConfig;
    searchByNotes: import("../../tool-types.js").ToolConfig;
    notes: import("../../tool-types.js").NotesToolConfig;
    createNote: import("../../tool-types.js").CreateNoteToolConfig;
    fields: import("../../tool-types.js").ToolConfig;
    customFields: import("../../tool-types.js").ToolConfig;
    discoverAttributes: import("../../tool-types.js").ToolConfig;
    getAttributes: import("../../tool-types.js").ToolConfig;
    create: import("../../tool-types.js").ToolConfig;
    update: import("../../tool-types.js").ToolConfig;
    updateAttribute: import("../../tool-types.js").ToolConfig;
    delete: import("../../tool-types.js").ToolConfig;
    search: import("../../tool-types.js").SearchToolConfig;
    advancedSearch: import("../../tool-types.js").AdvancedSearchToolConfig;
};
export declare const companyToolDefinitions: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            filters: {
                type: string;
                description: string;
                properties: {
                    filters: {
                        type: string;
                        description: string;
                        items: {
                            type: string;
                            properties: {
                                attribute: {
                                    type: string;
                                    properties: {
                                        slug: {
                                            type: string;
                                            description: string;
                                        };
                                    };
                                    required: string[];
                                };
                                condition: {
                                    type: string;
                                    description: string;
                                };
                                value: {
                                    type: string[];
                                    description: string;
                                };
                            };
                            required: string[];
                        };
                    };
                    matchAny: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
                description: string;
            };
            query?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            attributes: {
                type: string;
                description: string;
                properties: {
                    name: {
                        type: string;
                        description: string;
                    };
                    website: {
                        type: string;
                        description: string;
                    };
                    description: {
                        type: string;
                        description: string;
                    };
                    industry: {
                        type: string;
                        description: string;
                    };
                };
            };
            companyId?: undefined;
            attributeName?: undefined;
            value?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            attributes: {
                type: string;
                description: string;
                properties?: undefined;
            };
            attributeName?: undefined;
            value?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            attributeName: {
                type: string;
                description: string;
            };
            value: {
                description: string;
                oneOf: {
                    type: string;
                }[];
            };
            attributes?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            attributes?: undefined;
            attributeName?: undefined;
            value?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            fields: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            customFieldNames?: undefined;
            attributeName?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            customFieldNames: {
                type: string[];
                items: {
                    type: string;
                };
                description: string;
            };
            fields?: undefined;
            attributeName?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            attributeName?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            attributeName: {
                type: string;
                description: string;
            };
            fields?: undefined;
            customFieldNames?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            uri: {
                type: string;
                description: string;
            };
            title: {
                type: string;
                description: string;
            };
            content: {
                type: string;
                description: string;
            };
            limit?: undefined;
            offset?: undefined;
        };
        required: string[];
        oneOf: {
            required: string[];
        }[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            peopleFilter: {
                type: string;
                description: string;
                properties: {
                    filters: {
                        type: string;
                        description: string;
                        items: {
                            type: string;
                            properties: {
                                attribute: {
                                    type: string;
                                    properties: {
                                        slug: {
                                            type: string;
                                            description: string;
                                        };
                                    };
                                    required: string[];
                                };
                                condition: {
                                    type: string;
                                    description: string;
                                };
                                value: {
                                    type: string[];
                                    description: string;
                                };
                            };
                            required: string[];
                        };
                    };
                    matchAny: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
                description: string;
            };
            listId?: undefined;
            searchText?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            listId: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
                description: string;
            };
            peopleFilter?: undefined;
            searchText?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            searchText: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
                description: string;
            };
            peopleFilter?: undefined;
            listId?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companies: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                            description: string;
                        };
                        website: {
                            type: string;
                            description: string;
                        };
                        description: {
                            type: string;
                            description: string;
                        };
                        industry: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            config: {
                type: string;
                description: string;
                properties: {
                    maxBatchSize: {
                        type: string;
                        description: string;
                    };
                    continueOnError: {
                        type: string;
                        description: string;
                    };
                };
            };
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            updates: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                            description: string;
                        };
                        attributes: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            config: {
                type: string;
                description: string;
                properties?: undefined;
            };
            companies?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyIds: {
                type: string;
                description: string;
                items: {
                    type: string;
                };
            };
            config: {
                type: string;
                description: string;
                properties?: undefined;
            };
            companies?: undefined;
            updates?: undefined;
            queries?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            queries: {
                type: string;
                description: string;
                items: {
                    type: string;
                };
            };
            config: {
                type: string;
                description: string;
                properties?: undefined;
            };
            companies?: undefined;
            updates?: undefined;
            companyIds?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            uri: {
                type: string;
                description: string;
            };
        };
        oneOf: {
            required: string[];
        }[];
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            uri?: undefined;
        };
        required: string[];
        oneOf?: undefined;
    };
})[];
export { searchToolConfigs, searchToolDefinitions, crudToolConfigs, crudToolDefinitions, attributeToolConfigs, attributeToolDefinitions, notesToolConfigs, notesToolDefinitions, relationshipToolConfigs, relationshipToolDefinitions, batchToolConfigs, batchToolDefinitions, formatterConfigs, formatterToolDefinitions };
//# sourceMappingURL=index.d.ts.map