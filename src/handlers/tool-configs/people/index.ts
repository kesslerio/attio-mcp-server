/**
 * People tool configuration index
 */
import { crudToolConfigs, crudToolDefinitions } from './crud.js';
import { notesToolConfigs, notesToolDefinitions } from './notes.js';
import { searchToolConfigs, searchToolDefinitions } from './search.js';

export const peopleToolConfigs = {
  ...crudToolConfigs,
  ...searchToolConfigs,
  ...advancedSearchToolConfigs,
  ...dateSearchToolConfigs,
  ...activitySearchToolConfigs,
  ...notesToolConfigs,
  ...relationshipToolConfigs,
};

export const peopleToolDefinitions = [
  ...crudToolDefinitions,
  ...searchToolDefinitions,
  ...advancedSearchToolDefinitions,
  ...dateSearchToolDefinitions,
  ...activitySearchToolDefinitions,
  ...notesToolDefinitions,
  ...relationshipToolDefinitions,
];

export {
  searchToolConfigs,
  searchToolDefinitions,
  advancedSearchToolConfigs,
  advancedSearchToolDefinitions,
  dateSearchToolConfigs,
  dateSearchToolDefinitions,
  activitySearchToolConfigs,
  activitySearchToolDefinitions,
  crudToolConfigs,
  crudToolDefinitions,
  notesToolConfigs,
  notesToolDefinitions,
  relationshipToolConfigs,
  relationshipToolDefinitions,
};
