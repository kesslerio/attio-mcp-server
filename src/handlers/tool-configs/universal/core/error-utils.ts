// Re-export specific error handlers for core operations
export {
  handleCreateError,
  handleUpdateError,
  handleDeleteError,
  handleSearchError,
  handleCoreOperationError, // Legacy compatibility
} from './crud-error-handlers.js';
