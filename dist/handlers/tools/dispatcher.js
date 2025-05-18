import { createErrorResult } from "../../utils/error-handler.js";
import { ValueMatchError } from "../../errors/value-match-error.js";
import { parseResourceUri } from "../../utils/uri-parser.js";
import { ResourceType } from "../../types/attio.js";
import { processListEntries } from "../../utils/record-utils.js";
import { hasResponseData } from "./error-types.js";
// Import tool configurations
import { findToolConfig } from "./registry.js";
import { formatResponse, formatBatchResults } from "./formatters.js";
// Import attribute mapping upfront to avoid dynamic import
import { translateAttributeNamesInFilters } from "../../utils/attribute-mapping/index.js";
/**
 * Handle common search operations
 *
 * @param toolType - The type of search tool
 * @param searchConfig - The search tool configuration
 * @param searchParam - The search parameter
 * @param resourceType - The resource type being searched
 * @returns Formatted response
 */
async function handleSearchOperation(toolType, searchConfig, searchParam, resourceType) {
    try {
        const results = await searchConfig.handler(searchParam);
        const formattedResults = searchConfig.formatResult(results);
        if (toolType === 'search') {
            return formatResponse(`Found ${results.length} ${resourceType}:\n${formattedResults}`);
        }
        return formatResponse(formattedResults);
    }
    catch (error) {
        return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/objects/${resourceType}/records/query`, "POST", hasResponseData(error) ? error.response.data : {});
    }
}
/**
 * Execute a tool request and return formatted results
 *
 * @param request - The tool request to execute
 * @returns Tool execution result
 */
export async function executeToolRequest(request) {
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
            return handleSearchOperation(toolType, toolConfig, query, resourceType);
        }
        // Handle searchByEmail tools
        if (toolType === 'searchByEmail') {
            const email = request.params.arguments?.email;
            return handleSearchOperation(toolType, toolConfig, email, resourceType);
        }
        // Handle searchByPhone tools
        if (toolType === 'searchByPhone') {
            const phone = request.params.arguments?.phone;
            return handleSearchOperation(toolType, toolConfig, phone, resourceType);
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
                return createErrorResult(new Error("Either companyId/personId or uri parameter is required"), `/${resourceType}`, "GET", { status: 400, message: "Missing required parameter" });
            }
            try {
                const detailsToolConfig = toolConfig;
                const record = await detailsToolConfig.handler(id);
                const formattedResult = detailsToolConfig.formatResult(record);
                return formatResponse(formattedResult);
            }
            catch (error) {
                return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), uri, "GET", hasResponseData(error) ? error.response.data : {});
            }
        }
        // Handle notes tools
        if (toolType === 'notes') {
            const notesId = request.params.arguments?.notesId;
            const uri = request.params.arguments?.uri;
            if (!notesId && !uri) {
                return createErrorResult(new Error("Either notesId or uri parameter is required"), `/${resourceType}/notes`, "GET", { status: 400, message: "Missing required parameter" });
            }
            try {
                let notesTargetId = notesId;
                let notesResourceType = resourceType;
                if (uri) {
                    try {
                        const [uriType, uriId] = parseResourceUri(uri);
                        notesResourceType = uriType;
                        notesTargetId = uriId;
                    }
                    catch (error) {
                        return createErrorResult(error instanceof Error ? error : new Error("Invalid URI format"), uri, "GET", { status: 400, message: "Invalid URI format" });
                    }
                }
                const notesToolConfig = toolConfig;
                const notes = await notesToolConfig.handler(notesTargetId);
                const formattedResult = notesToolConfig.formatResult(notes);
                return formatResponse(formattedResult);
            }
            catch (error) {
                return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), uri || `/${resourceType}/${notesId}/notes`, "GET", hasResponseData(error) ? error.response.data : {});
            }
        }
        // Handle createNote tools
        if (toolType === 'createNote') {
            const notesId = request.params.arguments?.notesId;
            const uri = request.params.arguments?.uri;
            const title = request.params.arguments?.title;
            const content = request.params.arguments?.content;
            if (!title || !content) {
                return createErrorResult(new Error("Both title and content are required"), `/${resourceType}/notes`, "POST", { status: 400, message: "Missing required parameters" });
            }
            if (!notesId && !uri) {
                return createErrorResult(new Error("Either notesId or uri parameter is required"), `/${resourceType}/notes`, "POST", { status: 400, message: "Missing required parameter" });
            }
            try {
                let noteTargetId = notesId;
                let noteResourceType = resourceType;
                if (uri) {
                    try {
                        const [uriType, uriId] = parseResourceUri(uri);
                        noteResourceType = uriType;
                        noteTargetId = uriId;
                    }
                    catch (error) {
                        return createErrorResult(error instanceof Error ? error : new Error("Invalid URI format"), uri, "POST", { status: 400, message: "Invalid URI format" });
                    }
                }
                const createNoteToolConfig = toolConfig;
                const note = await createNoteToolConfig.handler(noteTargetId, title, content);
                const formattedResult = createNoteToolConfig.formatResult(note);
                return formatResponse(formattedResult);
            }
            catch (error) {
                return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), uri || `/${resourceType}/${notesId}/notes`, "POST", hasResponseData(error) ? error.response.data : {});
            }
        }
        // Handle getLists tool
        if (toolType === 'getLists') {
            try {
                const getListsToolConfig = toolConfig;
                const lists = await getListsToolConfig.handler();
                const formattedResult = getListsToolConfig.formatResult(lists);
                return formatResponse(formattedResult);
            }
            catch (error) {
                return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), "/lists", "GET", hasResponseData(error) ? error.response.data : {});
            }
        }
        // Handle getListEntries tool
        if (toolType === 'getListEntries') {
            const listId = request.params.arguments?.listId;
            // Convert parameters to the correct type
            let limit;
            let offset;
            if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
                limit = Number(request.params.arguments.limit);
            }
            if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
                offset = Number(request.params.arguments.offset);
            }
            try {
                const getListEntriesToolConfig = toolConfig;
                const entries = await getListEntriesToolConfig.handler(listId);
                const formattedResult = getListEntriesToolConfig.formatResult(entries);
                return formatResponse(formattedResult);
            }
            catch (error) {
                return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries`, "GET", hasResponseData(error) ? error.response.data : {});
            }
        }
        // Handle filterListEntries tool
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
                return formatResponse(formattedResults);
            }
            catch (error) {
                return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries/query`, "POST", hasResponseData(error) ? error.response.data : {});
            }
        }
        // Handle addRecordToList tool
        if (toolType === 'addRecordToList') {
            const listId = request.params.arguments?.listId;
            const recordId = request.params.arguments?.recordId;
            try {
                const entry = await toolConfig.handler(listId, recordId);
                return formatResponse(`Record ${recordId} added to list ${listId}. Entry ID: ${typeof entry.id === 'object' ? entry.id.entry_id : entry.id}`);
            }
            catch (error) {
                return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries`, "POST", hasResponseData(error) ? error.response.data : {});
            }
        }
        // Handle removeRecordFromList tool
        if (toolType === 'removeRecordFromList') {
            const listId = request.params.arguments?.listId;
            const entryId = request.params.arguments?.entryId;
            try {
                const success = await toolConfig.handler(listId, entryId);
                return formatResponse(success
                    ? `Successfully removed entry ${entryId} from list ${listId}`
                    : `Failed to remove entry ${entryId} from list ${listId}`, !success);
            }
            catch (error) {
                return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `/lists/${listId}/entries/${entryId}`, "DELETE", hasResponseData(error) ? error.response.data : {});
            }
        }
        // Handle record operations
        if (['create', 'get', 'update', 'delete', 'list', 'batchCreate', 'batchUpdate'].includes(toolType)) {
            return await executeRecordOperation(toolType, toolConfig, request, resourceType);
        }
        // Handle advanced search and date-based tools
        if (['advancedSearch', 'searchByCreationDate', 'searchByModificationDate', 'searchByLastInteraction', 'searchByActivity'].includes(toolType)) {
            return await executeAdvancedSearch(toolType, toolConfig, request, resourceType);
        }
        throw new Error(`Tool handler not implemented for tool type: ${toolType}`);
    }
    catch (error) {
        return formatResponse(`Error executing tool '${toolName}': ${error.message}`, true);
    }
}
/**
 * Execute record-specific operations
 */
