/**
 * Rate-limited versions of paginated people tool configs
 */
export declare const rateLimitedPeopleToolConfigs: {
    advancedSearch: {
        name: string;
        handler: (...args: any[]) => Promise<any>;
        formatResult: (result: import("../../utils/pagination.js").PaginatedResponse<import("../../types/attio.js").Person>) => string;
    };
    searchByCreationDate: {
        name: string;
        handler: (...args: any[]) => Promise<any>;
        formatResult: (result: import("../../utils/pagination.js").PaginatedResponse<import("../../types/attio.js").Person>) => string;
    };
    searchByModificationDate: {
        name: string;
        handler: (...args: any[]) => Promise<any>;
        formatResult: (result: import("../../utils/pagination.js").PaginatedResponse<import("../../types/attio.js").Person>) => string;
    };
    searchByLastInteraction: {
        name: string;
        handler: (...args: any[]) => Promise<any>;
        formatResult: (result: import("../../utils/pagination.js").PaginatedResponse<import("../../types/attio.js").Person>) => string;
    };
    searchByActivity: {
        name: string;
        handler: (...args: any[]) => Promise<any>;
        formatResult: (result: import("../../utils/pagination.js").PaginatedResponse<import("../../types/attio.js").Person>) => string;
    };
};
/**
 * Rate-limited versions of paginated people tool definitions
 */
export declare const rateLimitedPeopleToolDefinitions: ({
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
                        };
                    };
                    matchAny: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
            page: {
                type: string;
                description: string;
            };
            pageSize: {
                type: string;
                description: string;
            };
            dateRange?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
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
            page: {
                type: string;
                description: string;
            };
            pageSize: {
                type: string;
                description: string;
            };
            filters?: undefined;
            interactionType?: undefined;
            activityFilter?: undefined;
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
            page: {
                type: string;
                description: string;
            };
            pageSize: {
                type: string;
                description: string;
            };
            filters?: undefined;
            activityFilter?: undefined;
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
                    };
                    interactionType: {
                        type: string;
                        description: string;
                        enum: string[];
                    };
                };
                required: string[];
            };
            page: {
                type: string;
                description: string;
            };
            pageSize: {
                type: string;
                description: string;
            };
            filters?: undefined;
            dateRange?: undefined;
            interactionType?: undefined;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=rate-limited-people.d.ts.map