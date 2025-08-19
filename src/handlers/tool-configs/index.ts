/**
 * Export all tool configurations
 */
export {
  companyToolConfigs,
  companyToolDefinitions,
} from './companies/index.js';
export { peopleToolConfigs, peopleToolDefinitions } from './people/index.js';
export { dealToolConfigs, dealToolDefinitions } from './deals/index.js';
export { listsToolConfigs, listsToolDefinitions } from './lists.js';
export { promptsToolConfigs, promptsToolDefinitions } from './prompts.js';
export { recordToolConfigs, recordToolDefinitions } from './records/index.js';
export {
  paginatedPeopleToolConfigs,
  paginatedPeopleToolDefinitions,
} from './paginated-people.js';
export { tasksToolConfigs, tasksToolDefinitions } from './tasks.js';
export {
  RESOURCE_SPECIFIC_CREATE_TOOLS,
  type ResourceSpecificCreateTool,
  RESOURCE_TYPE_MAP,
  VALIDATION_RULES,
} from './resource-specific-tools.js';
