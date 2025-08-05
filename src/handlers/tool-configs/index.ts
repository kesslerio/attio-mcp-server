/**
 * Export all tool configurations
 */
export {
  companyToolConfigs,
  companyToolDefinitions,
} from './companies/index.js';
export { listsToolConfigs, listsToolDefinitions } from './lists.js';
export {
  paginatedPeopleToolConfigs,
  paginatedPeopleToolDefinitions,
} from './paginated-people.js';
export { peopleToolConfigs, peopleToolDefinitions } from './people/index.js';
export { promptsToolConfigs, promptsToolDefinitions } from './prompts.js';
export { recordToolConfigs, recordToolDefinitions } from './records/index.js';
export {
  RESOURCE_SPECIFIC_CREATE_TOOLS,
  RESOURCE_TYPE_MAP,
  type ResourceSpecificCreateTool,
  VALIDATION_RULES,
} from './resource-specific-tools.js';
export { tasksToolConfigs, tasksToolDefinitions } from './tasks.js';
