import { InvalidRequestError } from '@/errors/api-errors.js';
import { InvalidCompanyDataError } from '@/errors/company-errors.js';

export function handleAttributeValidationError(error: unknown): never {
  if (error instanceof InvalidRequestError) {
    throw error;
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  throw new InvalidCompanyDataError(`Attribute validation failed: ${message}`);
}
