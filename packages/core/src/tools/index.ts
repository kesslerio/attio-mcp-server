/**
 * Tools module exports
 */

// Definitions
export {
  coreToolDefinitions,
  getToolDefinitions,
  getToolDefinition,
  healthCheckDefinition,
  searchRecordsDefinition,
  getRecordDetailsDefinition,
  createRecordDefinition,
  updateRecordDefinition,
  deleteRecordDefinition,
  discoverAttributesDefinition,
  createNoteDefinition,
  listNotesDefinition,
} from './definitions.js';
export type { ToolDefinition } from './definitions.js';

// Handlers
export {
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
} from './handlers.js';

// Registry
export { createToolRegistry, defaultRegistry } from './registry.js';
export type { ToolRegistry } from './registry.js';
