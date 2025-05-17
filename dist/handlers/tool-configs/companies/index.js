/**
 * Aggregated exports for company tool configurations
 */
// Import configs from each module
import { searchToolConfigs, searchToolDefinitions } from "./search.js";
import { crudToolConfigs, crudToolDefinitions } from "./crud.js";
import { attributeToolConfigs, attributeToolDefinitions } from "./attributes.js";
import { notesToolConfigs, notesToolDefinitions } from "./notes.js";
import { relationshipToolConfigs, relationshipToolDefinitions } from "./relationships.js";
import { batchToolConfigs, batchToolDefinitions } from "./batch.js";
import { formatterConfigs, formatterToolDefinitions } from "./formatters.js";
// Aggregate all company tool configurations
export const companyToolConfigs = {
    ...searchToolConfigs,
    ...crudToolConfigs,
    ...attributeToolConfigs,
    ...notesToolConfigs,
    ...relationshipToolConfigs,
    ...batchToolConfigs,
    ...formatterConfigs
};
// Aggregate all company tool definitions
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
export { searchToolConfigs, searchToolDefinitions, crudToolConfigs, crudToolDefinitions, attributeToolConfigs, attributeToolDefinitions, notesToolConfigs, notesToolDefinitions, relationshipToolConfigs, relationshipToolDefinitions, batchToolConfigs, batchToolDefinitions, formatterConfigs, formatterToolDefinitions };
//# sourceMappingURL=index.js.map