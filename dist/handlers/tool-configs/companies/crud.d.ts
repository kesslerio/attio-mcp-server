import { ToolConfig } from "../../tool-types.js";
export declare const crudToolConfigs: {
    create: ToolConfig;
    update: ToolConfig;
    updateAttribute: ToolConfig;
    delete: ToolConfig;
};
export declare const crudToolDefinitions: ({
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
})[];
//# sourceMappingURL=crud.d.ts.map