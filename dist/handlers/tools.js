import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createErrorResult } from "../utils/error-handler.js";
import { ValueMatchError } from "../errors/value-match-error.js";
import { parseResourceUri } from "../utils/uri-parser.js";
import { ResourceType } from "../types/attio.js";
import { processListEntries } from "../utils/record-utils.js";
import axios from "axios";
// Import tool configurations and definitions
import { companyToolConfigs, companyToolDefinitions, peopleToolConfigs, peopleToolDefinitions, listsToolConfigs, listsToolDefinitions, recordToolConfigs, recordToolDefinitions } from "./tool-configs/index.js";
// Consolidated tool configurations from modular files
const TOOL_CONFIGS = {
    [ResourceType.COMPANIES]: companyToolConfigs,
    [ResourceType.PEOPLE]: peopleToolConfigs,
    [ResourceType.LISTS]: listsToolConfigs,
    [ResourceType.RECORDS]: recordToolConfigs,
    // Add other resource types as needed
};
// Consolidated tool definitions from modular files
const TOOL_DEFINITIONS = {
    [ResourceType.COMPANIES]: companyToolDefinitions,
    [ResourceType.PEOPLE]: peopleToolDefinitions,
    [ResourceType.LISTS]: listsToolDefinitions,
    [ResourceType.RECORDS]: recordToolDefinitions,
    // Add other resource types as needed
};
/**
 * Find the tool config for a given tool name
 *
 * @param toolName - The name of the tool
 * @returns Tool configuration or undefined if not found
 */
function findToolConfig(toolName) {
    for (const resourceType of Object.values(ResourceType)) {
        const resourceConfig = TOOL_CONFIGS[resourceType];
        if (!resourceConfig)
            continue;
        for (const [toolType, config] of Object.entries(resourceConfig)) {
            if (config && config.name === toolName) {
                return {
                    resourceType: resourceType,
                    toolConfig: config,
                    toolType,
                };
            }
        }
    }
    return undefined;
}
/**
 * Registers tool-related request handlers with the server
 *
 * @param server - The MCP server instance
 */
