import {
  searchRecordsConfig,
  searchRecordsDefinition,
} from './search-operations.js';
import {
  getRecordDetailsConfig,
  getRecordDetailsDefinition,
} from './record-details-operations.js';
import {
  createRecordConfig,
  updateRecordConfig,
  deleteRecordConfig,
  createRecordDefinition,
  updateRecordDefinition,
  deleteRecordDefinition,
} from './crud-operations.js';
import {
  getAttributesConfig,
  discoverAttributesConfig,
  getAttributeOptionsConfig,
  getAttributesDefinition,
  discoverAttributesDefinition,
  getAttributeOptionsDefinition,
} from './metadata-operations.js';
import {
  getDetailedInfoConfig,
  getDetailedInfoDefinition,
} from './detailed-info-operations.js';
import {
  createNoteConfig,
  listNotesConfig,
  createNoteDefinition,
  listNotesDefinition,
} from './notes-operations.js';

export const coreOperationsToolConfigs = {
  'create-note': createNoteConfig,
  'list-notes': listNotesConfig,
  records_search: searchRecordsConfig,
  records_get_details: getRecordDetailsConfig,
  'create-record': createRecordConfig,
  'update-record': updateRecordConfig,
  'delete-record': deleteRecordConfig,
  records_get_attributes: getAttributesConfig,
  records_discover_attributes: discoverAttributesConfig,
  records_get_attribute_options: getAttributeOptionsConfig,
  records_get_info: getDetailedInfoConfig,
};

export const coreOperationsToolDefinitions = {
  records_search: searchRecordsDefinition,
  records_get_details: getRecordDetailsDefinition,
  'create-record': createRecordDefinition,
  'update-record': updateRecordDefinition,
  'delete-record': deleteRecordDefinition,
  records_get_attributes: getAttributesDefinition,
  records_discover_attributes: discoverAttributesDefinition,
  records_get_attribute_options: getAttributeOptionsDefinition,
  records_get_info: getDetailedInfoDefinition,
  'create-note': createNoteDefinition,
  'list-notes': listNotesDefinition,
};

export {
  searchRecordsConfig,
  getRecordDetailsConfig,
  createRecordConfig,
  updateRecordConfig,
  deleteRecordConfig,
  getAttributesConfig,
  discoverAttributesConfig,
  getAttributeOptionsConfig,
  getDetailedInfoConfig,
  createNoteConfig,
  listNotesConfig,
};
