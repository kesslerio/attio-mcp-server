import { BatchOperationType, UniversalResourceType } from '../types.js';
import { formatResourceType } from '../shared-handlers.js';
import {
  safeExtractRecordValues,
  safeExtractFirstValue,
} from '../../shared/type-utils.js';
import type { JsonObject } from '../../../../types/attio.js';
import type { UniversalBatchSearchResult } from '../../../../api/operations/batch.js';

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
        typeof (item as JsonObject).success === 'boolean' &&
        ('query' in item
          ? typeof (item as JsonObject).query === 'string'
          : true)
    )
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
        records.slice(0, 3).forEach((record, recordIndex) => {
          const recordObj = record as JsonObject;
          const values = safeExtractRecordValues(recordObj) as
            | JsonObject
            | undefined;
          const recordId = recordObj.id as JsonObject | undefined;
          const name =
            safeExtractFirstValue(values?.name) ??
            safeExtractFirstValue(values?.title, 'Unnamed');
          const id = (recordId?.record_id as string) || 'unknown';
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
    const opResult = op.result as JsonObject | undefined;
    const values = opResult?.values as JsonObject | undefined;
    const fallbackId = (opResult?.record_id as string | undefined) ?? 'Unknown';
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
    const opData = op.data as JsonObject | undefined;
    const identifier =
      (op.record_id as string | undefined) ??
      (opData?.name as string | undefined) ??
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
    const values = safeExtractRecordValues(record) as JsonObject | undefined;
    const recordId = record.id as JsonObject | undefined;
    const name = extractDisplayName(values, 'Unnamed');
    const id = (recordId?.record_id as string) || 'unknown';
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
