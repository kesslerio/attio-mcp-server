/**
 * People tool configuration index
 */

import {
  activitySearchToolConfigs,
  activitySearchToolDefinitions,
} from './activity-search.js';
import {
  advancedSearchToolConfigs,
  advancedSearchToolDefinitions,
} from './advanced-search.js';
import { crudToolConfigs, crudToolDefinitions } from './crud.js';
import {
  dateSearchToolConfigs,
  dateSearchToolDefinitions,
} from './date-search.js';
import { notesToolConfigs, notesToolDefinitions } from './notes.js';
import {
  relationshipToolConfigs,
  relationshipToolDefinitions,
} from './relationships.js';
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
