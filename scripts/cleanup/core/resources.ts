/**
 * Resource registry for the unified cleanup script (issue #620).
 *
 * Standard objects (companies, people, deals) flow through the generic
 * /objects/{slug}/records API. tasks and lists are Attio first-class
 * resources with their own endpoints and dedicated fetchers.
 */
import { AxiosInstance } from 'axios';
import { ResourceSummary, ResourceType } from './types.js';
import { DeletionOptions } from '../deleters/batch-deleter.js';
import { fetchTasksByCreator } from '../fetchers/tasks.js';
import { fetchCompaniesByCreator } from '../fetchers/companies.js';
import { fetchPeopleByCreator } from '../fetchers/people.js';
import { fetchDealsByCreator } from '../fetchers/deals.js';
import { fetchListsByCreator } from '../fetchers/lists.js';
import {
  processResource,
  ProcessResourceConfig,
} from '../processors/resource-processor.js';
import { filterTestCompanies } from '../filters/safe-companies.js';
import {
  describeCompany,
  describeDeal,
  describeList,
  describePerson,
  describeTask,
} from '../utils/record-describer.js';
import { logInfo } from './utils.js';

export const DEFAULT_RESOURCES: string[] = [
  'tasks',
  'companies',
  'people',
  'deals',
];

/**
 * Accepted `--resources` values.
 *
 * 'notes' is accepted but intentionally NOT processed: Attio's
 * GET /v2/notes requires parent_object/parent_record_id filters — an
 * unfiltered query returns an empty array (verified in issue #888), so a
 * workspace-wide notes sweep is impossible by design. Requests for notes
 * get an explanatory notice instead of the old 404.
 */
export const SUPPORTED_RESOURCES: ResourceType[] = [
  'tasks',
  'companies',
  'people',
  'deals',
  'notes',
  'lists',
];

const STANDARD_DEFAULT_PATTERNS = [
  '*test*',
  '*Test*',
  '*TEST*',
  'TEST_*',
  'E2E_*',
  'QA_*',
  'Demo*',
  'Mock*',
  'Temp*',
];

/**
 * Build the processing config for one resource type.
 * `apiToken` is captured here so fetchers stay single-argument closures.
 */
export function buildResourceConfig(
  resourceType: ResourceType,
  apiToken: string
): ProcessResourceConfig {
  switch (resourceType) {
    case 'tasks':
      return {
        resourceType: 'tasks',
        label: 'tasks',
        fetchRecords: async (client) =>
          (await fetchTasksByCreator(client, apiToken)).records,
        defaultPatterns: [
          '*test*',
          '*Test*',
          '*TEST*',
          'TEST_*',
          'E2E_*',
          'QA_*',
          'Demo*',
          'Mock*',
          'Temp*',
          'Basic task*',
          'Integration*test*',
        ],
        describeRecord: describeTask,
      };
    case 'companies':
      return {
        resourceType: 'companies',
        label: 'companies',
        fetchRecords: async (client) =>
          (await fetchCompaniesByCreator(client, apiToken)).records,
        defaultPatterns: STANDARD_DEFAULT_PATTERNS,
        describeRecord: describeCompany,
        protect: (matched) => {
          const { safe, toDelete } = filterTestCompanies(matched);
          return { toDelete, protectedRecords: safe };
        },
      };
    case 'people':
      return {
        resourceType: 'people',
        label: 'people',
        fetchRecords: async (client) =>
          (await fetchPeopleByCreator(client, apiToken)).records,
        defaultPatterns: STANDARD_DEFAULT_PATTERNS,
        describeRecord: describePerson,
      };
    case 'deals':
      return {
        resourceType: 'deals',
        label: 'deals',
        fetchRecords: async (client) =>
          (await fetchDealsByCreator(client, apiToken)).records,
        defaultPatterns: STANDARD_DEFAULT_PATTERNS,
        describeRecord: describeDeal,
      };
    case 'lists':
      return {
        resourceType: 'lists',
        label: 'lists',
        fetchRecords: async (client) =>
          (await fetchListsByCreator(client, apiToken)).records,
        defaultPatterns: STANDARD_DEFAULT_PATTERNS,
        describeRecord: describeList,
      };
    default:
      throw new Error(`Unsupported resource type: ${resourceType}`);
  }
}

/**
 * Process one resource type end-to-end: fetch → filter → delete → summary.
 */
export async function processResourceType(
  client: AxiosInstance,
  resourceType: ResourceType,
  apiToken: string,
  patterns: string[],
  deletionOptions: DeletionOptions
): Promise<ResourceSummary> {
  if (resourceType === 'notes') {
    logInfo(
      'ℹ️ NOTES: cleanup is skipped — Attio lists notes only per parent record ' +
        '(GET /v2/notes requires parent_object + parent_record_id filters; an ' +
        'unfiltered query returns no notes). Delete notes through the MCP ' +
        'delete_note tool instead.'
    );
    return { type: 'notes', found: 0, deleted: 0, errors: 0, items: [] };
  }

  const config = buildResourceConfig(resourceType, apiToken);
  return processResource(client, apiToken, patterns, deletionOptions, config);
}
