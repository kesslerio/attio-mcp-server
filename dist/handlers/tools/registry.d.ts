/**
 * Tool registry module - handles tool registration mechanics and discovery
 */
import { ResourceType } from "../../types/attio.js";
import { ToolConfig } from "../tool-types.js";
/**
 * Consolidated tool configurations from modular files
 */
export declare const TOOL_CONFIGS: {
    companies: {
        details: import("../tool-types.js").DetailsToolConfig;
        json: import("../tool-types.js").DetailsToolConfig;
        basicInfo: import("../tool-types.js").DetailsToolConfig;
        contactInfo: import("../tool-types.js").DetailsToolConfig;
        businessInfo: import("../tool-types.js").DetailsToolConfig;
        socialInfo: import("../tool-types.js").DetailsToolConfig;
        batchCreate: ToolConfig;
        batchUpdate: ToolConfig;
        batchDelete: ToolConfig;
        batchSearch: ToolConfig;
        batchGetDetails: ToolConfig;
        searchByPeople: ToolConfig;
        searchByPeopleList: ToolConfig;
        searchByNotes: ToolConfig;
        notes: import("../tool-types.js").NotesToolConfig;
        createNote: import("../tool-types.js").CreateNoteToolConfig;
        fields: ToolConfig;
        customFields: ToolConfig;
        discoverAttributes: ToolConfig;
        getAttributes: ToolConfig;
        create: ToolConfig;
        update: ToolConfig;
        updateAttribute: ToolConfig;
        delete: ToolConfig;
        search: import("../tool-types.js").SearchToolConfig;
        advancedSearch: import("../tool-types.js").AdvancedSearchToolConfig;
    };
    people: {
        search: import("../tool-types.js").SearchToolConfig;
        searchByEmail: import("../tool-types.js").SearchToolConfig;
        searchByPhone: import("../tool-types.js").SearchToolConfig;
        advancedSearch: import("../tool-types.js").AdvancedSearchToolConfig;
        details: import("../tool-types.js").DetailsToolConfig;
        notes: import("../tool-types.js").NotesToolConfig;
        createNote: import("../tool-types.js").CreateNoteToolConfig;
        searchByCreationDate: import("../tool-types.js").DateBasedSearchToolConfig;
        searchByModificationDate: import("../tool-types.js").DateBasedSearchToolConfig;
        searchByLastInteraction: import("../tool-types.js").DateBasedSearchToolConfig;
        searchByActivity: import("../tool-types.js").DateBasedSearchToolConfig;
        searchByCompany: import("../tool-types.js").AdvancedSearchToolConfig;
        searchByCompanyList: import("../tool-types.js").SearchToolConfig;
        searchByNotes: import("../tool-types.js").SearchToolConfig;
    };
    lists: {
        getLists: import("../tool-types.js").GetListsToolConfig;
        getListDetails: ToolConfig;
        getListEntries: import("../tool-types.js").GetListEntriesToolConfig;
        filterListEntries: ToolConfig;
        advancedFilterListEntries: ToolConfig;
        addRecordToList: import("../tool-types.js").ListActionToolConfig;
        removeRecordFromList: import("../tool-types.js").ListActionToolConfig;
    };
    records: {
        create: import("../tool-configs/records.js").RecordCreateToolConfig;
        get: import("../tool-configs/records.js").RecordGetToolConfig;
        update: import("../tool-configs/records.js").RecordUpdateToolConfig;
        delete: import("../tool-configs/records.js").RecordDeleteToolConfig;
        list: import("../tool-configs/records.js").RecordListToolConfig;
        batchCreate: import("../tool-configs/records.js").RecordBatchCreateToolConfig;
        batchUpdate: import("../tool-configs/records.js").RecordBatchUpdateToolConfig;
    };
};
/**
 * Consolidated tool definitions from modular files
 */
