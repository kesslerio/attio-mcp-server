import { PromptsToolConfig } from "../tool-types.js";
export declare const promptsToolConfigs: {
    listPrompts: PromptsToolConfig;
    listPromptCategories: PromptsToolConfig;
    getPromptDetails: PromptsToolConfig;
    executePrompt: PromptsToolConfig;
};
export declare const promptsToolDefinitions: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            category: {
                type: string;
                description: string;
            };
            promptId?: undefined;
            parameters?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            category?: undefined;
            promptId?: undefined;
            parameters?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            promptId: {
                type: string;
                description: string;
            };
            category?: undefined;
            parameters?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            promptId: {
                type: string;
                description: string;
            };
            parameters: {
                type: string;
                description: string;
            };
            category?: undefined;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=prompts.d.ts.map