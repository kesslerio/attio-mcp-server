import { GetListsToolConfig, ToolConfig, GetListEntriesToolConfig, ListActionToolConfig } from "../tool-types.js";
export declare const listsToolConfigs: {
    getLists: GetListsToolConfig;
    getListDetails: ToolConfig;
    getListEntries: GetListEntriesToolConfig;
    filterListEntries: ToolConfig;
    advancedFilterListEntries: ToolConfig;
    addRecordToList: ListActionToolConfig;
    removeRecordFromList: ListActionToolConfig;
};
export declare const listsToolDefinitions: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            listId?: undefined;
            limit?: undefined;
            offset?: undefined;
            attributeSlug?: undefined;
            condition?: undefined;
            value?: undefined;
            filters?: undefined;
            recordId?: undefined;
            entryId?: undefined;
        };
        required?: undefined;
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
            limit?: undefined;
            offset?: undefined;
            attributeSlug?: undefined;
            condition?: undefined;
            value?: undefined;
            filters?: undefined;
            recordId?: undefined;
            entryId?: undefined;
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
            attributeSlug?: undefined;
            condition?: undefined;
            value?: undefined;
            filters?: undefined;
            recordId?: undefined;
            entryId?: undefined;
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
            attributeSlug: {
                type: string;
                description: string;
            };
            condition: {
                type: string;
                description: string;
                enum: string[];
            };
            value: {
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
            filters?: undefined;
            recordId?: undefined;
            entryId?: undefined;
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
                                    enum: string[];
                                };
                                value: {
                                    description: string;
                                };
                                logicalOperator: {
                                    type: string;
                                    description: string;
                                    enum: string[];
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
            attributeSlug?: undefined;
            condition?: undefined;
            value?: undefined;
            recordId?: undefined;
            entryId?: undefined;
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
            recordId: {
                type: string;
                description: string;
            };
            limit?: undefined;
            offset?: undefined;
            attributeSlug?: undefined;
            condition?: undefined;
            value?: undefined;
            filters?: undefined;
            entryId?: undefined;
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
            entryId: {
                type: string;
                description: string;
            };
            limit?: undefined;
            offset?: undefined;
            attributeSlug?: undefined;
            condition?: undefined;
            value?: undefined;
            filters?: undefined;
            recordId?: undefined;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=lists.d.ts.map