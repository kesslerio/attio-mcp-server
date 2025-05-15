/**
 * Main entry point for attribute mapping system
 * Re-exports all attribute mapping functionality
 */

export * from './attribute-mappers.js';
export * from './legacy-maps.js';
export * from './filter-translator.js';

// For backward compatibility - reexport specific functions
// from their respective modules for simpler imports
export { 
  getAttributeSlug, 
  getObjectSlug, 
  getListSlug 
} from './attribute-mappers.js';

export {
  translateAttributeNamesInFilters
} from './filter-translator.js';