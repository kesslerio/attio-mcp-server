import {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  PhoneValidationError,
  toE164OrNull,
  validatePhoneNumber,
} from '@/utils/validation/phone-validation.js';
import type { PhoneValidationResult } from '@/utils/validation/phone-validation.js';

export {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  PhoneValidationError,
  validatePhoneNumber,
};

export type { PhoneValidationResult };

export function toE164(input: unknown, defaultCountry?: string): string | null {
  return toE164OrNull(input, defaultCountry);
}
