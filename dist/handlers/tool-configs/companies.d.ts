import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig, AdvancedSearchToolConfig, ToolConfig } from "../tool-types.js";
export declare const companyToolConfigs: {
    search: SearchToolConfig;
    searchByPeople: AdvancedSearchToolConfig;
    searchByPeopleList: SearchToolConfig;
    searchByNotes: SearchToolConfig;
    advancedSearch: AdvancedSearchToolConfig;
    details: DetailsToolConfig;
    notes: NotesToolConfig;
    createNote: CreateNoteToolConfig;
    create: ToolConfig;
    update: ToolConfig;
    updateAttribute: ToolConfig;
    delete: ToolConfig;
    json: DetailsToolConfig;
    basicInfo: DetailsToolConfig;
    contactInfo: DetailsToolConfig;
    businessInfo: DetailsToolConfig;
    socialInfo: DetailsToolConfig;
    fields: ToolConfig;
    customFields: ToolConfig;
    discoverAttributes: ToolConfig;
    getAttributes: ToolConfig;
    batchCreate: ToolConfig;
    batchUpdate: ToolConfig;
    batchDelete: ToolConfig;
    batchSearch: ToolConfig;
    batchGetDetails: ToolConfig;
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
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
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
            uri: {
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
            query?: undefined;
            filters?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
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
            query?: undefined;
            filters?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
                    industry: {
                        type: string;
                        description: string;
                    };
                };
                additionalProperties: boolean;
            };
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
                additionalProperties: boolean;
                properties?: undefined;
            };
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            attributeValue: {
                type: string[];
                description: string;
            };
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            config?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required?: undefined;
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            updates?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            companyIds?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            updates?: undefined;
            queries?: undefined;
        };
        required: string[];
        oneOf?: undefined;
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
            query?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
            searchText?: undefined;
            attributes?: undefined;
            attributeName?: undefined;
            attributeValue?: undefined;
            fields?: undefined;
            customFieldNames?: undefined;
            companies?: undefined;
            updates?: undefined;
            companyIds?: undefined;
        };
        required: string[];
        oneOf?: undefined;
    };
})[];
//# sourceMappingURL=companies.d.ts.map