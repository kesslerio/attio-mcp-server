import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig } from "../tool-types.js";
export declare const companyToolConfigs: {
    search: SearchToolConfig;
    details: DetailsToolConfig;
    notes: NotesToolConfig;
    createNote: CreateNoteToolConfig;
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
            companyId?: undefined;
            uri?: undefined;
            limit?: undefined;
            offset?: undefined;
            title?: undefined;
            content?: undefined;
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
            limit?: undefined;
            offset?: undefined;
            title?: undefined;
            content?: undefined;
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
            title?: undefined;
            content?: undefined;
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
            limit?: undefined;
            offset?: undefined;
        };
        required: string[];
        oneOf: {
            required: string[];
        }[];
    };
})[];
//# sourceMappingURL=companies.d.ts.map