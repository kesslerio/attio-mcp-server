export function isMergeInProgressError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const response = (error as { response?: { status?: number; data?: unknown } })
    .response;
  if (response?.status !== 404) return false;

  const responseData = response.data;
  if (!responseData || typeof responseData !== 'object') return false;
  const data = responseData as Record<string, unknown>;
  const nestedError = data.error;
  const code = [
    data.code,
    data.type,
    data.status,
    typeof nestedError === 'object' && nestedError
      ? (nestedError as Record<string, unknown>).code
      : undefined,
  ].find((value): value is string => typeof value === 'string');
  return code === 'merge_in_progress' || code === 'merge-in-progress';
}
