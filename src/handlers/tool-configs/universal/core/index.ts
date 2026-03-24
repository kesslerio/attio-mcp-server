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
import {
  getRecordInteractionsConfig,
  getRecordInteractionsDefinition,
} from './interaction-operations.js';

export const coreOperationsToolConfigs = {
  create_note: createNoteConfig,
  list_notes: listNotesConfig,
  search_records: searchRecordsConfig,
  get_record_details: getRecordDetailsConfig,
  create_record: createRecordConfig,
  update_record: updateRecordConfig,
  delete_record: deleteRecordConfig,
  get_record_attributes: getAttributesConfig,
  discover_record_attributes: discoverAttributesConfig,
  get_record_attribute_options: getAttributeOptionsConfig,
  get_record_info: getDetailedInfoConfig,
  get_record_interactions: getRecordInteractionsConfig,
};

export const coreOperationsToolDefinitions = {
  search_records: searchRecordsDefinition,
  get_record_details: getRecordDetailsDefinition,
  create_record: createRecordDefinition,
  update_record: updateRecordDefinition,
  delete_record: deleteRecordDefinition,
  get_record_attributes: getAttributesDefinition,
  discover_record_attributes: discoverAttributesDefinition,
  get_record_attribute_options: getAttributeOptionsDefinition,
  get_record_info: getDetailedInfoDefinition,
  create_note: createNoteDefinition,
  list_notes: listNotesDefinition,
  get_record_interactions: getRecordInteractionsDefinition,
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
  getRecordInteractionsConfig,
};
