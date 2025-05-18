import { NotesToolConfig, CreateNoteToolConfig } from "../../tool-types.js";
export declare const notesToolConfigs: {
    notes: NotesToolConfig;
    createNote: CreateNoteToolConfig;
};
export declare const notesToolDefinitions: ({
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
            title?: undefined;
            content?: undefined;
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
    };
})[];
//# sourceMappingURL=notes.d.ts.map