export declare const TOOL_DEFINITIONS: {
    companies: ({
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
            };
            required: string[];
        };
    } | {
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
            oneOf: {
                required: string[];
            }[];
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
                peopleFilter?: undefined;
                listId?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                companies: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
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
                        required: string[];
                    };
                };
                config: {
                    type: string;
                    description: string;
                    properties: {
                        maxBatchSize: {
                            type: string;
                            description: string;
                        };
                        continueOnError: {
                            type: string;
                            description: string;
                        };
                    };
                };
                updates?: undefined;
                companyIds?: undefined;
                queries?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                updates: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                                description: string;
                            };
                            attributes: {
                                type: string;
                                description: string;
                            };
                        };
                        required: string[];
                    };
                };
                config: {
                    type: string;
                    description: string;
                    properties?: undefined;
                };
                companies?: undefined;
                companyIds?: undefined;
                queries?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                companyIds: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                };
                config: {
                    type: string;
                    description: string;
                    properties?: undefined;
                };
                companies?: undefined;
                updates?: undefined;
                queries?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                queries: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                    };
                };
                config: {
                    type: string;
                    description: string;
                    properties?: undefined;
                };
                companies?: undefined;
                updates?: undefined;
                companyIds?: undefined;
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
                uri?: undefined;
            };
            required: string[];
            oneOf?: undefined;
        };
    })[];
    people: ({
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
    lists: ({
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                listId?: undefined;
                limit?: undefined;
                offset?: undefined;
                attributeSlug?: undefined;
                condition?: undefined;
                value?: undefined;
                filters?: undefined;
                recordId?: undefined;
                entryId?: undefined;
            };
            required?: undefined;
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
                limit?: undefined;
                offset?: undefined;
                attributeSlug?: undefined;
                condition?: undefined;
                value?: undefined;
                filters?: undefined;
                recordId?: undefined;
                entryId?: undefined;
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
                attributeSlug?: undefined;
                condition?: undefined;
                value?: undefined;
                filters?: undefined;
                recordId?: undefined;
                entryId?: undefined;
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
                attributeSlug: {
                    type: string;
                    description: string;
                };
                condition: {
                    type: string;
                    description: string;
                    enum: string[];
                };
                value: {
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
                filters?: undefined;
                recordId?: undefined;
                entryId?: undefined;
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
                                        enum: string[];
                                    };
                                    value: {
                                        description: string;
                                    };
                                    logicalOperator: {
                                        type: string;
                                        description: string;
                                        enum: string[];
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
                attributeSlug?: undefined;
                condition?: undefined;
                value?: undefined;
                recordId?: undefined;
                entryId?: undefined;
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
                recordId: {
                    type: string;
                    description: string;
                };
                limit?: undefined;
                offset?: undefined;
                attributeSlug?: undefined;
                condition?: undefined;
                value?: undefined;
                filters?: undefined;
                entryId?: undefined;
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
                entryId: {
                    type: string;
                    description: string;
                };
                limit?: undefined;
                offset?: undefined;
                attributeSlug?: undefined;
                condition?: undefined;
                value?: undefined;
                filters?: undefined;
                recordId?: undefined;
            };
            required: string[];
        };
    })[];
    records: ({
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                objectSlug: {
                    type: string;
                    description: string;
                };
                objectId: {
                    type: string;
                    description: string;
                };
                attributes: {
                    type: string;
                    description: string;
                    items?: undefined;
                };
                recordId?: undefined;
                page?: undefined;
                pageSize?: undefined;
                query?: undefined;
                sort?: undefined;
                direction?: undefined;
                records?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                objectSlug: {
                    type: string;
                    description: string;
                };
                objectId: {
                    type: string;
                    description: string;
                };
                recordId: {
                    type: string;
                    description: string;
                };
                attributes: {
                    type: string;
                    items: {
                        type: string;
                    };
                    description: string;
                };
                page?: undefined;
                pageSize?: undefined;
                query?: undefined;
                sort?: undefined;
                direction?: undefined;
                records?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                objectSlug: {
                    type: string;
                    description: string;
                };
                objectId: {
                    type: string;
                    description: string;
                };
                recordId: {
                    type: string;
                    description: string;
                };
                attributes: {
                    type: string;
                    description: string;
                    items?: undefined;
                };
                page?: undefined;
                pageSize?: undefined;
                query?: undefined;
                sort?: undefined;
                direction?: undefined;
                records?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                objectSlug: {
                    type: string;
                    description: string;
                };
                objectId: {
                    type: string;
                    description: string;
                };
                recordId: {
                    type: string;
                    description: string;
                };
                attributes?: undefined;
                page?: undefined;
                pageSize?: undefined;
                query?: undefined;
                sort?: undefined;
                direction?: undefined;
                records?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                objectSlug: {
                    type: string;
                    description: string;
                };
                objectId: {
                    type: string;
                    description: string;
                };
                page: {
                    type: string;
                    description: string;
                };
                pageSize: {
                    type: string;
                    description: string;
                };
                query: {
                    type: string;
                    description: string;
                };
                attributes: {
                    type: string;
                    items: {
                        type: string;
                    };
                    description: string;
                };
                sort: {
                    type: string;
                    description: string;
                };
                direction: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                recordId?: undefined;
                records?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                objectSlug: {
                    type: string;
                    description: string;
                };
                objectId: {
                    type: string;
                    description: string;
                };
                records: {
                    type: string;
                    items: {
                        type: string;
                        properties?: undefined;
                        required?: undefined;
                    };
                    description: string;
                };
                attributes?: undefined;
                recordId?: undefined;
                page?: undefined;
                pageSize?: undefined;
                query?: undefined;
                sort?: undefined;
                direction?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                objectSlug: {
                    type: string;
                    description: string;
                };
                objectId: {
                    type: string;
                    description: string;
                };
                records: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                                description: string;
                            };
                            attributes: {
                                type: string;
                                description: string;
                            };
                        };
                        required: string[];
                    };
                    description: string;
                };
                attributes?: undefined;
                recordId?: undefined;
                page?: undefined;
                pageSize?: undefined;
                query?: undefined;
                sort?: undefined;
                direction?: undefined;
            };
            required: string[];
        };
    })[];
};
/**
 * Find the tool config for a given tool name
 *
 * @param toolName - The name of the tool
 * @returns Tool configuration or undefined if not found
 */
export declare function findToolConfig(toolName: string): {
    resourceType: ResourceType;
    toolConfig: ToolConfig;
    toolType: string;
} | undefined;
//# sourceMappingURL=registry.d.ts.map