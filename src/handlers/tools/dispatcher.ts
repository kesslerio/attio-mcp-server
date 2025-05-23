/**
 * Tool dispatcher module - handles tool execution dispatch and routing
 * 
 * This module re-exports from the modular dispatcher implementation for backward compatibility.
 * The actual implementation has been broken down into focused modules under ./dispatcher/
 */

// Re-export the main executeToolRequest function from the modular implementation
export { executeToolRequest } from './dispatcher/core.js';

// Re-export utility functions from the modular implementation for backward compatibility
export { logToolRequest, logToolError } from './dispatcher/logging.js';
export { validateAttributes, validateResourceId } from './dispatcher/validation.js';
export { formatSuccessResponse } from './dispatcher/formatting.js';

// The remaining operations will be incrementally moved to the modular implementation
// For now, we include the legacy implementation as fallback for unimplemented operations

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../utils/error-handler.js';
import { ValueMatchError } from '../../errors/value-match-error.js';
import { parseResourceUri } from '../../utils/uri-parser.js';
import { ResourceType, AttioRecord } from '../../types/attio.js';
import { ListEntryFilters } from '../../api/operations/index.js';
import { processListEntries } from '../../utils/record-utils.js';
import { ApiError, isApiError, hasResponseData } from './error-types.js';
import { safeJsonStringify } from '../../utils/json-serializer.js';
import {
  ToolExecutionRequest,
  ToolErrorContext,
  AttributeValidationParams,
  CompanyOperationResponse,
  ValidationResult,
  ToolRequestArguments
} from '../../types/tool-types.js';

// Import tool configurations
import { findToolConfig } from './registry.js';
import { formatResponse, formatBatchResults } from './formatters.js';

// Import attribute mapping upfront to avoid dynamic import
import { translateAttributeNamesInFilters } from '../../utils/attribute-mapping/index.js';

// Import tool type definitions
import {
  ToolConfig,
  SearchToolConfig,
  AdvancedSearchToolConfig,
  DetailsToolConfig,
  NotesToolConfig,
  CreateNoteToolConfig,
  GetListsToolConfig,
  GetListEntriesToolConfig,
  DateBasedSearchToolConfig,
} from '../tool-types.js';

// Import record tool types
import {
  RecordCreateToolConfig,
  RecordGetToolConfig,
  RecordUpdateToolConfig,
  RecordDeleteToolConfig,
  RecordListToolConfig,
  RecordBatchCreateToolConfig,
  RecordBatchUpdateToolConfig,
} from '../tool-configs/records/index.js';

// Export the legacy implementations that haven't been moved to modules yet
// These will be gradually moved to the appropriate operation modules

/**
 * Execute record-specific operations
 */
export async function executeRecordOperation(
  toolType: string,
  toolConfig: ToolConfig,
  request: CallToolRequest,
  resourceType: ResourceType
) {
  // This is a placeholder - the full implementation will be moved to operations/records.ts
  throw new Error(`Record operation handler not implemented for tool type: ${toolType}`);
}

/**
 * Execute relationship-based search operations
 */
export async function executeRelationshipSearch(
  toolType: string,
  toolConfig: ToolConfig,
  request: CallToolRequest,
  resourceType: ResourceType
) {
  // This is a placeholder - the full implementation will be moved to operations/relationships.ts
  throw new Error(`Relationship search handler not implemented for tool type: ${toolType}`);
}

/**
 * Execute advanced search operations
 */
export async function executeAdvancedSearch(
  toolType: string,
  toolConfig: ToolConfig,
  request: CallToolRequest,
  resourceType: ResourceType
) {
  // This is a placeholder - the full implementation will be moved to operations/advanced-search.ts
  throw new Error(`Advanced search handler not implemented for tool type: ${toolType}`);
}