async function executeRecordOperation(toolType, toolConfig, request, resourceType) {
    const objectSlug = request.params.arguments?.objectSlug;
    const objectId = request.params.arguments?.objectId;
    // Handle tool types based on specific operation
    if (toolType === 'create') {
        const recordData = request.params.arguments?.recordData;
        try {
            const recordCreateConfig = toolConfig;
            const record = await recordCreateConfig.handler(objectSlug, recordData, objectId);
            return formatResponse(`Successfully created ${objectSlug} record with ID: ${record.id?.record_id || 'Unknown'}`);
        }
        catch (error) {
            return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records`, "POST", error.response?.data || {});
        }
    }
    if (toolType === 'batchCreate') {
        const records = Array.isArray(request.params.arguments?.records) ? request.params.arguments?.records : [];
        try {
            const recordBatchCreateConfig = toolConfig;
            const result = await recordBatchCreateConfig.handler(objectSlug, records, objectId);
            return formatResponse(formatBatchResults(result, 'create'));
        }
        catch (error) {
            return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records/batch`, "POST", error.response?.data || {});
        }
    }
    if (toolType === 'batchUpdate') {
        const records = Array.isArray(request.params.arguments?.records) ? request.params.arguments?.records : [];
        try {
            const recordBatchUpdateConfig = toolConfig;
            const result = await recordBatchUpdateConfig.handler(objectSlug, records, objectId);
            return formatResponse(formatBatchResults(result, 'update'), result.summary.failed > 0);
        }
        catch (error) {
            return createErrorResult(error instanceof Error ? error : new Error("Unknown error"), `objects/${objectSlug}/records/batch`, "PATCH", error.response?.data || {});
        }
    }
    // Add handlers for get, update, delete, list operations...
    throw new Error(`Record operation handler not implemented for tool type: ${toolType}`);
}
/**
 * Execute advanced search operations
 */
