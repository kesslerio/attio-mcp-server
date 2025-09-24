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
  getAttributesDefinition,
  discoverAttributesDefinition,
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
  'search-records': searchRecordsConfig,
  'get-record-details': getRecordDetailsConfig,
  'create-record': createRecordConfig,
  'update-record': updateRecordConfig,
  'delete-record': deleteRecordConfig,
  'get-attributes': getAttributesConfig,
  'discover-attributes': discoverAttributesConfig,
  'get-detailed-info': getDetailedInfoConfig,
};

export const coreOperationsToolDefinitions = {
  'search-records': searchRecordsDefinition,
  'get-record-details': getRecordDetailsDefinition,
  'create-record': createRecordDefinition,
  'update-record': updateRecordDefinition,
  'delete-record': deleteRecordDefinition,
  'get-attributes': getAttributesDefinition,
  'discover-attributes': discoverAttributesDefinition,
  'get-detailed-info': getDetailedInfoDefinition,
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
  getDetailedInfoConfig,
  createNoteConfig,
  listNotesConfig,
};
