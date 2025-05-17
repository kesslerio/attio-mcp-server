import { ToolConfig } from "../../tool-types.js";
export declare const attributeToolConfigs: {
    fields: ToolConfig;
    customFields: ToolConfig;
    discoverAttributes: ToolConfig;
    getAttributes: ToolConfig;
};
export declare const attributeToolDefinitions: ({
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
})[];
//# sourceMappingURL=attributes.d.ts.map