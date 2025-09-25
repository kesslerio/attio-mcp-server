import type { JsonObject } from '../../types/attio.js';

export function validateRequiredArrayField(
  payload: JsonObject,
  field: string,
  errorMessage: string
): void {
  const value = payload[field];
  const isValidArray = Array.isArray(value) && value.length > 0;

  if (!isValidArray) {
    throw new Error(errorMessage);
  }
}
