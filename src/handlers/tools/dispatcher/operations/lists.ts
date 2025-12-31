/**
 * List operation handlers for tool execution
 *
 * Handles list-related operations including adding/removing records from lists
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { ToolConfig, GetListsToolConfig } from '../../../tool-types.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';
import {
  filterListEntries,
  advancedFilterListEntries,
  filterListEntriesByParent,
  filterListEntriesByParentId,
} from '../../../../objects/lists/filtering.js';
import {
  addRecordToList,
  removeRecordFromList,
  updateListEntry,
} from '../../../../objects/lists/entries.js';
import { ListEntryFilters } from '../../../../api/operations/index.js';

/**
 * Handle getLists operations
 */
export async function handleGetListsOperation(
  request: CallToolRequest,
  toolConfig: GetListsToolConfig
) {
  try {
    const lists = await toolConfig.handler();
    const formattedResult = toolConfig.formatResult!(lists);

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      '/lists',
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle addRecordToList operations
 *
 * This function extracts parameters from the tool request and passes them to the handler.
 * It supports both required parameters (listId, recordId) and optional parameters
 * (objectType, initialValues) needed for proper API payload construction.
 *
 * @param request - The tool request containing parameters
 * @param toolConfig - The tool configuration with handler function
 * @returns Formatted response with success or error information
 */
export async function handleAddRecordToListOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const recordId = request.params.arguments?.recordId as string;
  const objectType = request.params.arguments?.objectType as string | undefined;
  const initialValues = request.params.arguments?.initialValues as
    | Record<string, unknown>
    | undefined;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'POST',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!recordId) {
    return createErrorResult(
      new Error('recordId parameter is required'),
      `/lists/${listId}/records`,
      'POST',
      { status: 400, message: 'Missing required parameter: recordId' }
    );
  }

  try {
    // Pass objectType and initialValues to the handler function
    const result = await toolConfig.handler(
      listId,
      recordId,
      objectType,
      initialValues
    );
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : `Successfully added record ${recordId} to list ${listId}`;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/records`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle removeRecordFromList operations
 */
export async function handleRemoveRecordFromListOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const entryId = request.params.arguments?.entryId as string;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'DELETE',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!entryId) {
    return createErrorResult(
      new Error('entryId parameter is required'),
      `/lists/${listId}/entries`,
      'DELETE',
      { status: 400, message: 'Missing required parameter: entryId' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, entryId);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : `Successfully removed entry ${entryId} from list ${listId}`;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries/${entryId}`,
      'DELETE',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle updateListEntry operations
 */
export async function handleUpdateListEntryOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const entryId = request.params.arguments?.entryId as string;
  const attributes = request.params.arguments?.attributes;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'PUT',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!entryId) {
    return createErrorResult(
      new Error('entryId parameter is required'),
      `/lists/${listId}/entries`,
      'PUT',
      { status: 400, message: 'Missing required parameter: entryId' }
    );
  }

  if (!attributes || typeof attributes !== 'object') {
    return createErrorResult(
      new Error('attributes parameter is required and must be an object'),
      `/lists/${listId}/entries/${entryId}`,
      'PUT',
      { status: 400, message: 'Missing or invalid attributes parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, entryId, attributes);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries/${entryId}`,
      'PUT',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Management mode type for unified manage-list-entry tool
 */
type ManagementMode = 'add' | 'remove' | 'update';

/**
 * Detects which management mode to use based on parameters provided
 *
 * Mode detection priority (most specific to least specific):
 * 1. Add (recordId + objectType) - Mode 1
 * 2. Update (entryId + attributes) - Mode 3
 * 3. Remove (entryId only) - Mode 2
 *
 * @param params - Request parameters
 * @returns ManagementMode
 * @throws Error if no mode or multiple modes detected
 */
function detectManagementMode(params: Record<string, unknown>): ManagementMode {
  const hasRecordId = 'recordId' in params && params.recordId !== undefined;
  const hasObjectType =
    'objectType' in params && params.objectType !== undefined;
  const hasEntryId = 'entryId' in params && params.entryId !== undefined;
  const hasAttributes =
    'attributes' in params && params.attributes !== undefined;

  // Count mode indicators
  const isAddMode = hasRecordId && hasObjectType;
  const isUpdateMode = hasEntryId && hasAttributes;
  const isRemoveMode = hasEntryId && !hasAttributes;

  const modesDetected = [isAddMode, isUpdateMode, isRemoveMode].filter(
    Boolean
  ).length;

  if (modesDetected === 0) {
    // Provide more helpful error messages for common edge cases
    if (hasRecordId && !hasObjectType) {
      throw new Error(
        'Mode 1 (Add) requires both recordId AND objectType.\n' +
          'You provided recordId but missing objectType (must be "companies" or "people").\n' +
          'Example: { listId: "...", recordId: "...", objectType: "companies" }'
      );
    }
    if (hasObjectType && !hasRecordId) {
      throw new Error(
        'Mode 1 (Add) requires both recordId AND objectType.\n' +
          'You provided objectType but missing recordId.\n' +
          'Example: { listId: "...", recordId: "...", objectType: "companies" }'
      );
    }

    throw new Error(
      'No management mode detected. Must provide parameters for one of:\n' +
        '  - Mode 1 (Add): recordId, objectType, [initialValues]\n' +
        '  - Mode 2 (Remove): entryId (only)\n' +
        '  - Mode 3 (Update): entryId, attributes\n' +
        'See tool description for details on each mode.'
    );
  }

  if (modesDetected > 1) {
    throw new Error(
      'Multiple management modes detected. Provide parameters for exactly ONE mode.\n' +
        'See tool description for details on parameter requirements for each mode.'
    );
  }

  // Priority: add > update > remove
  if (isAddMode) return 'add';
  if (isUpdateMode) return 'update';
  return 'remove';
}

/**
 * Handle manageListEntry operations (unified with 3 action modes)
 *
 * This unified handler supports 3 management modes:
 * - Mode 1 (Add): Add record to list
 * - Mode 2 (Remove): Remove entry from list
 * - Mode 3 (Update): Update entry attributes
 *
 * Mode is auto-detected based on parameters provided.
 */
export async function handleManageListEntryOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const params = request.params.arguments || {};
  const listId = params.listId as string;

  // Validate required listId parameter (common to all modes)
  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'POST',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  // Track HTTP method for error reporting (will be set based on detected mode)
  let httpMethod: 'POST' | 'DELETE' | 'PATCH' = 'POST';

  try {
    // Detect management mode
    const mode = detectManagementMode(params);

    // Map mode to HTTP method for error reporting
    httpMethod =
      mode === 'add' ? 'POST' : mode === 'remove' ? 'DELETE' : 'PATCH';

    // Route to appropriate handler based on mode
    let result;

    switch (mode) {
      case 'add': {
        // Mode 1: Add record to list
        const recordId = params.recordId as string;
        const objectType = params.objectType as string;
        const initialValues = params.initialValues as
          | Record<string, unknown>
          | undefined;

        // Validate Mode 1 parameters
        if (!recordId) {
          return createErrorResult(
            new Error('Mode 1 (Add): recordId parameter is required'),
            `/lists/${listId}/entries`,
            'POST',
            { status: 400, message: 'Mode 1 requires: recordId, objectType' }
          );
        }
        if (!objectType) {
          return createErrorResult(
            new Error('Mode 1 (Add): objectType parameter is required'),
            `/lists/${listId}/entries`,
            'POST',
            { status: 400, message: 'Mode 1 requires: recordId, objectType' }
          );
        }

        result = await addRecordToList(
          listId,
          recordId,
          objectType,
          initialValues
        );
        break;
      }

      case 'remove': {
        // Mode 2: Remove entry from list
        const entryId = params.entryId as string;

        // Validate Mode 2 parameters
        if (!entryId) {
          return createErrorResult(
            new Error('Mode 2 (Remove): entryId parameter is required'),
            `/lists/${listId}/entries`,
            'DELETE',
            { status: 400, message: 'Mode 2 requires: entryId' }
          );
        }

        result = await removeRecordFromList(listId, entryId);
        break;
      }

      case 'update': {
        // Mode 3: Update entry attributes
        const entryId = params.entryId as string;
        const attributes = params.attributes as Record<string, unknown>;

        // Validate Mode 3 parameters
        if (!entryId) {
          return createErrorResult(
            new Error('Mode 3 (Update): entryId parameter is required'),
            `/lists/${listId}/entries`,
            'PATCH',
            { status: 400, message: 'Mode 3 requires: entryId, attributes' }
          );
        }
        if (
          !attributes ||
          typeof attributes !== 'object' ||
          Array.isArray(attributes)
        ) {
          return createErrorResult(
            new Error(
              'Mode 3 (Update): attributes parameter is required and must be an object'
            ),
            `/lists/${listId}/entries`,
            'PATCH',
            {
              status: 400,
              message: 'Mode 3 requires: entryId, attributes (object)',
            }
          );
        }

        result = await updateListEntry(listId, entryId, attributes);
        break;
      }
    }

    // Format result based on mode
    // Add and Update return AttioListEntry, Remove returns boolean
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : mode === 'remove'
        ? JSON.stringify({
            success: true,
            message: `Entry removed from list ${listId}`,
          })
        : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      httpMethod,
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle filterListEntriesByParent operations
 *
 * This handler extracts the required parameters from the tool request and passes them
 * to the handler function for filtering list entries based on parent record properties.
 */
export async function handleFilterListEntriesByParentOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const parentObjectType = request.params.arguments?.parentObjectType as string;
  const parentAttributeSlug = request.params.arguments
    ?.parentAttributeSlug as string;
  const condition = request.params.arguments?.condition as string;
  const value = request.params.arguments?.value;
  const limit = request.params.arguments?.limit as number;
  const offset = request.params.arguments?.offset as number;

  // Validate required parameters
  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!parentObjectType) {
    return createErrorResult(
      new Error('parentObjectType parameter is required'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing required parameter: parentObjectType' }
    );
  }

  if (!parentAttributeSlug) {
    return createErrorResult(
      new Error('parentAttributeSlug parameter is required'),
      `/lists/${listId}/entries`,
      'GET',
      {
        status: 400,
        message: 'Missing required parameter: parentAttributeSlug',
      }
    );
  }

  if (!condition) {
    return createErrorResult(
      new Error('condition parameter is required'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing required parameter: condition' }
    );
  }

  if (value === undefined) {
    return createErrorResult(
      new Error('value parameter is required'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing required parameter: value' }
    );
  }

  try {
    // Call the handler function with all parameters
    const result = await toolConfig.handler(
      listId,
      parentObjectType,
      parentAttributeSlug,
      condition,
      value,
      limit,
      offset
    );

    // Format the result using the configured formatter
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle filterListEntriesByParentId operations
 *
 * This handler extracts the required parameters from the tool request and passes them
 * to the handler function for filtering list entries by parent record ID.
 */
export async function handleFilterListEntriesByParentIdOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const recordId = request.params.arguments?.recordId as string;
  const limit = request.params.arguments?.limit as number;
  const offset = request.params.arguments?.offset as number;

  // Validate required parameters
  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!recordId) {
    return createErrorResult(
      new Error('recordId parameter is required'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing required parameter: recordId' }
    );
  }

  try {
    // Call the handler function with all parameters
    const result = await toolConfig.handler(listId, recordId, limit, offset);

    // Format the result using the configured formatter
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle getListDetails operations
 */
export async function handleGetListDetailsOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  try {
    const result = await toolConfig.handler(listId);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle getListEntries operations
 */
export async function handleGetListEntriesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const limit = request.params.arguments?.limit as number;
  const offset = request.params.arguments?.offset as number;
  const filters = request.params.arguments?.filters;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, limit, offset, filters);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Filter mode type for unified filter-list-entries tool
 */
type FilterMode = 'simple' | 'advanced' | 'parent-attribute' | 'parent-uuid';

/**
 * Detects which filter mode to use based on parameters provided
 *
 * Mode detection priority (most specific to least specific):
 * 1. Parent UUID (parentRecordId) - Mode 4
 * 2. Parent Attribute (parentObjectType + parentAttributeSlug) - Mode 3
 * 3. Advanced (filters object) - Mode 2
 * 4. Simple (attributeSlug) - Mode 1
 *
 * @param params - Request parameters
 * @returns FilterMode
 * @throws Error if no mode or multiple modes detected
 */
function detectFilterMode(params: Record<string, unknown>): FilterMode {
  const hasParentRecordId =
    'parentRecordId' in params && params.parentRecordId !== undefined;
  const hasParentAttrs =
    'parentObjectType' in params &&
    params.parentObjectType !== undefined &&
    'parentAttributeSlug' in params &&
    params.parentAttributeSlug !== undefined;
  const hasFilters =
    'filters' in params &&
    typeof params.filters === 'object' &&
    params.filters !== null;
  const hasAttributeSlug =
    'attributeSlug' in params && params.attributeSlug !== undefined;

  // Count how many modes detected
  const modesDetected = [
    hasParentRecordId,
    hasParentAttrs,
    hasFilters,
    hasAttributeSlug,
  ].filter(Boolean).length;

  if (modesDetected === 0) {
    throw new Error(
      'No filter mode detected. Must provide parameters for one of:\n' +
        '  - Mode 1 (Simple): attributeSlug, condition, value\n' +
        '  - Mode 2 (Advanced): filters (object with filters array)\n' +
        '  - Mode 3 (Parent Attribute): parentObjectType, parentAttributeSlug, condition, value\n' +
        '  - Mode 4 (Parent UUID): parentRecordId\n' +
        'See tool description for details on each mode.'
    );
  }

  if (modesDetected > 1) {
    throw new Error(
      'Multiple filter modes detected. Provide parameters for exactly ONE mode.\n' +
        'See tool description for details on parameter requirements for each mode.'
    );
  }

  // Return detected mode (priority order: most specific to least specific)
  if (hasParentRecordId) return 'parent-uuid';
  if (hasParentAttrs) return 'parent-attribute';
  if (hasFilters) return 'advanced';
  return 'simple';
}

/**
 * Handle filterListEntries operations (unified with 4 parameter modes)
 *
 * This unified handler supports 4 filtering modes:
 * - Mode 1 (Simple): Single attribute filtering
 * - Mode 2 (Advanced): Multi-condition AND/OR filtering
 * - Mode 3 (Parent Attribute): Filter by parent record attributes
 * - Mode 4 (Parent UUID): Filter by exact parent record UUID
 *
 * Mode is auto-detected based on parameters provided.
 */
export async function handleFilterListEntriesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const params = request.params.arguments || {};
  const listId = params.listId as string;
  const limit = params.limit as number;
  const offset = params.offset as number;

  // Validate required listId parameter (common to all modes)
  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  try {
    // Detect filter mode
    const mode = detectFilterMode(params);

    // Route to appropriate handler based on mode
    let result;

    switch (mode) {
      case 'simple': {
        // Mode 1: Simple filtering
        const attributeSlug = params.attributeSlug as string;
        const condition = params.condition as string;
        const value = params.value;

        // Validate Mode 1 parameters
        if (!attributeSlug) {
          return createErrorResult(
            new Error('Mode 1 (Simple): attributeSlug parameter is required'),
            `/lists/${listId}/entries`,
            'GET',
            {
              status: 400,
              message: 'Mode 1 requires: attributeSlug, condition, value',
            }
          );
        }
        if (!condition) {
          return createErrorResult(
            new Error('Mode 1 (Simple): condition parameter is required'),
            `/lists/${listId}/entries`,
            'GET',
            {
              status: 400,
              message: 'Mode 1 requires: attributeSlug, condition, value',
            }
          );
        }
        if (value === undefined) {
          return createErrorResult(
            new Error('Mode 1 (Simple): value parameter is required'),
            `/lists/${listId}/entries`,
            'GET',
            {
              status: 400,
              message: 'Mode 1 requires: attributeSlug, condition, value',
            }
          );
        }

        result = await filterListEntries(
          listId,
          attributeSlug,
          condition,
          value,
          limit,
          offset
        );
        break;
      }

      case 'advanced': {
        // Mode 2: Advanced multi-condition filtering
        const filters = params.filters as ListEntryFilters;

        // Validate Mode 2 parameters
        if (!filters || typeof filters !== 'object') {
          return createErrorResult(
            new Error(
              'Mode 2 (Advanced): filters parameter is required and must be an object'
            ),
            `/lists/${listId}/entries`,
            'GET',
            {
              status: 400,
              message: 'Mode 2 requires: filters (object with filters array)',
            }
          );
        }

        result = await advancedFilterListEntries(
          listId,
          filters,
          limit,
          offset
        );
        break;
      }

      case 'parent-attribute': {
        // Mode 3: Parent attribute filtering
        const parentObjectType = params.parentObjectType as string;
        const parentAttributeSlug = params.parentAttributeSlug as string;
        const condition = params.condition as string;
        const value = params.value;

        // Validate Mode 3 parameters
        if (!parentObjectType) {
          return createErrorResult(
            new Error(
              'Mode 3 (Parent Attribute): parentObjectType parameter is required'
            ),
            `/lists/${listId}/entries`,
            'GET',
            {
              status: 400,
              message:
                'Mode 3 requires: parentObjectType, parentAttributeSlug, condition, value',
            }
          );
        }
        if (!parentAttributeSlug) {
          return createErrorResult(
            new Error(
              'Mode 3 (Parent Attribute): parentAttributeSlug parameter is required'
            ),
            `/lists/${listId}/entries`,
            'GET',
            {
              status: 400,
              message:
                'Mode 3 requires: parentObjectType, parentAttributeSlug, condition, value',
            }
          );
        }
        if (!condition) {
          return createErrorResult(
            new Error(
              'Mode 3 (Parent Attribute): condition parameter is required'
            ),
            `/lists/${listId}/entries`,
            'GET',
            {
              status: 400,
              message:
                'Mode 3 requires: parentObjectType, parentAttributeSlug, condition, value',
            }
          );
        }
        if (value === undefined) {
          return createErrorResult(
            new Error('Mode 3 (Parent Attribute): value parameter is required'),
            `/lists/${listId}/entries`,
            'GET',
            {
              status: 400,
              message:
                'Mode 3 requires: parentObjectType, parentAttributeSlug, condition, value',
            }
          );
        }

        result = await filterListEntriesByParent(
          listId,
          parentObjectType,
          parentAttributeSlug,
          condition,
          value,
          limit,
          offset
        );
        break;
      }

      case 'parent-uuid': {
        // Mode 4: Parent UUID filtering
        const parentRecordId = params.parentRecordId as string;

        // Validate Mode 4 parameters
        if (!parentRecordId) {
          return createErrorResult(
            new Error(
              'Mode 4 (Parent UUID): parentRecordId parameter is required'
            ),
            `/lists/${listId}/entries`,
            'GET',
            { status: 400, message: 'Mode 4 requires: parentRecordId (UUID)' }
          );
        }

        result = await filterListEntriesByParentId(
          listId,
          parentRecordId,
          limit,
          offset
        );
        break;
      }
    }

    // Format result using tool config formatter
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle advancedFilterListEntries operations
 */
export async function handleAdvancedFilterListEntriesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const filters = request.params.arguments?.filters;
  const limit = request.params.arguments?.limit as number;
  const offset = request.params.arguments?.offset as number;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!filters || typeof filters !== 'object') {
    return createErrorResult(
      new Error('filters parameter is required and must be an object'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing or invalid filters parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, filters, limit, offset);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle getRecordListMemberships operations
 *
 * This handler extracts the required parameters from the tool request and passes them
 * to the handler function for finding all lists that contain a specific record.
 */
export async function handleGetRecordListMembershipsOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const recordId = request.params.arguments?.recordId as string;
  const objectType = request.params.arguments?.objectType as string;
  const includeEntryValues = request.params.arguments
    ?.includeEntryValues as boolean;
  const batchSize = request.params.arguments?.batchSize as number;

  if (!recordId) {
    return createErrorResult(
      new Error('recordId parameter is required'),
      '/lists/memberships',
      'GET',
      { status: 400, message: 'Missing required parameter: recordId' }
    );
  }

  try {
    const result = await toolConfig.handler(
      recordId,
      objectType,
      includeEntryValues,
      batchSize
    );
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      '/lists/memberships',
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
