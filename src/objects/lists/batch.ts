/**
 * Batch list operations.
 */
import {
  BatchConfig,
  BatchRequestItem,
  BatchResponse,
  executeBatchOperations,
} from '../../api/operations/index.js';
import type { AttioList, AttioListEntry } from '../../types/attio.js';
import { getListDetails } from './base.js';
import { getListEntries } from './entries.js';

export async function batchGetListsDetails(
  listIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<AttioList>> {
  const operations: BatchRequestItem<string>[] = listIds.map((listId) => ({
    params: listId,
    id: `get_list_${listId}`,
  }));

  return executeBatchOperations<string, AttioList>(
    operations,
    (listId) => getListDetails(listId),
    batchConfig
  );
}

export async function batchGetListsEntries(
  listConfigs: Array<{ listId: string; limit?: number; offset?: number }>,
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<AttioListEntry[]>> {
  const operations: BatchRequestItem<{
    listId: string;
    limit?: number;
    offset?: number;
  }>[] = listConfigs.map((config, index) => ({
    params: config,
    id: `get_list_entries_${config.listId}_${index}`,
  }));

  return executeBatchOperations<
    { listId: string; limit?: number; offset?: number },
    AttioListEntry[]
  >(
    operations,
    (params) => getListEntries(params.listId, params.limit, params.offset),
    batchConfig
  );
}
