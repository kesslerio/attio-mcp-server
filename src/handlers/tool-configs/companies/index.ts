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

import {
  attributeToolConfigs,
  attributeToolDefinitions,
} from './attributes.js';
import { batchToolConfigs, batchToolDefinitions } from './batch.js';
import { crudToolConfigs, crudToolDefinitions } from './crud.js';
import { formatterConfigs, formatterToolDefinitions } from './formatters.js';
import { notesToolConfigs, notesToolDefinitions } from './notes.js';
import {
  relationshipToolConfigs,
  relationshipToolDefinitions,
} from './relationships.js';
// Import configs by category
import { searchToolConfigs, searchToolDefinitions } from './search.js';

/**
 * Aggregated company tool configurations
 * Maintains backward compatibility by exporting all tool configs in a single object
 */

// Import utility function for verifying tool configs
import { verifyToolConfigsWithRequiredTools } from '../../tools/config-verifier.js';

// Run the verification function with required tool check
verifyToolConfigsWithRequiredTools(
  'company',
  {
    ...searchToolConfigs,
    ...crudToolConfigs,
    ...attributeToolConfigs,
    ...notesToolConfigs,
    ...relationshipToolConfigs,
    ...batchToolConfigs,
    ...formatterConfigs,
  },
  [
    'discoverAttributes',
    'basicInfo',
    'businessInfo',
    'contactInfo',
    'socialInfo',
    'fields',
    'getAttributes',
    'json',
  ]
);

export const companyToolConfigs = {
  ...searchToolConfigs,
  ...crudToolConfigs,
  ...attributeToolConfigs,
  ...notesToolConfigs,
  ...relationshipToolConfigs,
  ...batchToolConfigs,
  ...formatterConfigs,
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
  ...formatterToolDefinitions,
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
  formatterToolDefinitions,
};
