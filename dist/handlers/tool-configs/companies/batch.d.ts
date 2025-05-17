import { ToolConfig } from "../../tool-types.js";
export declare const batchToolConfigs: {
    batchCreate: ToolConfig;
    batchUpdate: ToolConfig;
    batchDelete: ToolConfig;
    batchSearch: ToolConfig;
    batchGetDetails: ToolConfig;
};
export declare const batchToolDefinitions: ({
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
})[];
//# sourceMappingURL=batch.d.ts.map