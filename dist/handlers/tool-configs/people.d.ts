import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig } from "../tool-types.js";
export declare const peopleToolConfigs: {
    search: SearchToolConfig;
    searchByEmail: SearchToolConfig;
    searchByPhone: SearchToolConfig;
    details: DetailsToolConfig;
    notes: NotesToolConfig;
    createNote: CreateNoteToolConfig;
};
export declare const peopleToolDefinitions: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            email?: undefined;
            phone?: undefined;
            personId?: undefined;
            content?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            email: {
                type: string;
                description: string;
            };
            query?: undefined;
            phone?: undefined;
            personId?: undefined;
            content?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            phone: {
                type: string;
                description: string;
            };
            query?: undefined;
            email?: undefined;
            personId?: undefined;
            content?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            personId: {
                type: string;
                description: string;
            };
            query?: undefined;
            email?: undefined;
            phone?: undefined;
            content?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            personId: {
                type: string;
                description: string;
            };
            content: {
                type: string;
                description: string;
            };
            query?: undefined;
            email?: undefined;
            phone?: undefined;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=people.d.ts.map