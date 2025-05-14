/**
 * Records-related tool configurations
 */
import { AttioRecord } from "../../types/attio.js";
import { ToolConfig } from "../tool-types.js";
export interface RecordCreateToolConfig extends ToolConfig {
    handler: (objectSlug: string, attributes: any, objectId?: string) => Promise<AttioRecord>;
}
export interface RecordGetToolConfig extends ToolConfig {
    handler: (objectSlug: string, recordId: string, attributes?: string[], objectId?: string) => Promise<AttioRecord>;
}
export interface RecordUpdateToolConfig extends ToolConfig {
    handler: (objectSlug: string, recordId: string, attributes: any, objectId?: string) => Promise<AttioRecord>;
}
export interface RecordDeleteToolConfig extends ToolConfig {
    handler: (objectSlug: string, recordId: string, objectId?: string) => Promise<boolean>;
}
export interface RecordListToolConfig extends ToolConfig {
    handler: (objectSlug: string, options?: any, objectId?: string) => Promise<AttioRecord[]>;
}
export interface RecordBatchCreateToolConfig extends ToolConfig {
    handler: (objectSlug: string, records: any[], objectId?: string) => Promise<any>;
}
export interface RecordBatchUpdateToolConfig extends ToolConfig {
    handler: (objectSlug: string, records: any[], objectId?: string) => Promise<any>;
}
export declare const recordToolConfigs: {
    create: RecordCreateToolConfig;
    get: RecordGetToolConfig;
    update: RecordUpdateToolConfig;
    delete: RecordDeleteToolConfig;
    list: RecordListToolConfig;
    batchCreate: RecordBatchCreateToolConfig;
    batchUpdate: RecordBatchUpdateToolConfig;
};
export declare const recordToolDefinitions: ({
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
//# sourceMappingURL=records.d.ts.map