/**
 * Paginated people-related tool configurations
 */
import { Person } from "../../types/attio.js";
import { PaginatedResponse } from "../../utils/pagination.js";
/**
 * Config type for paginated search tools
 */
interface PaginatedSearchToolConfig {
    name: string;
    handler: (...args: any[]) => Promise<PaginatedResponse<Person>>;
    formatResult: (result: PaginatedResponse<Person>) => string;
}
/**
 * Paginated people tool configurations
 */
export declare const paginatedPeopleToolConfigs: {
    advancedSearch: PaginatedSearchToolConfig;
    searchByCreationDate: PaginatedSearchToolConfig;
    searchByModificationDate: PaginatedSearchToolConfig;
    searchByLastInteraction: PaginatedSearchToolConfig;
    searchByActivity: PaginatedSearchToolConfig;
};
/**
 * Tool definitions for paginated people search
 */
export declare const paginatedPeopleToolDefinitions: ({
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
export {};
//# sourceMappingURL=paginated-people.d.ts.map