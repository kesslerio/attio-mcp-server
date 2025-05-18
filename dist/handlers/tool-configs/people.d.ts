import { SearchToolConfig, DetailsToolConfig, NotesToolConfig, CreateNoteToolConfig, DateBasedSearchToolConfig } from "../tool-types.js";
export declare const peopleToolConfigs: {
    search: SearchToolConfig;
    searchByEmail: SearchToolConfig;
    searchByPhone: SearchToolConfig;
    advancedSearch: any;
    details: DetailsToolConfig;
    notes: NotesToolConfig;
    createNote: CreateNoteToolConfig;
    searchByCreationDate: DateBasedSearchToolConfig;
    searchByModificationDate: DateBasedSearchToolConfig;
    searchByLastInteraction: DateBasedSearchToolConfig;
    searchByActivity: DateBasedSearchToolConfig;
    searchByCompany: any;
    searchByCompanyList: any;
    searchByNotes: SearchToolConfig;
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
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            personId?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            email: {
                type: string;
                description: string;
            };
            query?: undefined;
            phone?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            personId?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            phone: {
                type: string;
                description: string;
            };
            query?: undefined;
            email?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            personId?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            email?: undefined;
            phone?: undefined;
            personId?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            personId: {
                type: string;
                description: string;
            };
            query?: undefined;
            email?: undefined;
            phone?: undefined;
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            filters?: undefined;
            limit?: undefined;
            offset?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            dateRange: {
                type: string;
                description: string;
                properties: {
                    start: {
                        type: string;
                        description: string;
                    };
                    end: {
                        type: string;
                        description: string;
                    };
                    preset: {
                        type: string;
                        description: string;
                    };
                };
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
            email?: undefined;
            phone?: undefined;
            filters?: undefined;
            personId?: undefined;
            content?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            dateRange: {
                type: string;
                description: string;
                properties: {
                    start: {
                        type: string;
                        description: string;
                    };
                    end: {
                        type: string;
                        description: string;
                    };
                    preset: {
                        type: string;
                        description: string;
                    };
                };
            };
            interactionType: {
                type: string;
                description: string;
                enum: string[];
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
            email?: undefined;
            phone?: undefined;
            filters?: undefined;
            personId?: undefined;
            content?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            activityFilter: {
                type: string;
                description: string;
                properties: {
                    dateRange: {
                        type: string;
                        description: string;
                        properties: {
                            start: {
                                type: string;
                                description: string;
                            };
                            end: {
                                type: string;
                                description: string;
                            };
                            preset: {
                                type: string;
                                description: string;
                            };
                        };
                        required: string[];
                    };
                    interactionType: {
                        type: string;
                        description: string;
                        enum: string[];
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
            email?: undefined;
            phone?: undefined;
            filters?: undefined;
            personId?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            companyFilter?: undefined;
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
            companyFilter: {
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
            email?: undefined;
            phone?: undefined;
            filters?: undefined;
            personId?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
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
            email?: undefined;
            phone?: undefined;
            filters?: undefined;
            personId?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
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
            email?: undefined;
            phone?: undefined;
            filters?: undefined;
            personId?: undefined;
            content?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
            companyFilter?: undefined;
            listId?: undefined;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=people.d.ts.map