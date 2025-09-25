import {
  BatchOperationType,
  UniversalResourceType,
} from '@handlers/tool-configs/universal/types.js';
import { formatResourceType } from '@handlers/tool-configs/universal/shared-handlers.js';
import {
  safeExtractRecordValues,
  safeExtractFirstValue,
} from '@handlers/tool-configs/shared/type-utils.js';
import type { JsonObject } from '@shared-types/attio.js';
import type { UniversalBatchSearchResult } from '@api/operations/batch.js';

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonObjectArray(value: unknown): value is JsonObject[] {
  return Array.isArray(value) && value.every(isJsonObject);
}

function isUniversalBatchSearchResultArray(
  value: unknown
): value is UniversalBatchSearchResult[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isJsonObject(item) &&
        'success' in item &&
        typeof item.success === 'boolean' &&
        ('query' in item ? typeof item.query === 'string' : true)
    )
  );
}

function isRecordId(
  value: unknown
): value is JsonObject & { record_id: string } {
  return (
    isJsonObject(value) &&
    'record_id' in value &&
    typeof value.record_id === 'string'
  );
}

function isOperationResult(
  value: unknown
): value is JsonObject & { result?: JsonObject } {
  return (
    isJsonObject(value) && (!('result' in value) || isJsonObject(value.result))
  );
}

function isOperationData(
  value: unknown
): value is JsonObject & { data?: JsonObject } {
  return (
    isJsonObject(value) && (!('data' in value) || isJsonObject(value.data))
  );
}

function coerceDisplayValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'value' in first)
      return String((first as JsonObject).value);
  }
  if (typeof value === 'object' && value && 'value' in value)
    return String((value as JsonObject).value);
  return undefined;
}

function extractDisplayName(
  values: JsonObject | undefined,
  fallback?: string
): string {
  if (!values) return fallback ?? 'Unknown';
  const name = coerceDisplayValue(values.name);
  const title = coerceDisplayValue(values.title);
  return name ?? title ?? fallback ?? 'Unknown';
}

function formatBatchSearchResults(
  batchResults: UniversalBatchSearchResult[],
  resourceTypeName: string
): string {
  const successCount = batchResults.filter((r) => r.success).length;
  const failureCount = batchResults.length - successCount;

  let summary = `Batch search completed: ${successCount} successful, ${failureCount} failed\n\n`;

  const successful = batchResults.filter((r) => r.success);
  if (successful.length > 0) {
    summary += 'Successful searches:\n';
    successful.forEach((searchResult, index) => {
      const records = searchResult.result ?? [];
      summary += `\n${index + 1}. Query: "${searchResult.query}" - Found ${records.length} ${resourceTypeName}s\n`;

      if (records.length > 0) {
        records.slice(0, 3).forEach((record: unknown, recordIndex: number) => {
          if (!isJsonObject(record)) {
            summary += `   ${recordIndex + 1}. Invalid record format\n`;
            return;
          }

          const values = safeExtractRecordValues(record);
          const recordId = isJsonObject(record.id) ? record.id : undefined;
          const name =
            safeExtractFirstValue(values?.name) ??
            safeExtractFirstValue(values?.title, 'Unnamed');
          const id = isRecordId(recordId) ? recordId.record_id : 'unknown';
          summary += `   ${recordIndex + 1}. ${name} (ID: ${id})\n`;
        });
        if (records.length > 3) {
          summary += `   ... and ${records.length - 3} more\n`;
        }
      }
    });
  }

  const failed = batchResults.filter((r) => !r.success);
  if (failed.length > 0) {
    summary += '\nFailed searches:\n';
    failed.forEach((searchResult, index) => {
      summary += `${index + 1}. Query: "${searchResult.query}" - Error: ${searchResult.error}\n`;
    });
  }

  return summary;
}

function pluralizeResource(resourceTypeName: string, count: number): string {
  const base = resourceTypeName || 'record';
  if (count === 1) {
    return base;
  }
  if (base.endsWith('y')) {
    return `${base.slice(0, -1)}ies`;
  }
  if (base.endsWith('s')) {
    return base;
  }
  return `${base}s`;
}

function formatSuccessfulOperations(
  operations: JsonObject[],
  resourceTypeName: string
): string {
  if (!operations.length) {
    return '';
  }

  const header = 'Successful operations:';
  const lines = operations.map((op: JsonObject, index: number) => {
    if (!isOperationResult(op)) {
      return `${index + 1}. Invalid operation format`;
    }

    const opResult = op.result;
    const values = isJsonObject(opResult?.values) ? opResult.values : undefined;
    const fallbackId =
      (typeof opResult?.record_id === 'string'
        ? opResult.record_id
        : undefined) ?? 'Unknown';
    const name = extractDisplayName(values, fallbackId);
    const descriptor = resourceTypeName ? `${name}` : name;
    return `${index + 1}. ${descriptor}`;
  });

  return `${header}\n${lines.join('\n')}`;
}

function formatFailedOperations(operations: JsonObject[]): string {
  if (!operations.length) {
    return '';
  }

  const header = 'Failed operations:';
  const lines = operations.map((op: JsonObject, index: number) => {
    if (!isOperationData(op)) {
      return `${index + 1}. Invalid operation format: Unknown error`;
    }

    const opData = op.data;
    const identifier =
      (typeof op.record_id === 'string' ? op.record_id : undefined) ??
      (typeof opData?.name === 'string' ? opData.name : undefined) ??
      'Unknown';
    const error = op.error ?? 'Unknown error';
    return `${index + 1}. ${identifier}: ${error}`;
  });

  return `${header}\n${lines.join('\n')}`;
}

function formatSearchRecords(
  records: JsonObject[],
  resourceTypeName: string
): string {
  if (!records.length) {
    return `Batch search found 0 ${pluralizeResource(resourceTypeName, 0)}`;
  }

  const lines = records.map((record: JsonObject, index: number) => {
    const values = safeExtractRecordValues(record);
    const recordId = isJsonObject(record.id) ? record.id : undefined;
    const name = extractDisplayName(values, 'Unnamed');
    const id = isRecordId(recordId) ? recordId.record_id : 'unknown';
    return `${index + 1}. ${name} (ID: ${id})`;
  });

  return `Batch search found ${records.length} ${pluralizeResource(resourceTypeName, records.length)}:\n${lines.join('\n')}`;
}

export function formatBatchResult(
  results: JsonObject | JsonObject[] | undefined,
  operationType?: BatchOperationType,
  resourceType?: UniversalResourceType
): string {
  if (!results) {
    return 'Batch operation failed';
  }

  const operationName = operationType ?? 'operation';
  const resourceTypeName = resourceType
    ? formatResourceType(resourceType)
    : 'record';

  if (!isJsonObjectArray(results)) {
    return `Batch ${operationName} result: ${JSON.stringify(results)}`;
  }

  if (operationType === BatchOperationType.SEARCH) {
    if (isUniversalBatchSearchResultArray(results)) {
      return formatBatchSearchResults(results, resourceTypeName);
    }

    return formatSearchRecords(results, resourceTypeName);
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const successCount = successful.length;
  const failureCount = failed.length;

  const sections: string[] = [
    `Batch ${operationName} completed: ${successCount} successful, ${failureCount} failed`,
  ];

  const successSection = formatSuccessfulOperations(
    successful,
    resourceTypeName
  );
  if (successSection) {
    sections.push(successSection);
  }

  const failedSection = formatFailedOperations(failed);
  if (failedSection) {
    sections.push(failedSection);
  }

  return sections.join('\n\n');
}
