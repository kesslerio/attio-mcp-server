/**
 * Central export point for all API operations
 * Maintains backward compatibility with the original attio-operations.ts
 */

// Re-export all batch operations
export {
  batchCreateRecords,
  batchGetObjectDetails,
  batchSearchObjects,
  batchUpdateRecords,
  DEFAULT_BATCH_CONFIG,
  executeBatchOperations,
} from './batch.js';
// Re-export all CRUD operations
export {
  createRecord,
  deleteRecord,
  getObjectDetails,
  getRecord,
  listRecords,
  updateRecord,
} from './crud.js';
// Re-export all list operations
export {
  addRecordToList,
  getAllLists,
  getListDetails,
  getListEntries,
  removeRecordFromList,
  updateListEntry,
} from './lists.js';
// Re-export all notes operations
export { createObjectNote, getObjectNotes } from './notes.js';
export type { RetryConfig } from './retry.js';
// Re-export all retry functionality
export {
  calculateRetryDelay,
  callWithRetry,
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
} from './retry.js';
// Re-export all search operations
export { advancedSearchObject, listObjects, searchObject } from './search.js';

export {
  createTask,
  deleteTask,
  getTask,
  linkRecordToTask,
  listTasks,
  unlinkRecordFromTask,
  updateTask,
} from './tasks.js';
// Re-export all types
export type {
  BatchConfig,
  BatchItemResult,
  BatchRequestItem,
  BatchResponse,
  ListEntryFilter,
  ListEntryFilters,
} from './types.js';
