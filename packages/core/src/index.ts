/**
 * @attio-mcp/core
 *
 * Edge-compatible core library for Attio MCP Server
 * Works in Node.js 18+, Cloudflare Workers, Deno, and browsers
 */

// API exports
export { createFetchClient, createAttioClient } from './api/index.js';
export type { HttpClient } from './api/index.js';

// Tools exports
export {
  // Definitions
  coreToolDefinitions,
  getToolDefinitions,
  getToolDefinition,
  // Handlers
  handleHealthCheck,
  handleSearchRecords,
  handleGetRecordDetails,
  handleCreateRecord,
  handleUpdateRecord,
  handleDeleteRecord,
  handleDiscoverAttributes,
  handleCreateNote,
  handleListNotes,
  getToolHandler,
  // Registry
  createToolRegistry,
  defaultRegistry,
} from './tools/index.js';
export type { ToolDefinition, ToolRegistry } from './tools/index.js';

// Phone validation exports
export {
  validatePhoneNumber,
  toE164,
  hasCountryCode,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  normalizePhoneForAttio,
  PhoneValidationError,
} from './utils/index.js';
export type {
  PhoneValidationResult,
  PhoneValidationConfig,
  PhoneValidationErrorCode,
} from './utils/index.js';

// Type exports
export type {
  ResourceType,
  JsonObject,
  AttioRecordId,
  AttioFieldValue,
  AttioRecordValues,
  AttioRecord,
  AttioList,
  AttioListEntry,
  AttioNote,
  FilterCondition,
  AttioFilter,
  AttioFilterConfig,
  PaginationOptions,
  AttioApiResponse,
  ToolResult,
  ToolMode,
  ToolRegistryConfig,
  HttpClientConfig,
  HttpResponse,
  HttpError,
  PhoneConfig,
  ToolHandlerConfig,
} from './types/index.js';
