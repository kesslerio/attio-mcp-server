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
  upsertRecordConfig,
  upsertRecordDefinition,
} from './upsert-operations.js';
import {
  createCompanyConfig,
  updateCompanyConfig,
  createDealConfig,
  updateDealConfig,
  createCompanyDefinition,
  updateCompanyDefinition,
  createDealDefinition,
  updateDealDefinition,
} from './scoped-crud-operations.js';
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
import {
  mergeRecordsConfig,
  mergeRecordsDefinition,
} from './merge-operations.js';

export const coreOperationsToolConfigs = {
  notes_create: createNoteConfig,
  notes_list: listNotesConfig,
  records_search: searchRecordsConfig,
  records_get_details: getRecordDetailsConfig,
  companies_create: createCompanyConfig,
  companies_update: updateCompanyConfig,
  deals_create: createDealConfig,
  deals_update: updateDealConfig,
  records_create: createRecordConfig,
  records_update: updateRecordConfig,
  records_upsert: upsertRecordConfig,
  records_delete: deleteRecordConfig,
  records_get_attributes: getAttributesConfig,
  records_discover_attributes: discoverAttributesConfig,
  records_get_attribute_options: getAttributeOptionsConfig,
  records_get_info: getDetailedInfoConfig,
  records_get_interactions: getRecordInteractionsConfig,
  records_merge: mergeRecordsConfig,
};

export const coreOperationsToolDefinitions = {
  records_search: searchRecordsDefinition,
  records_get_details: getRecordDetailsDefinition,
  companies_create: createCompanyDefinition,
  companies_update: updateCompanyDefinition,
  deals_create: createDealDefinition,
  deals_update: updateDealDefinition,
  records_create: createRecordDefinition,
  records_update: updateRecordDefinition,
  records_upsert: upsertRecordDefinition,
  records_delete: deleteRecordDefinition,
  records_get_attributes: getAttributesDefinition,
  records_discover_attributes: discoverAttributesDefinition,
  records_get_attribute_options: getAttributeOptionsDefinition,
  records_get_info: getDetailedInfoDefinition,
  notes_create: createNoteDefinition,
  notes_list: listNotesDefinition,
  records_get_interactions: getRecordInteractionsDefinition,
  records_merge: mergeRecordsDefinition,
};

export {
  searchRecordsConfig,
  getRecordDetailsConfig,
  createCompanyConfig,
  updateCompanyConfig,
  createDealConfig,
  updateDealConfig,
  createCompanyDefinition,
  updateCompanyDefinition,
  createDealDefinition,
  updateDealDefinition,
  createRecordConfig,
  updateRecordConfig,
  upsertRecordConfig,
  upsertRecordDefinition,
  deleteRecordConfig,
  getAttributesConfig,
  discoverAttributesConfig,
  getAttributeOptionsConfig,
  getDetailedInfoConfig,
  createNoteConfig,
  listNotesConfig,
  getRecordInteractionsConfig,
  mergeRecordsConfig,
  mergeRecordsDefinition,
};