async function executeAdvancedSearch(toolType, toolConfig, request, resourceType) {
    const advancedSearchConfig = toolConfig;
    let results = [];
    try {
        // Handle different types of advanced search
        if (toolType === 'searchByCreationDate' || toolType === 'searchByModificationDate') {
            let dateRange = request.params.arguments?.dateRange;
            const limit = Number(request.params.arguments?.limit) || 20;
            const offset = Number(request.params.arguments?.offset) || 0;
            // Parse dateRange if it's a string
            if (typeof dateRange === 'string') {
                try {
                    dateRange = JSON.parse(dateRange);
                }
                catch (error) {
                    console.warn(`Failed to parse dateRange parameter: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
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
        else if (toolType === 'advancedSearch') {
            const filters = request.params.arguments?.filters;
            let limit;
            let offset;
            if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
                limit = Number(request.params.arguments.limit);
            }
            if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
                offset = Number(request.params.arguments.offset);
            }
            // Use the imported attribute mapping utility
            // Translate any human-readable attribute names to their slug equivalents
            const translatedFilters = translateAttributeNamesInFilters(filters, resourceType);
            const response = await advancedSearchConfig.handler(translatedFilters, limit, offset);
            results = response || [];
        }
        // Format and return results
        const formattedResults = advancedSearchConfig.formatResult(results);
        return formatResponse(formattedResults);
    }
    catch (error) {
        let errorDetailsForCreateResult = {};
        if (error instanceof ValueMatchError) {
            if (error.originalError && hasResponseData(error.originalError)) {
                errorDetailsForCreateResult = error.originalError.response.data;
            }
            else {
                errorDetailsForCreateResult = error.details || {};
            }
        }
        else if (hasResponseData(error)) {
            errorDetailsForCreateResult = error.response.data;
        }
        else if (error instanceof Error && error.details) {
            errorDetailsForCreateResult = error.details;
        }
        else {
            errorDetailsForCreateResult = { message: error?.message || 'Unknown error details' };
        }
        return createErrorResult(error instanceof Error ? error : new Error("Unknown error caught in advancedSearch"), `/objects/${resourceType}/records/query`, "POST", errorDetailsForCreateResult);
    }
}
//# sourceMappingURL=dispatcher.js.map