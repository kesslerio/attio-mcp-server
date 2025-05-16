/**
 * Export all tool configurations
 */
export { companyToolConfigs, companyToolDefinitions } from './companies.js';
export { peopleToolConfigs, peopleToolDefinitions } from './people.js';
export { listsToolConfigs, listsToolDefinitions } from './lists.js';
export { promptsToolConfigs, promptsToolDefinitions } from './prompts.js';
export { recordToolConfigs, recordToolDefinitions } from './records.js';
export { paginatedPeopleToolConfigs, paginatedPeopleToolDefinitions } from './paginated-people.js';
export { 
  RESOURCE_SPECIFIC_CREATE_TOOLS, 
  type ResourceSpecificCreateTool,
  RESOURCE_TYPE_MAP,
  VALIDATION_RULES 
} from './resource-specific-tools.js';
