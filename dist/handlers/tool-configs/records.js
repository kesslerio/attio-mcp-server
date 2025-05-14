import { createObjectRecord, getObjectRecord, updateObjectRecord, deleteObjectRecord, listObjectRecords, batchCreateObjectRecords, batchUpdateObjectRecords } from "../../objects/records.js";
// Record tool configurations
export const recordToolConfigs = {
    create: {
        name: "create-record",
        handler: createObjectRecord,
        formatResult: (result) => {
            return `Record created successfully:\n${JSON.stringify(result, null, 2)}`;
        }
    },
    get: {
        name: "get-record",
        handler: getObjectRecord,
        formatResult: (result) => {
            return `Record details:\n${JSON.stringify(result, null, 2)}`;
        }
    },
    update: {
        name: "update-record",
        handler: updateObjectRecord,
        formatResult: (result) => {
            return `Record updated successfully:\n${JSON.stringify(result, null, 2)}`;
        }
    },
    delete: {
        name: "delete-record",
        handler: deleteObjectRecord,
        formatResult: (result) => {
            return result ? "Record deleted successfully" : "Failed to delete record";
        }
    },
    list: {
        name: "list-records",
        handler: listObjectRecords,
        formatResult: (results) => {
            return `Found ${results.length} records:\n${results.map((record) => `- ${record.values?.name?.[0]?.value || '[Unnamed]'} (ID: ${record.id?.record_id || 'unknown'})`).join('\n')}`;
        }
    },
    batchCreate: {
        name: "batch-create-records",
        handler: batchCreateObjectRecords,
        formatResult: (result) => {
            return `Batch create operation completed:\n` +
                `Total: ${result.summary.total}, Succeeded: ${result.summary.succeeded}, Failed: ${result.summary.failed}\n` +
                `${result.results.map((r, i) => r.success
                    ? `✅ Record ${i + 1}: Created successfully (ID: ${r.data?.id?.record_id || 'unknown'})`
                    : `❌ Record ${i + 1}: Failed - ${r.error?.message || 'Unknown error'}`).join('\n')}`;
        }
    },
    batchUpdate: {
        name: "batch-update-records",
        handler: batchUpdateObjectRecords,
        formatResult: (result) => {
            return `Batch update operation completed:\n` +
                `Total: ${result.summary.total}, Succeeded: ${result.summary.succeeded}, Failed: ${result.summary.failed}\n` +
                `${result.results.map((r) => r.success
                    ? `✅ Record ${r.id}: Updated successfully`
                    : `❌ Record ${r.id}: Failed - ${r.error?.message || 'Unknown error'}`).join('\n')}`;
        }
    }
};
// Record tool definitions
export const recordToolDefinitions = [
    {
        name: "create-record",
        description: "Create a new record in Attio",
        inputSchema: {
            type: "object",
            properties: {
                objectSlug: {
                    type: "string",
                    description: "The object type slug (e.g., 'companies', 'people')"
                },
                objectId: {
                    type: "string",
                    description: "Alternative to objectSlug - direct object ID"
                },
                attributes: {
                    type: "object",
                    description: "Record attributes as key-value pairs"
                }
            },
            required: ["objectSlug", "attributes"]
        }
    },
    {
        name: "get-record",
        description: "Get details of a specific record",
        inputSchema: {
            type: "object",
            properties: {
                objectSlug: {
                    type: "string",
                    description: "The object type slug (e.g., 'companies', 'people')"
                },
                objectId: {
                    type: "string",
                    description: "Alternative to objectSlug - direct object ID"
                },
                recordId: {
                    type: "string",
                    description: "ID of the record to retrieve"
                },
                attributes: {
                    type: "array",
                    items: {
                        type: "string"
                    },
                    description: "Optional list of attribute slugs to include"
                }
            },
            required: ["objectSlug", "recordId"]
        }
    },
    {
        name: "update-record",
        description: "Update a specific record",
        inputSchema: {
            type: "object",
            properties: {
                objectSlug: {
                    type: "string",
                    description: "The object type slug (e.g., 'companies', 'people')"
                },
                objectId: {
                    type: "string",
                    description: "Alternative to objectSlug - direct object ID"
                },
                recordId: {
                    type: "string",
                    description: "ID of the record to update"
                },
                attributes: {
                    type: "object",
                    description: "Record attributes to update as key-value pairs"
                }
            },
            required: ["objectSlug", "recordId", "attributes"]
        }
    },
    {
        name: "delete-record",
        description: "Delete a specific record",
        inputSchema: {
            type: "object",
            properties: {
                objectSlug: {
                    type: "string",
                    description: "The object type slug (e.g., 'companies', 'people')"
                },
                objectId: {
                    type: "string",
                    description: "Alternative to objectSlug - direct object ID"
                },
                recordId: {
                    type: "string",
                    description: "ID of the record to delete"
                }
            },
            required: ["objectSlug", "recordId"]
        }
    },
    {
        name: "list-records",
        description: "List records with filtering options",
        inputSchema: {
            type: "object",
            properties: {
                objectSlug: {
                    type: "string",
                    description: "The object type slug (e.g., 'companies', 'people')"
                },
                objectId: {
                    type: "string",
                    description: "Alternative to objectSlug - direct object ID"
                },
                page: {
                    type: "number",
                    description: "Page number to retrieve (starting at 1)"
                },
                pageSize: {
                    type: "number",
                    description: "Number of items per page"
                },
                query: {
                    type: "string",
                    description: "Search query to filter records"
                },
                attributes: {
                    type: "array",
                    items: {
                        type: "string"
                    },
                    description: "List of attribute slugs to include"
                },
                sort: {
                    type: "string",
                    description: "Attribute slug to sort by"
                },
                direction: {
                    type: "string",
                    enum: ["asc", "desc"],
                    description: "Sort direction (asc or desc)"
                }
            },
            required: ["objectSlug"]
        }
    },
    {
        name: "batch-create-records",
        description: "Create multiple records in a single batch operation",
        inputSchema: {
            type: "object",
            properties: {
                objectSlug: {
                    type: "string",
                    description: "The object type slug (e.g., 'companies', 'people')"
                },
                objectId: {
                    type: "string",
                    description: "Alternative to objectSlug - direct object ID"
                },
                records: {
                    type: "array",
                    items: {
                        type: "object"
                    },
                    description: "Array of record attributes to create"
                }
            },
            required: ["objectSlug", "records"]
        }
    },
    {
        name: "batch-update-records",
        description: "Update multiple records in a single batch operation",
        inputSchema: {
            type: "object",
            properties: {
                objectSlug: {
                    type: "string",
                    description: "The object type slug (e.g., 'companies', 'people')"
                },
                objectId: {
                    type: "string",
                    description: "Alternative to objectSlug - direct object ID"
                },
                records: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "ID of the record to update"
                            },
                            attributes: {
                                type: "object",
                                description: "Record attributes to update"
                            }
                        },
                        required: ["id", "attributes"]
                    },
                    description: "Array of records with IDs and attributes to update"
                }
            },
            required: ["objectSlug", "records"]
        }
    }
];
//# sourceMappingURL=records.js.map