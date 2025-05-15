import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig, AdvancedSearchToolConfig } from "../tool-types.js";
export declare const companyToolConfigs: {
    search: SearchToolConfig;
    searchByPeople: AdvancedSearchToolConfig;
    searchByPeopleList: SearchToolConfig;
    searchByNotes: SearchToolConfig;
    advancedSearch: AdvancedSearchToolConfig;
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
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
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
        };
        required: never[];
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
        };
        required: never[];
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
        };
        required: string[];
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
            query?: undefined;
            filters?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
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
            query?: undefined;
            filters?: undefined;
            companyId?: undefined;
            uri?: undefined;
            title?: undefined;
            content?: undefined;
            peopleFilter?: undefined;
            listId?: undefined;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=companies.d.ts.map