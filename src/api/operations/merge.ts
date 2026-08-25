import type { AxiosError, AxiosResponse } from 'axios';
import { getLazyAttioClient } from '@/api/lazy-client.js';

export interface MergeRecordsResult {
  status: 200 | 202;
  new_record_id: string;
  data: Record<string, unknown>;
}

export type AttributeOverwriteValues = Record<string, unknown>;

interface RetryableAxiosError extends AxiosError {
  response?: AxiosResponse<unknown>;
}

function getRetryAfterMilliseconds(error: RetryableAxiosError): number {
  const headers = error.response?.headers;
  const rawValue = headers?.['retry-after'] ?? headers?.['Retry-After'];

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return Math.max(0, rawValue * 1000);
  }

  if (typeof rawValue === 'string') {
    const seconds = Number(rawValue.trim());
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

    const retryAt = Date.parse(rawValue);
    if (Number.isFinite(retryAt)) {
      return Math.max(0, retryAt - Date.now());
    }
  }

  return 1000;
}

function getResponseData(
  response: AxiosResponse<unknown>
): Record<string, unknown> {
  const responseData = response.data;
  if (!responseData || typeof responseData !== 'object') return {};
  return responseData as Record<string, unknown>;
}

function getInnerResponseData(
  response: AxiosResponse<unknown>
): Record<string, unknown> {
  const responseData = getResponseData(response);
  const innerData = responseData.data;
  return innerData && typeof innerData === 'object'
    ? (innerData as Record<string, unknown>)
    : responseData;
}

function getNewRecordId(data: Record<string, unknown>): string | undefined {
  const nested = data.data;
  const nestedData =
    nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>)
      : undefined;
  const nestedId = nestedData?.id;
  const nestedIdObject =
    nestedId && typeof nestedId === 'object'
      ? (nestedId as Record<string, unknown>)
      : undefined;
  const responseId = data.id;
  const responseIdObject =
    responseId && typeof responseId === 'object'
      ? (responseId as Record<string, unknown>)
      : undefined;

  const candidates = [
    nestedIdObject?.record_id,
    nestedData?.record_id,
    nestedData?.new_record_id,
    responseIdObject?.record_id,
    data.new_record_id,
    data.record_id,
  ];

  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && candidate.length > 0
  );
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const responseData = (error as RetryableAxiosError).response?.data;
  if (!responseData || typeof responseData !== 'object') return undefined;
  const data = responseData as Record<string, unknown>;
  const nestedError = data.error;
  const nested =
    nestedError && typeof nestedError === 'object'
      ? (nestedError as Record<string, unknown>)
      : undefined;
  const code = data.code ?? data.type ?? nested?.code ?? nested?.type;
  return typeof code === 'string' ? code : undefined;
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function postMergeWith429Retry(
  post: () => Promise<AxiosResponse<unknown>>,
  maxRetries = 1
): Promise<AxiosResponse<unknown>> {
  let attempt = 0;

  while (true) {
    try {
      return await post();
    } catch (error: unknown) {
      const typedError = error as RetryableAxiosError;
      const isRateLimited = typedError.response?.status === 429;
      if (!isRateLimited || attempt >= maxRetries) throw error;

      await sleep(getRetryAfterMilliseconds(typedError));
      attempt += 1;
    }
  }
}

/**
 * Attio's native merge is non-idempotent. Only a confirmed 429 is retried.
 * Timeout and 5xx responses are deliberately returned to the caller as
 * indeterminate outcomes and must not be resent.
 */
export async function mergeRecords(
  objectSlug: string,
  primaryRecordId: string,
  secondaryRecordId: string
): Promise<MergeRecordsResult> {
  const api = getLazyAttioClient();
  let response: AxiosResponse<unknown>;

  try {
    response = await postMergeWith429Retry(() =>
      api.post(`/objects/${objectSlug}/records/merge`, {
        data: {
          primary_record_id: primaryRecordId,
          secondary_record_id: secondaryRecordId,
        },
      })
    );
  } catch (error: unknown) {
    const code = getErrorCode(error);
    if (code === 'self_merge') {
      throw new Error('Attio rejected the merge: self_merge', {
        cause: error instanceof Error ? error : undefined,
      });
    }
    throw error;
  }

  if (response.status !== 200 && response.status !== 202) {
    throw new Error(
      `Unexpected Attio merge response status: ${response.status}`
    );
  }

  const data = getResponseData(response);
  const newRecordId = getNewRecordId(data);
  if (!newRecordId) {
    throw new Error(
      `Attio merge response ${response.status} did not include a new record id`
    );
  }

  return {
    status: response.status,
    new_record_id: newRecordId,
    data: getInnerResponseData(response),
  };
}

export async function overwriteRecordAttributes(
  objectSlug: string,
  recordId: string,
  values: AttributeOverwriteValues
): Promise<{ status: number; data: Record<string, unknown> }> {
  const api = getLazyAttioClient();
  const response: AxiosResponse<unknown> = await api.put(
    `/objects/${objectSlug}/records/${recordId}`,
    {
      data: { values },
    }
  );

  return {
    status: response.status,
    data: getInnerResponseData(response),
  };
}
