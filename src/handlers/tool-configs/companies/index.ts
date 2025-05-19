/**
 * Company tool configurations module index
 * 
 * This module provides tool configurations for company-related operations:
 * - Search: Basic and advanced company searches  
 * - CRUD: Create, read, update, delete operations
 * - Attributes: Field and attribute management
 * - Notes: Note operations on companies
 * - Relationships: Search by related entities
 * - Batch: Bulk operations
 * - Formatters: Result formatting utilities
 * 
 * @module companies
 */

// Import configs by category
import { searchToolConfigs, searchToolDefinitions } from "./search.js";
import { crudToolConfigs, crudToolDefinitions } from "./crud.js";
import { attributeToolConfigs, attributeToolDefinitions } from "./attributes.js";
import { notesToolConfigs, notesToolDefinitions } from "./notes.js";
import { relationshipToolConfigs, relationshipToolDefinitions } from "./relationships.js";
import { batchToolConfigs, batchToolDefinitions } from "./batch.js";
import { formatterConfigs, formatterToolDefinitions } from "./formatters.js";

/**
 * Aggregated company tool configurations
 * Maintains backward compatibility by exporting all tool configs in a single object
 */

// Debug function to check tool configs before exporting
function verifyToolConfigs() {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.log('[companyToolConfigs] Verifying tool configs during initialization');
    
    // Check if attributeToolConfigs has discoverAttributes
    if ('discoverAttributes' in attributeToolConfigs) {
      console.log('[companyToolConfigs] attributeToolConfigs has discoverAttributes with name:', attributeToolConfigs.discoverAttributes.name);
    } else {
      console.warn('[companyToolConfigs] attributeToolConfigs is missing discoverAttributes!');
    }
    
    // Verify the combined configs will have discoverAttributes
    const combined = {
      ...searchToolConfigs,
      ...crudToolConfigs,
      ...attributeToolConfigs,
      ...notesToolConfigs,
      ...relationshipToolConfigs,
      ...batchToolConfigs,
      ...formatterConfigs
    };
    
    if ('discoverAttributes' in combined) {
      console.log('[companyToolConfigs] Combined configs include discoverAttributes');
    } else {
      console.warn('[companyToolConfigs] Combined configs are missing discoverAttributes!');
    }
  }
}

// Run the verification function
verifyToolConfigs();

export const companyToolConfigs = {
  ...searchToolConfigs,
  ...crudToolConfigs,
  ...attributeToolConfigs,
  ...notesToolConfigs,
  ...relationshipToolConfigs,
  ...batchToolConfigs,
  ...formatterConfigs
};

/**
 * Aggregated company tool definitions
 * Maintains backward compatibility by exporting all tool definitions in a single array
 */
export const companyToolDefinitions = [
  ...searchToolDefinitions,
  ...crudToolDefinitions,
  ...attributeToolDefinitions,
  ...notesToolDefinitions,
  ...relationshipToolDefinitions,
  ...batchToolDefinitions,
  ...formatterToolDefinitions
];

// Re-export individual modules for granular access if needed
export {
  // Search operations
  searchToolConfigs,
  searchToolDefinitions,
  
  // CRUD operations
  crudToolConfigs,
  crudToolDefinitions,
  
  // Attribute management
  attributeToolConfigs,
  attributeToolDefinitions,
  
  // Notes operations
  notesToolConfigs,
  notesToolDefinitions,
  
  // Relationship-based operations
  relationshipToolConfigs,
  relationshipToolDefinitions,
  
  // Batch operations
  batchToolConfigs,
  batchToolDefinitions,
  
  // Formatting utilities
  formatterConfigs,
  formatterToolDefinitions
};