export function registerToolHandlers(server) {
    // Handler for listing available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                ...TOOL_DEFINITIONS[ResourceType.COMPANIES],
                ...TOOL_DEFINITIONS[ResourceType.PEOPLE],
                ...TOOL_DEFINITIONS[ResourceType.LISTS]
            ],
        };
    });
    // Handler for calling tools
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const toolName = request.params.name;
        try {
            const toolInfo = findToolConfig(toolName);
            if (!toolInfo) {
                throw new Error(`Tool not found: ${toolName}`);
            }
            const { resourceType, toolConfig, toolType } = toolInfo;
            // Handle search tools
            if (toolType === 'search') {
                const query = request.params.arguments?.query;
                try {
                    const searchToolConfig = toolConfig;
                    const results = await searchToolConfig.handler(query);
                    const formattedResults = searchToolConfig.formatResult(results);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Found ${results.length} ${resourceType}:\n${formattedResults}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/objects/${resourceType}/records/query`, "POST", error.response?.data || {});
                }
            }
            // Handle searchByEmail tools
            if (toolType === 'searchByEmail') {
                const email = request.params.arguments?.email;
                try {
                    const searchToolConfig = toolConfig;
                    const results = await searchToolConfig.handler(email);
                    const formattedResults = searchToolConfig.formatResult(results);
                    return {
                        content: [
                            {
                                type: "text",
                                text: formattedResults,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/objects/${resourceType}/records/query`, "POST", error.response?.data || {});
                }
            }
            // Handle searchByPhone tools
            if (toolType === 'searchByPhone') {
                const phone = request.params.arguments?.phone;
                try {
                    const searchToolConfig = toolConfig;
                    const results = await searchToolConfig.handler(phone);
                    const formattedResults = searchToolConfig.formatResult(results);
                    return {
                        content: [
                            {
                                type: "text",
                                text: formattedResults,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/objects/${resourceType}/records/query`, "POST", error.response?.data || {});
                }
            }
            // Handle details tools
            if (toolType === 'details') {
                let id;
                let uri;
                // Check which parameter is provided
                const directId = resourceType === ResourceType.COMPANIES
                    ? request.params.arguments?.companyId
                    : request.params.arguments?.personId;
                uri = request.params.arguments?.uri;
                // Use either direct ID or URI, with priority to URI if both are provided
                if (uri) {
                    try {
                        const [uriType, uriId] = parseResourceUri(uri);
                        if (uriType !== resourceType) {
                            throw new Error(`URI type mismatch: Expected ${resourceType}, got ${uriType}`);
                        }
                        id = uriId;
                    }
                    catch (error) {
                        return createErrorResult(error instanceof Error ? error : new Error("Invalid URI format"), uri, "GET", { status: 400, message: "Invalid URI format" });
                    }
                }
                else if (directId) {
                    id = directId;
                    // For logging purposes
                    uri = `attio://${resourceType}/${directId}`;
                }
                else {
                    return createErrorResult(new Error("Missing required parameter: uri or direct ID"), `${resourceType}/details`, "GET", { status: 400, message: "Missing required parameter: uri or companyId/personId" });
                }
                try {
                    const details = await toolConfig.handler(id);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `${resourceType.slice(0, -1).charAt(0).toUpperCase() + resourceType.slice(1, -1)} details for ${id}:\n${JSON.stringify(details, null, 2)}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), uri, "GET", error.response?.data || {});
                }
            }
            // Handle notes tools
            if (toolType === 'notes') {
                let id;
                let uri;
                // Check which parameter is provided
                const directId = resourceType === ResourceType.COMPANIES
                    ? request.params.arguments?.companyId
                    : request.params.arguments?.personId;
                uri = request.params.arguments?.uri;
                const limit = request.params.arguments?.limit || 10;
                const offset = request.params.arguments?.offset || 0;
                // Use either direct ID or URI
                if (uri) {
                    try {
                        id = uri; // Pass the full URI to the handler which now handles URI parsing
                    }
                    catch (error) {
                        return createErrorResult(error instanceof Error ? error : new Error("Invalid URI format"), uri, "GET", { status: 400, message: "Invalid URI format" });
                    }
                }
                else if (directId) {
                    id = directId;
                    // For logging purposes
                    uri = `attio://${resourceType}/${directId}`;
                }
                else {
                    return createErrorResult(new Error("Missing required parameter: uri or direct ID"), `${resourceType}/notes`, "GET", { status: 400, message: "Missing required parameter: uri or companyId/personId" });
                }
                try {
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[tools.notes] Calling notes handler for ${resourceType} with: `, {
                            id,
                            limit,
                            offset
                        });
                    }
                    const notes = await toolConfig.handler(id, limit, offset);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Found ${notes.length} notes for ${resourceType.slice(0, -1)} ${id.includes('attio://') ? id.split('/').pop() : id}:\n${notes.length > 0 ? notes.map((note) => JSON.stringify(note)).join("----------\n") : "No notes found."}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), uri, "GET", error.response?.data || {});
                }
            }
            // Handle create note tools
            if (toolType === 'createNote') {
                const createNoteConfig = toolConfig;
                const idParam = createNoteConfig.idParam;
                if (!idParam) {
                    const configError = new Error('Missing idParam in tool configuration');
                    return createErrorResult(configError, 'tool-config', 'GET', { status: 400 });
                }
                let id;
                let uri = request.params.arguments?.uri;
                const directId = request.params.arguments?.[idParam];
                const noteTitle = request.params.arguments?.title || request.params.arguments?.noteTitle || 'Note';
                const noteText = request.params.arguments?.content || request.params.arguments?.noteText;
                if (!noteText) {
                    return createErrorResult(new Error("Missing required parameter: content or noteText"), "notes/create", "POST", { status: 400, message: "Missing required parameter: content" });
                }
                // Use either direct ID or URI
                if (uri) {
                    try {
                        id = uri; // Pass the full URI to the handler which now handles URI parsing
                    }
                    catch (error) {
                        return createErrorResult(error instanceof Error ? error : new Error("Invalid URI format"), uri, "POST", { status: 400, message: "Invalid URI format" });
                    }
                }
                else if (directId) {
                    id = directId;
                    // For logging purposes
                    uri = `attio://${resourceType}/${directId}`;
                }
                else {
                    return createErrorResult(new Error(`Missing required parameter: uri or ${idParam}`), "notes/create", "POST", { status: 400, message: `Missing required parameter: uri or ${idParam}` });
                }
                try {
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[tools.createNote] Creating note for ${resourceType} with: `, {
                            id,
                            title: noteTitle,
                            textLength: typeof noteText === 'string' ? noteText.length : 0
                        });
                    }
                    const response = await toolConfig.handler(id, noteTitle, noteText);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Note added to ${resourceType.slice(0, -1)} ${id.includes('attio://') ? id.split('/').pop() : id}: attio://notes/${response?.id?.note_id || 'unknown'}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), "/notes", "POST", error.response?.data || {});
                }
            }
            // Lists API tools
            // Handle getLists tool
            if (toolType === 'getLists') {
                const objectSlug = request.params.arguments?.objectSlug;
                const limit = request.params.arguments?.limit || 20;
                try {
                    const lists = await toolConfig.handler(objectSlug, limit);
                    const getListsToolConfig = toolConfig;
                    const formattedResults = getListsToolConfig.formatResult
                        ? getListsToolConfig.formatResult(lists)
                        : JSON.stringify(lists, null, 2);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Found ${lists.length} lists:\n${formattedResults}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), "/lists", "GET", error.response?.data || {});
                }
            }
            // Handle getListDetails tool
            if (toolType === 'getListDetails') {
                const listId = request.params.arguments?.listId;
                try {
                    const list = await toolConfig.handler(listId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `List details for ${listId}:\n${JSON.stringify(list, null, 2)}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}`, "GET", error.response?.data || {});
                }
            }
            // Handle getListEntries tool
            if (toolType === 'getListEntries') {
                const listId = request.params.arguments?.listId;
                // Ensure parameters are properly typed to match the handler expectations
                // Convert parameters to the correct type and handle undefined values properly
                let limit;
                let offset;
                // Only set the parameter values if they are explicitly provided in the request
                if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
                    limit = Number(request.params.arguments.limit);
                }
                if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
                    offset = Number(request.params.arguments.offset);
                }
                if (process.env.NODE_ENV === 'development') {
                    console.log('[getListEntries Tool] Processing request with parameters:', {
                        listId,
                        limit,
                        offset,
                        request_limit_type: typeof request.params.arguments?.limit,
                        request_limit_value: request.params.arguments?.limit,
                        calculated_limit_type: typeof limit,
                        calculated_limit_value: limit
                    });
                }
                try {
                    // Pass parameters directly to the handler, letting it handle defaults
                    const entries = await toolConfig.handler(listId, limit, offset);
                    const getListEntriesToolConfig = toolConfig;
                    // Use shared utility function to process entries and ensure record_id is available
                    const processedEntries = entries ? processListEntries(entries) : [];
                    const formattedResults = getListEntriesToolConfig.formatResult
                        ? getListEntriesToolConfig.formatResult(processedEntries)
                        : JSON.stringify(processedEntries, null, 2);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Found ${processedEntries.length} entries in list ${listId}:\n${formattedResults}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries`, "GET", error.response?.data || {});
                }
            }
            // Handle filterListEntries tool
            if (toolType === 'filterListEntries') {
                const listId = request.params.arguments?.listId;
                const attributeSlug = request.params.arguments?.attributeSlug;
                const condition = request.params.arguments?.condition;
                const value = request.params.arguments?.value;
                // Convert parameters to the correct type
                let limit;
                let offset;
                if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
                    limit = Number(request.params.arguments.limit);
                }
                if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
                    offset = Number(request.params.arguments.offset);
                }
                if (process.env.NODE_ENV === 'development') {
                    console.log('[filterListEntries Tool] Processing request with parameters:', {
                        listId,
                        attributeSlug,
                        condition,
                        value,
                        limit,
                        offset
                    });
                }
                try {
                    const entries = await toolConfig.handler(listId, attributeSlug, condition, value, limit, offset);
                    const processedEntries = entries ? processListEntries(entries) : [];
                    const formattedResults = toolConfig.formatResult
                        ? toolConfig.formatResult(processedEntries)
                        : JSON.stringify(processedEntries, null, 2);
                    return {
                        content: [
                            {
                                type: "text",
                                text: formattedResults,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries/query`, "POST", error.response?.data || {});
                }
            }
            // Handle advancedFilterListEntries tool
            if (toolType === 'advancedFilterListEntries') {
                const listId = request.params.arguments?.listId;
                const filters = request.params.arguments?.filters;
                // Convert parameters to the correct type
                let limit;
                let offset;
                if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
                    limit = Number(request.params.arguments.limit);
                }
                if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
                    offset = Number(request.params.arguments.offset);
                }
                if (process.env.NODE_ENV === 'development') {
                    console.log('[advancedFilterListEntries] Processing request with parameters:', {
                        listId,
                        filters: JSON.stringify(filters),
                        limit,
                        offset
                    });
                }
                try {
                    const entries = await toolConfig.handler(listId, filters, limit, offset);
                    const processedEntries = entries ? processListEntries(entries) : [];
                    const formattedResults = toolConfig.formatResult
                        ? toolConfig.formatResult(processedEntries)
                        : JSON.stringify(processedEntries, null, 2);
                    return {
                        content: [
                            {
                                type: "text",
                                text: formattedResults,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries/query`, "POST", error.response?.data || {});
                }
            }
            // Handle addRecordToList tool
            if (toolType === 'addRecordToList') {
                const listId = request.params.arguments?.listId;
                const recordId = request.params.arguments?.recordId;
                try {
                    const entry = await toolConfig.handler(listId, recordId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Record ${recordId} added to list ${listId}. Entry ID: ${typeof entry.id === 'object' ? entry.id.entry_id : entry.id}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries`, "POST", error.response?.data || {});
                }
            }
            // Handle removeRecordFromList tool
            if (toolType === 'removeRecordFromList') {
                const listId = request.params.arguments?.listId;
                const entryId = request.params.arguments?.entryId;
                try {
                    const success = await toolConfig.handler(listId, entryId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: success
                                    ? `Successfully removed entry ${entryId} from list ${listId}`
                                    : `Failed to remove entry ${entryId} from list ${listId}`,
                            },
                        ],
                        isError: !success,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries/${entryId}`, "DELETE", error.response?.data || {});
                }
            }
            // Handle record creation
            if (toolType === 'create') {
                const objectSlug = request.params.arguments?.objectSlug;
                const objectId = request.params.arguments?.objectId;
                const attributes = request.params.arguments?.attributes || {};
                try {
                    const recordCreateConfig = toolConfig;
                    const record = await recordCreateConfig.handler(objectSlug, attributes, objectId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Record created successfully in ${objectSlug}:\nID: ${record.id?.record_id || 'unknown'}\n${JSON.stringify(record, null, 2)}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records`, "POST", error.response?.data || {});
                }
            }
            // Handle record retrieval
            if (toolType === 'get') {
                const objectSlug = request.params.arguments?.objectSlug;
                const objectId = request.params.arguments?.objectId;
                const recordId = request.params.arguments?.recordId;
                const attributes = request.params.arguments?.attributes;
                try {
                    const recordGetConfig = toolConfig;
                    const record = await recordGetConfig.handler(objectSlug, recordId, attributes, objectId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Record details for ${objectSlug}/${recordId}:\n${JSON.stringify(record, null, 2)}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records/${recordId}`, "GET", error.response?.data || {});
                }
            }
            // Handle record update
            if (toolType === 'update') {
                const objectSlug = request.params.arguments?.objectSlug;
                const objectId = request.params.arguments?.objectId;
                const recordId = request.params.arguments?.recordId;
                const attributes = request.params.arguments?.attributes || {};
                try {
                    const recordUpdateConfig = toolConfig;
                    const record = await recordUpdateConfig.handler(objectSlug, recordId, attributes, objectId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Record updated successfully in ${objectSlug}:\nID: ${record.id?.record_id || 'unknown'}\n${JSON.stringify(record, null, 2)}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records/${recordId}`, "PATCH", error.response?.data || {});
                }
            }
            // Handle record deletion
            if (toolType === 'delete') {
                const objectSlug = request.params.arguments?.objectSlug;
                const objectId = request.params.arguments?.objectId;
                const recordId = request.params.arguments?.recordId;
                try {
                    const recordDeleteConfig = toolConfig;
                    const success = await recordDeleteConfig.handler(objectSlug, recordId, objectId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: success ?
                                    `Record ${recordId} deleted successfully from ${objectSlug}` :
                                    `Failed to delete record ${recordId} from ${objectSlug}`,
                            },
                        ],
                        isError: !success,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records/${recordId}`, "DELETE", error.response?.data || {});
                }
            }
            // Handle record listing
            if (toolType === 'list') {
                const objectSlug = request.params.arguments?.objectSlug;
                const objectId = request.params.arguments?.objectId;
                const options = { ...request.params.arguments };
                // Remove non-option properties
                delete options.objectSlug;
                delete options.objectId;
                try {
                    const recordListConfig = toolConfig;
                    const records = await recordListConfig.handler(objectSlug, options, objectId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Found ${records.length} records in ${objectSlug}:\n${records.map((record) => `- ${record.values?.name?.[0]?.value || '[Unnamed]'} (ID: ${record.id?.record_id || 'unknown'})`).join('\n')}`,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records`, "GET", error.response?.data || {});
                }
            }
            // Handle batch record creation
            if (toolType === 'batchCreate') {
                const objectSlug = request.params.arguments?.objectSlug;
                const objectId = request.params.arguments?.objectId;
                const records = Array.isArray(request.params.arguments?.records) ? request.params.arguments?.records : [];
                try {
                    const recordBatchCreateConfig = toolConfig;
                    const result = await recordBatchCreateConfig.handler(objectSlug, records, objectId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Batch create operation completed for ${objectSlug}:\n` +
                                    `Total: ${result.summary.total}, Succeeded: ${result.summary.succeeded}, Failed: ${result.summary.failed}\n` +
                                    `${result.results.map((r, i) => r.success
                                        ? `✅ Record ${i + 1}: Created successfully (ID: ${r.data?.id?.record_id || 'unknown'})`
                                        : `❌ Record ${i + 1}: Failed - ${r.error?.message || 'Unknown error'}`).join('\n')}`,
                            },
                        ],
                        isError: result.summary.failed > 0,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records/batch`, "POST", error.response?.data || {});
                }
            }
            // Handle advancedSearch tools (for both people and companies)
            if (toolType === 'searchByCreationDate' ||
                toolType === 'searchByModificationDate' ||
                toolType === 'searchByLastInteraction' ||
                toolType === 'searchByActivity') {
                try {
                    const advancedSearchConfig = toolConfig;
                    let results = [];
                    // Parse or extract parameters based on tool type
                    if (toolType === 'searchByCreationDate' || toolType === 'searchByModificationDate') {
                        // Handle date range parameter
                        let dateRange = request.params.arguments?.dateRange;
                        const limit = Number(request.params.arguments?.limit) || 20;
                        const offset = Number(request.params.arguments?.offset) || 0;
                        // If dateRange is a string, try to parse it as JSON
                        if (typeof dateRange === 'string') {
                            try {
                                dateRange = JSON.parse(dateRange);
                            }
                            catch (error) {
                                console.warn(`Failed to parse dateRange parameter: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                // Continue with the string, the handler will need to handle it
                            }
                        }
                        // Create a properly typed filter object if it's not already one
                        let filter = { filters: [] };
                        if (typeof dateRange === 'object' && dateRange !== null) {
                            filter = dateRange;
                        }
                        else {
                            filter = { filters: [{ attribute: { slug: 'created_at' }, condition: 'equals', value: dateRange }] };
                        }
                        const response = await advancedSearchConfig.handler(filter, limit, offset);
                        results = response || [];
                    }
                    else if (toolType === 'searchByLastInteraction') {
                        // Handle date range and interaction type parameters
                        let dateRange = request.params.arguments?.dateRange;
                        const interactionType = request.params.arguments?.interactionType;
                        const limit = Number(request.params.arguments?.limit) || 20;
                        const offset = Number(request.params.arguments?.offset) || 0;
                        // If dateRange is a string, try to parse it as JSON
                        if (typeof dateRange === 'string') {
                            try {
                                dateRange = JSON.parse(dateRange);
                            }
                            catch (error) {
                                console.warn(`Failed to parse dateRange parameter: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                // Continue with the string, the handler will need to handle it
                            }
                        }
                        // Create a properly typed filter object
                        let filter = { filters: [] };
                        // Construct proper filter based on date range and interaction type
                        filter = {
                            filters: [
                                { attribute: { slug: 'last_interaction' }, condition: 'equals', value: dateRange },
                                ...(interactionType ? [{ attribute: { slug: 'interaction_type' }, condition: 'equals', value: interactionType }] : [])
                            ]
                        };
                        const response = await advancedSearchConfig.handler(filter, limit, offset);
                        results = response || [];
                    }
                    else if (toolType === 'searchByActivity') {
                        // Handle activity filter parameter
                        let activityFilter = request.params.arguments?.activityFilter;
                        const limit = Number(request.params.arguments?.limit) || 20;
                        const offset = Number(request.params.arguments?.offset) || 0;
                        // If activityFilter is a string, try to parse it as JSON
                        if (typeof activityFilter === 'string') {
                            try {
                                activityFilter = JSON.parse(activityFilter);
                            }
                            catch (error) {
                                console.warn(`Failed to parse activityFilter parameter: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                // Continue with the string, the handler will need to handle it
                            }
                        }
                        // Create a properly typed filter object
                        let filter = { filters: [] };
                        if (typeof activityFilter === 'object' && activityFilter !== null) {
                            filter = {
                                filters: [
                                    { attribute: { slug: 'created_at' }, condition: 'equals', value: activityFilter }
                                ]
                            };
                        }
                        else {
                            filter = { filters: [{ attribute: { slug: 'created_at' }, condition: 'equals', value: activityFilter }] };
                        }
                        const response = await advancedSearchConfig.handler(filter, limit, offset);
                        results = response || [];
                    }
                    // Format and return results
                    const formattedResults = advancedSearchConfig.formatResult(results);
                    return {
                        content: [
                            {
                                type: "text",
                                text: formattedResults,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    let errorDetailsForCreateResult = {};
                    if (error instanceof ValueMatchError) {
                        // If it's a ValueMatchError, its message is already enhanced.
                        // We want to pass the original error's response data if available for full context in createErrorResult
                        if (axios.isAxiosError(error.originalError) && error.originalError.response) {
                            errorDetailsForCreateResult = error.originalError.response.data;
                        }
                        else {
                            // Fallback if originalError is not an Axios error or has no response data
                            errorDetailsForCreateResult = error.details || {};
                        }
                    }
                    else if (axios.isAxiosError(error) && error.response) {
                        errorDetailsForCreateResult = error.response.data;
                    }
                    else if (error instanceof Error && error.details) {
                        errorDetailsForCreateResult = error.details;
                    }
                    else {
                        // Minimal fallback
                        errorDetailsForCreateResult = { message: error?.message || 'Unknown error details' };
                    }
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error caught in advancedSearch"), `/objects/${resourceType}/records/query`, "POST", errorDetailsForCreateResult);
                }
            }
            // Handle batch record updates
            if (toolType === 'batchUpdate') {
                const objectSlug = request.params.arguments?.objectSlug;
                const objectId = request.params.arguments?.objectId;
                const records = Array.isArray(request.params.arguments?.records) ? request.params.arguments?.records : [];
                try {
                    const recordBatchUpdateConfig = toolConfig;
                    const result = await recordBatchUpdateConfig.handler(objectSlug, records, objectId);
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Batch update operation completed for ${objectSlug}:\n` +
                                    `Total: ${result.summary.total}, Succeeded: ${result.summary.succeeded}, Failed: ${result.summary.failed}\n` +
                                    `${result.results.map((r) => r.success
                                        ? `✅ Record ${r.id}: Updated successfully`
                                        : `❌ Record ${r.id}: Failed - ${r.error?.message || 'Unknown error'}`).join('\n')}`,
                            },
                        ],
                        isError: result.summary.failed > 0,
                    };
                }
                catch (error) {
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records/batch`, "PATCH", error.response?.data || {});
                }
            }
            // Handle advanced search tools
            if (toolType === 'advancedSearch') {
                const filters = request.params.arguments?.filters;
                // Convert parameters to the correct type
                let limit;
                let offset;
                if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
                    limit = Number(request.params.arguments.limit);
                }
                if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
                    offset = Number(request.params.arguments.offset);
                }
                // Import the attribute mapping utility
                const { translateAttributeNamesInFilters } = await import("../utils/attribute-mapping/index.js");
                // Translate any human-readable attribute names to their slug equivalents
                // Pass resourceType for object-specific mappings
                const translatedFilters = translateAttributeNamesInFilters(filters, resourceType);
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[advancedSearch ${resourceType}] Processing request with parameters:`, {
                        originalFilters: JSON.stringify(filters),
                        translatedFilters: JSON.stringify(translatedFilters),
                        limit,
                        offset
                    });
                }
                try {
                    const advancedSearchToolConfig = toolConfig;
                    const results = await advancedSearchToolConfig.handler(translatedFilters, limit, offset);
                    const formattedResults = advancedSearchToolConfig.formatResult(results);
                    return {
                        content: [
                            {
                                type: "text",
                                text: formattedResults,
                            },
                        ],
                        isError: false,
                    };
                }
                catch (error) {
                    let errorDetailsForCreateResult = {};
                    if (error instanceof ValueMatchError) {
                        // If it's a ValueMatchError, its message is already enhanced.
                        // We want to pass the original error's response data if available for full context in createErrorResult
                        if (axios.isAxiosError(error.originalError) && error.originalError.response) {
                            errorDetailsForCreateResult = error.originalError.response.data;
                        }
                        else {
                            // Fallback if originalError is not an Axios error or has no response data
                            errorDetailsForCreateResult = error.details || {};
                        }
                    }
                    else if (axios.isAxiosError(error) && error.response) {
                        errorDetailsForCreateResult = error.response.data;
                    }
                    else if (error instanceof Error && error.details) {
                        errorDetailsForCreateResult = error.details;
                    }
                    else {
                        // Minimal fallback
                        errorDetailsForCreateResult = { message: error?.message || 'Unknown error details' };
                    }
                    return createErrorResult(error instanceof Error ? error : new Error("Unknown error caught in advancedSearch"), `/objects/${resourceType}/records/query`, "POST", errorDetailsForCreateResult);
                }
            }
            throw new Error(`Tool handler not implemented for tool type: ${toolType}`);
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error executing tool '${toolName}': ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=tools.js.map